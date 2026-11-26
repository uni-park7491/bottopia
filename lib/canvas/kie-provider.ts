import { getCanvasModel } from './models.ts';
import type { ProviderInput, ProviderJob, ProviderResult } from './types.ts';

// No environment reads or credentials in this module. Authenticated server routes
// supply their key; the public catalog must never import this provider module.
const BASE_URL = 'https://api.kie.ai/api/v1/jobs';
const TIMEOUT_MS = 30_000;
const POLL_SECONDS = 3;

export class CanvasProviderError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = 'CanvasProviderError';
    this.code = code;
    this.status = status;
  }
}

function invalidInput(): never {
  throw new CanvasProviderError('invalid_input', 400, '이미지 생성 설정과 참조 파일을 확인해주세요.');
}

function invalidResponse(): never {
  throw new CanvasProviderError('invalid_response', 502, '이미지 생성 서비스의 응답을 확인하지 못했습니다.');
}

function assertServerKey(key: string) {
  if (typeof window !== 'undefined' || typeof key !== 'string' || !key.trim() || /[\r\n]/.test(key)) {
    throw new CanvasProviderError('provider_unavailable', 503, '이미지 생성 연결이 준비되지 않았습니다.');
  }
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function safeHttpsUrl(value: unknown, key = ''): string {
  if (typeof value !== 'string' || value.length > 8192 || (key.length >= 8 && value.includes(key))) invalidResponse();
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')
      || !host.includes('.') || host.startsWith('[') || /^\d+(\.\d+){3}$/.test(host)
      || ['localhost', '.localhost', '.local', '.internal'].some(suffix => host === suffix || host.endsWith(suffix))) invalidResponse();
    url.hash = '';
    return url.href;
  } catch {
    return invalidResponse();
  }
}

async function request(path: string, key: string, fetcher: typeof fetch, body?: object): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // A submit timeout can already have created a billable task. Never retry POST here.
    const response = await fetcher(`${BASE_URL}/${path}`, {
      method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${key}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: controller.signal, cache: 'no-store', redirect: 'error',
    });
    if (!response.ok) throw new CanvasProviderError('provider_rejected', 502, '이미지 생성 서비스가 요청을 처리하지 못했습니다.');
    let value: unknown;
    try { value = await response.json(); } catch { return invalidResponse(); }
    const envelope = object(value);
    if (!envelope || typeof envelope.code !== 'number') invalidResponse();
    if (envelope.code !== 200) throw new CanvasProviderError('provider_rejected', 502, '이미지 생성 서비스가 요청을 처리하지 못했습니다.');
    const data = object(envelope.data);
    if (!data) invalidResponse();
    return data;
  } catch (error) {
    if (controller.signal.aborted || (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name))) {
      throw new CanvasProviderError('provider_timeout', 504, '이미지 생성 서비스의 요청 확인 시간이 초과되었습니다.');
    }
    if (error instanceof CanvasProviderError) throw error;
    throw new CanvasProviderError('provider_network', 502, '이미지 생성 서비스에 연결하지 못했습니다.');
  } finally {
    clearTimeout(timer);
  }
}

export async function submitKie(input: ProviderInput, key: string, fetcher: typeof fetch = fetch): Promise<ProviderJob> {
  assertServerKey(key);
  if (!input || typeof input !== 'object') invalidInput();
  const model = getCanvasModel(input.modelId);
  if (!model || model.kind !== 'image' || model.providerId !== 'kie'
    || typeof input.prompt !== 'string' || !model.resolutions.includes(input.resolution)
    || !model.aspectRatios.includes(input.aspectRatio) || !Array.isArray(input.references)
    || input.references.length > model.maxImages || input.references.some(ref => !ref || ref.kind !== 'image')) invalidInput();
  const prompt = input.prompt.trim();
  const minLength = input.modelId === 'seedream-5-5' ? 5 : input.modelId === 'seedream-5-pro' ? 4 : 1;
  const maxLength = input.modelId === 'nano-banana-2-1' ? 20_000 : 5000;
  if (prompt.length < minLength || prompt.length > maxLength) invalidInput();
  let imageUrls: string[];
  try { imageUrls = input.references.map(ref => safeHttpsUrl(ref.url, key)); } catch { return invalidInput(); }
  const editing = imageUrls.length > 0;
  // Seedream5.5 auto is an editing-only option. Never silently change the requested ratio.
  if (input.modelId === 'seedream-5-5' && input.aspectRatio === 'auto' && !editing) invalidInput();
  let providerModel: string;
  let providerInput: Record<string, unknown>;
  if (input.modelId === 'seedream-5-pro') {
    providerModel = editing ? 'seedream/5-pro-image-to-image' : 'seedream/5-pro-text-to-image';
    providerInput = { prompt, aspect_ratio: input.aspectRatio, quality: input.resolution === '1K' ? 'basic' : 'high', output_format: 'png', ...(editing ? { image_urls: imageUrls } : {}) };
  } else if (input.modelId === 'seedream-5-5') {
    providerModel = editing ? 'seedream/5-5-image-to-image' : 'seedream/5-5-text-to-image';
    providerInput = { prompt, aspect_ratio: input.aspectRatio, size: input.resolution, output_format: 'png', background: 'auto', ...(editing ? { image_urls: imageUrls } : {}) };
  } else {
    providerModel = 'nano-banana-2-1';
    providerInput = { prompt, aspect_ratio: input.aspectRatio, resolution: input.resolution, output_format: 'png', image_input: imageUrls };
  }
  const data = await request('createTask', key, fetcher, { model: providerModel, input: providerInput });
  const taskId = data.taskId;
  if (typeof taskId !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(taskId) || (key.length >= 8 && taskId.includes(key))) invalidResponse();
  return { taskId, pollAfterSeconds: POLL_SECONDS };
}

export async function pollKie(taskId: string, key: string, fetcher: typeof fetch = fetch): Promise<ProviderResult> {
  assertServerKey(key);
  if (typeof taskId !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(taskId)) invalidInput();
  const data = await request(`recordInfo?taskId=${encodeURIComponent(taskId)}`, key, fetcher);
  if (data.state === 'waiting' || data.state === 'queuing') return { state: 'queued', outputs: [], pollAfterSeconds: POLL_SECONDS };
  if (data.state === 'generating') return { state: 'running', outputs: [], pollAfterSeconds: POLL_SECONDS };
  if (data.state === 'fail') return { state: 'failed', outputs: [], message: '이미지 생성에 실패했습니다.' };
  if (data.state !== 'success' || typeof data.resultJson !== 'string') invalidResponse();
  let result: Record<string, unknown> | null;
  try { result = object(JSON.parse(data.resultJson)); } catch { return invalidResponse(); }
  const urls = result?.resultUrls;
  if (!Array.isArray(urls) || urls.length !== 1) invalidResponse();
  const outputs = urls.map(url => ({ url: safeHttpsUrl(url, key), kind: 'image' as const }));
  const credits = data.creditsConsumed;
  const actualCost = typeof credits === 'number' && Number.isFinite(credits) && credits >= 0 && credits <= 1_000_000
    ? { amount: Math.round(credits * 0.005 * 1_000_000) / 1_000_000, currency: 'USD' } : undefined;
  return { state: 'succeeded', outputs, ...(actualCost ? { actualCost } : {}) };
}
