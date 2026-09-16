import { WebWorkerMLCEngine } from '@mlc-ai/web-llm';
import { directorInstruction, shotDirectorInstruction, hasRunawayRepetition } from '../../lib/story-builder';

export const modelId = 'Qwen3.5-4B-q4f16_1-MLC';
// Pin executable WASM and model weights; never accept URLs/models from user input.
const appConfig = { model_list: [{
  model_id: modelId,
  model: 'https://huggingface.co/mlc-ai/Qwen3.5-4B-q4f16_1-MLC/resolve/44b42469f9e192814bfd90440e3b377d89ba7a13/',
  model_lib: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/025bcaf3780fa8254f5e5efd3bfea0a5397248f4/web-llm-models/v0_2_84/base/Qwen3.5-4B-q4f16_1_cs1k-webgpu.wasm',
  // The upstream chat config still lists Qwen2 EOS IDs; use IDs from this pinned tokenizer.
  overrides: { context_window_size: 4096, max_history_size: 1, conv_config: { stop_token_ids: [248044, 248046] } },
}] };
const shotSchema = (count: number) => JSON.stringify({ type: 'object', properties: { shots: { type: 'array', minItems: count, maxItems: count, items: { type: 'object', properties: { visual: { type: 'string' }, camera: { type: 'string' }, audio: { type: 'string' } }, required: ['visual','camera','audio'], additionalProperties: false } } }, required: ['shots'], additionalProperties: false });
export function createStoryEngine(onProgress: (progress: number, text: string) => void) {
  const worker = new Worker(new URL('./story.worker.ts', import.meta.url), { type: 'module' });
  const started = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('AI 실행 작업자를 시작하지 못했습니다. 브라우저를 새로고침해주세요.')), 20000);
    worker.addEventListener('message', event => { if (event.data?.type === 'bottopia-worker-ready') { clearTimeout(timer); resolve(); } });
    worker.addEventListener('error', () => { clearTimeout(timer); reject(new Error('AI 실행 작업자를 불러오지 못했습니다.')); });
  });
  // Delay the library's message handler until our startup handshake completes.
  let engine: WebWorkerMLCEngine;
  let stopped = false;
  let rejectPending: ((error: Error) => void) | undefined;
  function stop() { stopped = true; worker.terminate(); rejectPending?.(new Error('작업을 중단했습니다. AI를 다시 준비해주세요.')); }
  function bounded<T>(job: () => Promise<T>, ms: number): Promise<T> {
    if (stopped) return Promise.reject(new Error('AI를 다시 준비해주세요.'));
    return new Promise((resolve, reject) => {
      rejectPending = reject;
      const timer = setTimeout(() => { stop(); reject(new Error('기기 응답이 지연되어 중단했습니다.')); }, ms);
      job().then(resolve, reject).finally(() => { clearTimeout(timer); rejectPending = undefined; });
    });
  }
  worker.onerror = () => stop();
  return {
    stop,
    load: () => bounded(async () => {
      await started;
      engine = new WebWorkerMLCEngine(worker, { appConfig, initProgressCallback: report => {
        const mb = report.text.match(/([\d.]+)MB/);
        const phase = /Fetching/.test(report.text) ? '모델 파일 다운로드 중' : /Loading/.test(report.text) ? '저장된 모델을 GPU에 불러오는 중' : 'GPU 실행 준비 중';
        onProgress(Math.max(0, Math.min(1, report.progress)), `${phase}${mb ? ` · ${mb[1]}MB` : ''}`);
      }, logLevel: 'ERROR' });
      onProgress(0, '모델 파일 연결 중');
      await engine.reload(modelId);
    }, 15 * 60 * 1000),
    generate: (prompt: string, json: boolean, onText?: (text: string) => void, shotCount = 4) => bounded(async () => {
      if (json && (!Number.isInteger(shotCount) || shotCount < 1 || shotCount > 4)) throw new Error('샷 묶음 크기가 올바르지 않습니다.');
      const stream = await engine.chat.completions.create({
        messages: [{ role: 'system', content: json ? shotDirectorInstruction : directorInstruction }, { role: 'user', content: prompt }],
        stream: true, temperature: json ? 0.35 : 0.4, top_p: 0.8, max_tokens: json ? 1300 : 1800,
        presence_penalty: json ? 0 : 0.5,
        extra_body: { enable_thinking: false },
        ...(json ? { response_format: { type: 'json_object' as const, schema: shotSchema(shotCount) } } : {}),
      });
      let result = ''; let finish = '';
      for await (const chunk of stream) {
        result += chunk.choices[0]?.delta.content || '';
        if (!json && hasRunawayRepetition(result)) throw new Error('반복 문장을 감지해 생성을 중단했습니다. 기존 작업은 유지됩니다. 주제를 구체화해 다시 시도해주세요.');
        finish = chunk.choices[0]?.finish_reason || finish;
        if (result.length > 12000) throw new Error('생성 결과가 너무 깁니다. 주제를 짧게 작성해주세요.');
        onText?.(result.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim());
      }
      result = result.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      if (finish === 'length' || !result || result.includes('<think>')) throw new Error('생성이 길이 제한에 도달했습니다. 더 짧은 내용으로 다시 시도해주세요.');
      return result;
    }, 5 * 60 * 1000),
  };
}
