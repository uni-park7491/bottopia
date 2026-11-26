import type { ProviderInput, ProviderJob, ProviderResult } from './types.ts';
import { CanvasProviderError } from './kie-provider.ts';

const API = 'https://api.beatapi.io';
type Fetcher = typeof fetch;

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok) throw new CanvasProviderError('provider_rejected', 502, '영상 공급자가 요청을 처리하지 못했습니다.');
  const reader = response.body?.getReader();
  if (!reader) throw new CanvasProviderError('invalid_response', 502, '영상 공급자의 응답을 확인하지 못했습니다.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 262144) { await reader.cancel(); throw new Error('response too large'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid response');
    return value as Record<string, unknown>;
  } catch {
    throw new CanvasProviderError('invalid_response', 502, '영상 공급자의 응답을 확인하지 못했습니다.');
  } finally { reader.releaseLock(); }
}

async function call(path: string, key: string, init: RequestInit, fetcher: Fetcher) {
  if (!key) throw new CanvasProviderError('config_missing', 503, '영상 API 연결이 필요합니다.');
  try {
    return await responseJson(await fetcher(API + path, {
      ...init, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { Authorization: `Bearer ${key}`, ...init.headers },
    }));
  } catch (error) {
    if (error instanceof CanvasProviderError) throw error;
    // A timed-out POST might already have been accepted. Never resubmit automatically.
    throw new CanvasProviderError('provider_timeout', 504, '영상 요청 결과를 확인하지 못했습니다. 중복 생성 전에 공급자 작업 내역을 확인해주세요.');
  }
}

function dataObject(body: Record<string, unknown>): Record<string, unknown> {
  const data = body.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new CanvasProviderError('invalid_response', 502, '영상 작업 정보를 확인하지 못했습니다.');
  return data as Record<string, unknown>;
}

function pollSeconds(value: unknown): number { return typeof value === 'number' && value >= 2 && value <= 60 ? Math.ceil(value) : 8; }

export async function submitBeat(input: ProviderInput, key: string, fetcher: Fetcher = fetch): Promise<ProviderJob> {
  if (typeof window !== 'undefined') throw new CanvasProviderError('server_only', 403, '영상 API는 서버에서만 호출할 수 있습니다.');
  if (input.modelId !== 'seedance-2-5') throw new CanvasProviderError('invalid_input', 400, '지원하는 영상 모델을 선택해주세요.');
  const byKind = (kind: string) => input.references.filter(ref => ref.kind === kind).map(ref => ref.url);
  const body = {
    model: 'seedance-2.5', prompt: input.prompt, duration: input.durationSeconds,
    aspect_ratio: input.aspectRatio, resolution: input.resolution, generate_audio: input.generateAudio,
    output_format: 'mp4',
    ...(input.references.length ? {
      task_type: 'reference', reference_images: byKind('image'), reference_videos: byKind('video'), reference_audios: byKind('audio'),
    } : {}),
  };
  const data = dataObject(await call('/v1/videos/tasks', key, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `canvas-${input.operationId}` }, body: JSON.stringify(body),
  }, fetcher));
  if (typeof data.id !== 'string' || !/^[A-Za-z0-9_-]{1,180}$/.test(data.id)) throw new CanvasProviderError('invalid_response', 502, '영상 작업 번호를 확인하지 못했습니다. 중복 생성 전에 공급자 내역을 확인해주세요.');
  return { taskId: data.id, pollAfterSeconds: pollSeconds(data.poll_after_seconds) };
}

export async function pollBeat(taskId: string, key: string, fetcher: Fetcher = fetch): Promise<ProviderResult> {
  if (typeof window !== 'undefined') throw new CanvasProviderError('server_only', 403, '영상 API는 서버에서만 호출할 수 있습니다.');
  if (!/^[A-Za-z0-9_-]{1,180}$/.test(taskId)) throw new CanvasProviderError('invalid_input', 400, '올바른 작업 번호가 필요합니다.');
  const data = dataObject(await call(`/v1/tasks/${encodeURIComponent(taskId)}`, key, { method: 'GET' }, fetcher));
  if (data.status === 'queued' || data.status === 'processing') return { state: data.status === 'queued' ? 'queued' : 'running', outputs: [], pollAfterSeconds: pollSeconds(data.poll_after_seconds) };
  if (data.status === 'failed') return { state: 'failed', outputs: [], message: '영상 생성에 실패했습니다. 입력 조건과 공급자 작업 내역을 확인해주세요.' };
  if (data.status !== 'succeeded') throw new CanvasProviderError('invalid_response', 502, '영상 작업 상태를 확인하지 못했습니다.');
  const output = data.output as { media?: { type?: unknown; url?: unknown; mime_type?: unknown }[] } | undefined;
  if (!Array.isArray(output?.media) || output.media.length < 1 || output.media.length > 10 || output.media.some(item => item.type !== 'video' || typeof item.url !== 'string')) throw new CanvasProviderError('invalid_response', 502, '완료된 영상 파일을 확인하지 못했습니다.');
  const usage = data.usage as { credits_settled?: unknown } | undefined;
  const amount = usage?.credits_settled;
  return {
    state: 'succeeded', outputs: output.media.map(item => ({ url: item.url as string, kind: 'video', ...(typeof item.mime_type === 'string' ? { mime: item.mime_type } : {}) })),
    ...(typeof amount === 'number' && Number.isFinite(amount) && amount >= 0 ? { actualCost: { amount, currency: 'USD' } } : {}),
  };
}
