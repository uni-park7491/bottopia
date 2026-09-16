import { LlamaWebGpuBridge } from './llama_webgpu_bridge.js';
import { encodeSpeech, splitSpeech, validateSpeech } from '../supertonic/audio-utils.mjs';
import { referenceVoice, loadReferenceVoice } from './voices.mjs';
import { validateLanguage } from '../tts-languages.mjs';

const base = 'https://huggingface.co/ggml-org/Qwen3-TTS-12Hz-1.7B-Base-GGUF/resolve/ca27d74bc954b73dadab5b71ca265d87fc861a7c';
const modelUrl = `${base}/Qwen3-TTS-12Hz-1.7B-Base-Q4_K_M.gguf`;
const projectorUrl = `${base}/mmproj-Qwen3-TTS-12Hz-1.7B-Base-Q8_0.gguf`;
const cacheName = 'bottopia-qwen-tts-v1';
const progress = message => self.postMessage({ type: 'progress', message });
let running = false;
self.onmessage = async ({ data }) => {
  if (running) return;
  running = true;
  let bridge, projectorObjectUrl;
  try {
    const text = validateSpeech(data.text, 'F1', 1);
    const language = validateLanguage('qwen', data.language);
    referenceVoice(data.voice);
    if (!self.crossOriginIsolated) throw new Error('Qwen 실행 화면을 새로고침한 뒤 다시 시도해주세요.');
    const speakerAudio = await loadReferenceVoice(data.voice);
    bridge = new LlamaWebGpuBridge({
      disableWorker: true, preferMemory64: true,
      coreModuleUrlMem64: new URL('./llama_webgpu_core_mem64.js', import.meta.url).href,
      wasmUrlMem64: new URL('./llama_webgpu_core_mem64.wasm', import.meta.url).href,
      cacheName, logLevel: 2,
    });
    progress('Qwen3-TTS 모델을 다운로드하고 있습니다.');
    // Prefetch explicitly: upstream loadModel awaits cache.put before emitting progress.
    // Keeping this separate makes first-download progress visible and caches the decoder too.
    let useCache = false;
    if (self.caches) {
      try {
        for (const [url, label] of [[modelUrl, '언어 모델'], [projectorUrl, '음성 디코더']]) {
          await bridge.prefetchModelToCache(url, { useCache: true, progressCallback: e => progress(`${label} 다운로드 · ${Math.round((e.loaded || 0) / 1000000)}MB${e.total ? ` / ${Math.round(e.total / 1000000)}MB` : ''}`) });
        }
        useCache = true;
        const cached = await (await self.caches.open(cacheName)).match(projectorUrl);
        if (cached) projectorObjectUrl = URL.createObjectURL(await cached.blob());
      } catch { progress('기기 캐시를 사용할 수 없어 직접 다운로드합니다.'); }
    }
    await bridge.loadModelFromUrl(modelUrl, {
      nCtx: 4096, nGpuLayers: 99, nThreads: 4, nBatch: 512, nUbatch: 256,
      useCache, forceRemoteFetchBackend: false,
      progressCallback: e => progress(`Qwen 모델 준비 · ${Math.round((e.loaded || 0) / 1000000)}MB${e.total ? ` / ${Math.round(e.total / 1000000)}MB` : ''}`),
    });
    progress('음성 디코더를 실행하고 있습니다.');
    await bridge.loadMultimodalProjector(projectorObjectUrl || projectorUrl);
    const capabilities = await bridge.getTextToSpeechCapabilities();
    if (!capabilities.supported || capabilities.sampleRate !== 24000 || capabilities.channels !== 1) throw new Error('이 브라우저에서 Qwen 음성 엔진을 실행할 수 없습니다.');
    if (!capabilities.supportsSpeakerReference) throw new Error('현재 엔진이 목소리 선택을 지원하지 않습니다. 화면을 새로고침해주세요.');
    const chunks = splitSpeech(text, 100), audio = [];
    let length = 0;
    for (let i = 0; i < chunks.length; i++) {
      const result = await bridge.synthesizeSpeech({
        text: chunks[i], language, speakerAudio, maxFrames: 720,
        onProgress: event => progress(`음성 생성 ${i + 1}/${chunks.length} · ${event.framesGenerated || 0} 프레임`),
      });
      if (result.truncated) throw new Error('문장을 끝까지 읽지 못했습니다. 대사를 짧게 나누어 다시 시도해주세요.');
      if (!(result.pcm instanceof Float32Array) || result.sampleRate !== 24000 || result.channels !== 1) throw new Error('음성 결과 형식이 올바르지 않습니다.');
      length += result.pcm.length;
      if (length > 24000 * 180) throw new Error('3분을 넘는 대사입니다. 나누어 생성해주세요.');
      audio.push(result.pcm);
    }
    const pcm = new Float32Array(length); let offset = 0;
    for (const chunk of audio) { pcm.set(chunk, offset); offset += chunk.length; }
    const wav = encodeSpeech(pcm, 24000);
    self.postMessage({ type: 'result', wav, seconds: length / 24000 }, [wav]);
  } catch (error) {
    console.error('Qwen3-TTS generation failed', error);
    self.postMessage({ type: 'error', message: error instanceof Error && /[가-힣]/.test(error.message) ? error.message : 'Qwen 음성 생성에 실패했습니다. 최신 Chrome/Edge에서 다시 시도해주세요. 기존 음성은 유지됩니다.' });
  } finally { await bridge?.dispose(); if (projectorObjectUrl) URL.revokeObjectURL(projectorObjectUrl); running = false; }
};
