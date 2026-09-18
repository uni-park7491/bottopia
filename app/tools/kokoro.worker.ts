import { KokoroTTS } from 'kokoro-js';
import { env, AutoTokenizer, StyleTextToSpeech2Model } from '@huggingface/transformers';
import { validateSpeech, splitSpeech, encodeSpeech } from '../../public/vendor/supertonic/audio-utils.mjs';

const revision = '1939ad2a8e416c0acfeecc08a694d14ef25f2231';
const modelId = 'onnx-community/Kokoro-82M-v1.0-ONNX';
env.allowLocalModels = false;
env.remotePathTemplate = `{model}/resolve/${revision}/`;
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
}
// kokoro-js 1.2.1's voice loader uses main; pin those requests as well.
const originalFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const prefix = `https://huggingface.co/${modelId}/resolve/main/voices/`;
  return originalFetch(url.startsWith(prefix) ? url.replace('/resolve/main/', `/resolve/${revision}/`) : input, init);
};
let busy = false;
self.onmessage = async ({ data }) => {
  if (busy) return;
  busy = true;
  let model: StyleTextToSpeech2Model | undefined;
  try {
    const text = validateSpeech(data.text, data.voice, data.speed);
    if (data.language !== 'en') throw new Error('Kokoro 브라우저 연결은 영어를 지원합니다.');
    const progress_callback = (info: { status: string; progress?: number; file?: string }) => {
      self.postMessage({ type: 'progress', phase: 'downloading', percent: info.status === 'progress' ? info.progress : undefined, scope: 'file', message: info.status === 'progress' && Number.isFinite(info.progress)
        ? `Kokoro 파일 다운로드 · ${info.file || '모델 파일'} · ${Math.round(info.progress!)}%` : 'Kokoro 음성 모델 준비 중…' });
    };
    model = await StyleTextToSpeech2Model.from_pretrained(modelId, { dtype: 'q8', device: 'wasm', revision, progress_callback });
    const tokenizer = await AutoTokenizer.from_pretrained(modelId, { revision });
    const tts = new KokoroTTS(model, tokenizer);
    const chunks = splitSpeech(text, 200);
    const samples: number[] = [];
    for (let index = 0; index < chunks.length; index++) {
      self.postMessage({ type: 'progress', phase: 'generating', percent: index ? index / chunks.length * 100 : undefined, message: `Kokoro 음성 생성 중 (${index + 1}/${chunks.length})` });
      const audio = await tts.generate(chunks[index], { voice: data.voice === 'M1' ? 'am_michael' : 'af_heart', speed: data.speed });
      if (audio.sampling_rate !== 24000 || samples.length + audio.audio.length > 24000 * 180) throw new Error('음성 길이 제한을 초과했습니다.');
      for (const sample of audio.audio) samples.push(sample);
      if (index < chunks.length - 1) for (let j = 0; j < 4800; j++) samples.push(0);
      self.postMessage({ type: 'progress', phase: 'generating', percent: Math.min(99, (index + 1) / chunks.length * 100), message: `음성 구간 완료 (${index + 1}/${chunks.length}) · 파일 구성 중` });
    }
    const wav = encodeSpeech(samples, 24000);
    await model.dispose(); model = undefined;
    self.postMessage({ type: 'result', wav, seconds: samples.length / 24000 }, { transfer: [wav] });
  } catch (error) {
    console.error(error);
    self.postMessage({ type: 'error', message: 'Kokoro 생성에 실패했습니다. 영어 대사·네트워크·기기 메모리를 확인해주세요.' });
  } finally { await model?.dispose(); busy = false; }
};
