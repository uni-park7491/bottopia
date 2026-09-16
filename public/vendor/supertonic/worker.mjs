import * as ort from '../onnx/ort.wasm.min.mjs';
import { loadTextToSpeech, loadVoiceStyle } from './helper.mjs';
import { validateSpeech, encodeSpeech, splitSpeech } from './audio-utils.mjs';
import { validateLanguage } from '../tts-languages.mjs';
ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = new URL('../onnx/', import.meta.url).href;
const base = 'https://huggingface.co/supertone-oss-archive/supertonic-3/resolve/aafc6e32416a594460b32413efc49d7fe4ce6d46';
let model, busy = false;
self.onmessage = async ({ data }) => {
  if (busy) return;
  busy = true;
  try {
    const text = validateSpeech(data.text, data.voice, data.speed);
    const language = validateLanguage('supertonic', data.language);
    if (!model) model = await loadTextToSpeech(`${base}/onnx`, { executionProviders: ['wasm'] }, (name, current, total) => self.postMessage({ type: 'progress', message: `음성 모델 준비 중 (${current}/${total}) · 최초 다운로드는 시간이 걸립니다.` }));
    const style = await loadVoiceStyle([`${base}/voice_styles/${data.voice}.json`]);
    self.postMessage({ type: 'progress', message: '이 기기에서 음성을 생성하고 있습니다.' });
    // Bound chunks even when the input contains no punctuation.
    const chunks = splitSpeech(text);
    const samples = [];
    for (let i = 0; i < chunks.length; i++) {
      const result = await model.textToSpeech.call(chunks[i], language, style, 8, data.speed);
      const count = Math.min(result.wav.length, Math.ceil(result.duration[0] * model.textToSpeech.sampleRate));
      if (!Number.isFinite(count) || count < 1) throw new Error('음성 생성 결과가 비어 있습니다.');
      for (let j = 0; j < count; j++) samples.push(result.wav[j]);
      if (samples.length > model.textToSpeech.sampleRate * 180) throw new Error('음성이 너무 깁니다. 대사를 줄여주세요.');
      if (i + 1 < chunks.length) for (let j = 0; j < model.textToSpeech.sampleRate * 0.2; j++) samples.push(0);
      self.postMessage({ type: 'progress', message: `음성 생성 중 (${i + 1}/${chunks.length})` });
    }
    const wav = encodeSpeech(samples, model.textToSpeech.sampleRate);
    style.ttl.dispose(); style.dp.dispose();
    self.postMessage({ type: 'result', wav, seconds: samples.length / model.textToSpeech.sampleRate }, [wav]);
  } catch (error) {
    console.error(error);
    self.postMessage({ type: 'error', message: '음성을 생성하지 못했습니다. 네트워크·기기 메모리를 확인한 뒤 짧은 대사로 다시 시도해주세요.' });
  } finally { busy = false; }
};
