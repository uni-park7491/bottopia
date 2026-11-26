import type { CanvasAsset, CanvasInputReference, GenerationRequest, MediaKind, ProviderResult } from '../../../lib/canvas/types';

const FORMATS: Record<string, { kind: MediaKind; megabytes: number }> = {
  'image/jpeg': { kind: 'image', megabytes: 10 }, 'image/png': { kind: 'image', megabytes: 10 }, 'image/webp': { kind: 'image', megabytes: 10 },
  'video/mp4': { kind: 'video', megabytes: 50 }, 'video/quicktime': { kind: 'video', megabytes: 50 },
  'audio/mpeg': { kind: 'audio', megabytes: 15 }, 'audio/wav': { kind: 'audio', megabytes: 15 }, 'audio/x-wav': { kind: 'audio', megabytes: 15 },
  'audio/mp4': { kind: 'audio', megabytes: 15 }, 'audio/aac': { kind: 'audio', megabytes: 15 },
};
export class CanvasClientError extends Error {
  uncertain: boolean;
  assetKeys: string[];
  constructor(message: string, uncertain = false, assetKeys: string[] = []) { super(message); this.name = 'CanvasClientError'; this.uncertain = uncertain; this.assetKeys = assetKeys; }
}
export function validateAsset(file: Blob): MediaKind {
  const format = FORMATS[file.type];
  if (!format || !file.size) throw new CanvasClientError('JPG·PNG·WebP, MP4·MOV, MP3·WAV·M4A·AAC 파일을 선택해주세요.');
  if (file.size > format.megabytes * 1024 * 1024) throw new CanvasClientError(`${format.kind === 'image' ? '이미지는' : format.kind === 'video' ? '영상은' : '소리는'} ${format.megabytes}MB까지 추가할 수 있습니다.`);
  return format.kind;
}
export async function inspectAsset(file: File): Promise<CanvasAsset> {
  const kind = validateAsset(file);
  const url = URL.createObjectURL(file);
  try {
    const metadata = await new Promise<{ width?: number; height?: number; durationSeconds?: number }>((resolve, reject) => {
      const media = kind === 'image' ? new Image() : document.createElement(kind);
      const timer = window.setTimeout(() => { media.removeAttribute('src'); reject(new CanvasClientError('파일 정보를 읽지 못했습니다. 다른 형식으로 저장한 파일을 추가해주세요.')); }, 15000);
      const done = () => {
        clearTimeout(timer);
        if (media instanceof HTMLImageElement) resolve({ width: media.naturalWidth, height: media.naturalHeight });
        else if (Number.isFinite(media.duration) && media.duration > 0) resolve({ durationSeconds: media.duration, ...(media instanceof HTMLVideoElement ? { width: media.videoWidth, height: media.videoHeight } : {}) });
        else reject(new CanvasClientError('파일 재생 길이를 확인하지 못했습니다.'));
        media.removeAttribute('src');
      };
      media.onerror = () => { clearTimeout(timer); media.removeAttribute('src'); reject(new CanvasClientError('브라우저에서 읽을 수 없는 미디어입니다.')); };
      if (media instanceof HTMLImageElement) media.onload = done;
      else { media.preload = 'metadata'; media.onloadedmetadata = done; }
      media.src = url;
    });
    return { id: crypto.randomUUID(), kind, name: file.name, mime: file.type, bytes: file.size, blob: file, ...metadata };
  } finally { URL.revokeObjectURL(url); }
}
async function jsonRequest(path: string, init: RequestInit, fetcher: typeof fetch, submission = false): Promise<Record<string, unknown>> {
  let response: Response;
  try { response = await fetcher(path, { ...init, cache: 'no-store' }); }
  catch { throw new CanvasClientError(submission ? '생성 요청의 접수 여부를 확인하지 못했습니다. 중복 결제를 피하려면 제공자의 작업 기록을 확인한 뒤 다시 생성해주세요.' : '연결을 확인한 뒤 다시 시도해주세요.', submission); }
  let body: Record<string, unknown>;
  try { body = await response.json(); }
  catch { throw new CanvasClientError('서버 응답을 확인하지 못했습니다.', submission && (response.ok || response.status >= 500)); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new CanvasClientError('서버 응답을 확인하지 못했습니다.', submission && (response.ok || response.status >= 500));
  if (!response.ok) {
    const preflight = ['config_missing', 'generation_disabled', 'provider_contract_pending', 'storage_unavailable'].includes(String(body.code));
    throw new CanvasClientError(typeof body.error === 'string' ? body.error : '캔버스 요청을 처리하지 못했습니다.', submission && !preflight && (response.status >= 500 || response.status === 408));
  }
  return body;
}
export async function uploadReferences(assets: CanvasAsset[], fetcher: typeof fetch = fetch): Promise<{ references: CanvasInputReference[]; assetKeys: string[] }> {
  const references: CanvasInputReference[] = [];
  const assetKeys: string[] = [];
  // Validate the full list before creating any storage objects.
  for (const asset of assets) {
    if (asset.jobReceipt && Number.isInteger(asset.outputIndex)) continue;
    if (!asset.blob) throw new CanvasClientError('이 참조 파일을 다시 추가해주세요. 내보낸 작업의 외부 주소만으로는 생성할 수 없습니다.');
    if (validateAsset(asset.blob) !== asset.kind) throw new CanvasClientError('참조 파일의 종류를 확인해주세요.');
  }
  try {
    for (const asset of assets) {
      const base = { kind: asset.kind, ...(asset.kind !== 'image' ? { durationSeconds: asset.durationSeconds } : {}) };
      if (asset.jobReceipt && Number.isInteger(asset.outputIndex)) {
        references.push({ ...base, jobReceipt: asset.jobReceipt, outputIndex: asset.outputIndex });
        continue;
      }
      const blob = asset.blob!;
      const ticket = await jsonRequest('/api/canvas/assets', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: blob.type, size: blob.size }) }, fetcher);
      if (typeof ticket.assetKey !== 'string' || typeof ticket.signedUrl !== 'string') throw new CanvasClientError('업로드 주소를 확인하지 못했습니다.');
      assetKeys.push(ticket.assetKey);
      const body = new FormData(); body.append('cacheControl', '3600'); body.append('', blob, asset.name);
      const response = await fetcher(ticket.signedUrl, { method: 'PUT', headers: { 'x-upsert': 'false' }, body });
      if (!response.ok) throw new CanvasClientError('참조 파일 전송을 완료하지 못했습니다.');
      references.push({ ...base, assetKey: ticket.assetKey });
    }
    return { references, assetKeys };
  } catch (error) {
    // No model job has been submitted yet, so these partial uploads are safe to remove.
    if (assetKeys.length) { try { await deleteReferences(assetKeys, fetcher); } catch { /* Keep keys in the error so the caller can offer cleanup. */ } }
    throw new CanvasClientError(error instanceof Error ? error.message : '참조 파일 준비에 실패했습니다.', false, assetKeys);
  }
}
export async function submitGeneration(input: GenerationRequest, fetcher: typeof fetch = fetch): Promise<{ receipt: string; state: 'queued'; pollAfterSeconds: number }> {
  const body = await jsonRequest('/api/canvas/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) }, fetcher, true);
  if (typeof body.receipt !== 'string' || !body.receipt) throw new CanvasClientError('작업 확인 번호를 받지 못했습니다. 제공자의 작업 기록을 확인해주세요.', true);
  return { receipt: body.receipt, state: 'queued', pollAfterSeconds: Math.max(3, Math.min(60, Number(body.pollAfterSeconds) || 8)) };
}
export async function pollGeneration(receipt: string, fetcher: typeof fetch = fetch): Promise<ProviderResult> {
  const body = await jsonRequest(`/api/canvas/status?receipt=${encodeURIComponent(receipt)}`, { method: 'GET' }, fetcher);
  if (!['queued', 'running', 'succeeded', 'failed', 'unknown'].includes(String(body.state)) || !Array.isArray(body.outputs)) throw new CanvasClientError('생성 상태를 확인하지 못했습니다.');
  return body as unknown as ProviderResult;
}
export async function deleteReferences(keys: string[], fetcher: typeof fetch = fetch): Promise<void> {
  if (!keys.length) return;
  await jsonRequest('/api/canvas/assets', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ keys }) }, fetcher);
}
