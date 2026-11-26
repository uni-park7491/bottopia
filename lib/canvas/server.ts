import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { readJsonObject, sameSiteMutation } from '../request-policy.ts';
import { MODELS, getCanvasModel } from './models.ts';
import { CanvasProviderError, submitKie, pollKie } from './kie-provider.ts';
import { submitBeat, pollBeat } from './beat-provider.ts';
import { submitOpenSand, pollOpenSand, OPENSAND_CONFIGURATION_NOTE, OPENSAND_ROUTE_VERIFIED } from './opensand-provider.ts';
import type { CanvasInputReference, GenerationRequest, MediaKind, ProviderInput, ProviderResult } from './types.ts';

type Env = Record<string, string | undefined>;
type Owner = { id: string };
type Storage = {
  info(key: string): Promise<{ data: { contentType?: string; size?: number } | null; error: unknown }>;
  createSignedUploadUrl(key: string): Promise<{ data: { signedUrl: string; token: string } | null; error: unknown }>;
  createSignedUrl(key: string, seconds: number): Promise<{ data: { signedUrl: string } | null; error: unknown }>;
  remove(keys: string[]): Promise<{ error: unknown }>;
};
export type CanvasDependencies = {
  env: Env; owner(): Promise<Owner | null>; currentUser(): Promise<Owner | null>;
  guard(request: Request, action: string, limit: number, userId?: string): Promise<Response | null>;
  storage(): Storage; fetcher?: typeof fetch; now?: () => number;
};
type Receipt = { v: 1; ownerId: string; providerId: 'opensand' | 'beat' | 'kie'; modelId: string; taskId: string; issuedAt: number };
const HEADERS = { 'Cache-Control': 'private, no-store' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TASK = /^[A-Za-z0-9_-]{1,180}$/;
const MIME: Record<string, { kind: MediaKind; ext: string; limit: number }> = {
  'image/jpeg': { kind: 'image', ext: 'jpg', limit: 10 }, 'image/png': { kind: 'image', ext: 'png', limit: 10 }, 'image/webp': { kind: 'image', ext: 'webp', limit: 10 },
  'video/mp4': { kind: 'video', ext: 'mp4', limit: 50 }, 'video/quicktime': { kind: 'video', ext: 'mov', limit: 50 },
  'audio/mpeg': { kind: 'audio', ext: 'mp3', limit: 15 }, 'audio/wav': { kind: 'audio', ext: 'wav', limit: 15 },
  'audio/x-wav': { kind: 'audio', ext: 'wav', limit: 15 }, 'audio/mp4': { kind: 'audio', ext: 'm4a', limit: 15 }, 'audio/aac': { kind: 'audio', ext: 'aac', limit: 15 },
};
function json(value: unknown, status = 200) { return Response.json(value, { status, headers: HEADERS }); }
function fail(code: string, status: number, message: string): never { throw new CanvasProviderError(code, status, message); }
function providerKey(env: Env, provider: string) { return provider === 'opensand' ? env.OPENSAND_API_KEY : provider === 'beat' ? env.BEATAPI_API_KEY : provider === 'kie' ? env.KIE_API_KEY : undefined; }
function videoProvider(env: Env): 'opensand' | 'beat' {
  const provider = env.CANVAS_VIDEO_PROVIDER ?? 'opensand';
  if (provider !== 'opensand' && provider !== 'beat') fail('config_missing', 503, '영상 API 제공자 설정을 확인해주세요.');
  return provider;
}
function configuredModel(id: string, provider: 'opensand' | 'beat') {
  const model = getCanvasModel(id);
  return model?.kind === 'video' ? getCanvasModel(id, provider) : model;
}
function secret(env: Env, provider: string): string {
  if (env.CANVAS_JOB_SECRET) {
    if (env.CANVAS_JOB_SECRET.length < 32) fail('config_missing', 503, '캔버스 작업 서명 설정을 확인해주세요.');
    return env.CANVAS_JOB_SECRET;
  }
  const key = providerKey(env, provider);
  if (!key) fail('config_missing', 503, '선택한 생성 API 연결이 필요합니다.');
  return createHmac('sha256', key).update('bottopia-canvas-job-signing-v1').digest('hex');
}

export function signJobReceipt(receipt: Receipt, env: Env): string {
  const body = Buffer.from(JSON.stringify(receipt)).toString('base64url');
  return body + '.' + createHmac('sha256', secret(env, receipt.providerId)).update(body).digest('base64url');
}
export function verifyJobReceipt(value: unknown, ownerId: string, env: Env, now = Date.now()): Receipt {
  if (typeof value !== 'string' || value.length > 3000) fail('invalid_receipt', 400, '올바른 생성 작업을 선택해주세요.');
  const parts = value.split('.');
  if (parts.length !== 2 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) fail('invalid_receipt', 400, '작업 확인 정보가 유효하지 않습니다.');
  let row: Receipt;
  try { row = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); } catch { fail('invalid_receipt', 400, '작업 확인 정보가 유효하지 않습니다.'); }
  if (!row || row.v !== 1 || !['opensand', 'beat', 'kie'].includes(row.providerId) || !TASK.test(row.taskId) || typeof row.modelId !== 'string' || !Number.isSafeInteger(row.issuedAt)) fail('invalid_receipt', 400, '작업 확인 정보가 유효하지 않습니다.');
  const expected = createHmac('sha256', secret(env, row.providerId)).update(parts[0]).digest();
  const received = Buffer.from(parts[1], 'base64url');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) fail('invalid_receipt', 403, '작업 확인 정보가 변경되었습니다.');
  if (row.ownerId !== ownerId) fail('forbidden', 403, '내가 생성한 작업만 사용할 수 있습니다.');
  if (row.issuedAt > now + 300000 || row.issuedAt < now - 7 * 86400000) fail('receipt_expired', 410, '작업 확인 기간이 지났습니다. 보관한 원본 파일을 사용해주세요.');
  const model = getCanvasModel(row.modelId, row.providerId === 'kie' ? undefined : row.providerId);
  if (!model || model.providerId !== row.providerId) fail('invalid_receipt', 400, '지원하는 생성 작업이 아닙니다.');
  return row;
}

export function isPublicHttps(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 12000) return false;
  try {
    const u = new URL(value); const host = u.hostname.toLowerCase();
    return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') && !isIP(host.replace(/^\[|\]$/g, '')) && host.includes('.') && !/(^|\.)(localhost|local|internal|test|invalid)$/.test(host) && !host.endsWith('.');
  } catch { return false; }
}
export function ownsCanvasAsset(key: unknown, ownerId: string): key is string {
  if (typeof key !== 'string' || !key.startsWith(`canvas/${ownerId}/`)) return false;
  const name = key.slice(`canvas/${ownerId}/`.length);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|mp4|mov|mp3|wav|m4a|aac)$/i.test(name);
}
function uploadInfo(type: unknown, size: unknown) {
  if (typeof type !== 'string' || !Object.hasOwn(MIME, type) || !Number.isSafeInteger(size) || Number(size) <= 0) fail('invalid_input', 400, '지원하는 파일 형식과 크기를 확인해주세요.');
  const info = MIME[type];
  if (Number(size) > info.limit * 1024 * 1024) fail('invalid_input', 400, `이 파일은 ${info.limit}MB 이하로 준비해주세요.`);
  return info;
}
export function parseGeneration(value: Record<string, unknown> | null, provider: 'opensand' | 'beat' = 'opensand'): GenerationRequest {
  if (!value || Object.keys(value).some(key => !['operationId', 'modelId', 'prompt', 'aspectRatio', 'resolution', 'durationSeconds', 'generateAudio', 'references'].includes(key))) fail('invalid_input', 400, '생성 요청을 확인해주세요.');
  const model = typeof value.modelId === 'string' ? configuredModel(value.modelId, provider) : null;
  if (!model || typeof value.operationId !== 'string' || !UUID.test(value.operationId) || typeof value.prompt !== 'string' || !value.prompt.trim() || value.prompt.length > (model.kind === 'video' ? 5000 : 20000) || typeof value.aspectRatio !== 'string' || !model.aspectRatios.includes(value.aspectRatio) || typeof value.resolution !== 'string' || !model.resolutions.includes(value.resolution) || typeof value.generateAudio !== 'boolean' || !Array.isArray(value.references)) fail('invalid_input', 400, '모델, 프롬프트와 생성 설정을 확인해주세요.');
  if (!Number.isSafeInteger(value.durationSeconds) || Number(value.durationSeconds) < (model.minDuration ?? 0) || Number(value.durationSeconds) > (model.maxDuration ?? 30)) fail('invalid_input', 400, '지원하는 생성 길이를 선택해주세요.');
  const counts = { image: 0, video: 0, audio: 0 }; let videoSeconds = 0; let audioSeconds = 0;
  if (value.references.length > 50) fail('invalid_input', 400, '참조 파일 수를 줄여주세요.');
  for (const ref of value.references) {
    if (!ref || typeof ref !== 'object' || Array.isArray(ref) || Object.keys(ref).some(key => !['kind', 'assetKey', 'jobReceipt', 'outputIndex', 'durationSeconds'].includes(key)) || !['image', 'video', 'audio'].includes(ref.kind) || Boolean(ref.assetKey) === Boolean(ref.jobReceipt)) fail('invalid_input', 400, '내가 올리거나 생성한 참조 파일을 선택해주세요.');
    if (ref.assetKey && (typeof ref.assetKey !== 'string' || ref.outputIndex !== undefined)) fail('invalid_input', 400, '참조 파일 정보를 확인해주세요.');
    if (ref.jobReceipt && (typeof ref.jobReceipt !== 'string' || !Number.isSafeInteger(ref.outputIndex) || ref.outputIndex < 0 || ref.outputIndex > 49)) fail('invalid_input', 400, '생성한 참조 파일을 확인해주세요.');
    const kind = ref.kind as MediaKind; counts[kind]++;
    if (kind !== 'image') {
      if (typeof ref.durationSeconds !== 'number' || !Number.isFinite(ref.durationSeconds) || ref.durationSeconds < 2 || ref.durationSeconds > 30) fail('invalid_input', 400, '영상·소리 참조는 각각 2–30초로 준비해주세요.');
      if (kind === 'video') videoSeconds += ref.durationSeconds; else audioSeconds += ref.durationSeconds;
    }
  }
  if (counts.image > model.maxImages || counts.video > model.maxVideos || counts.audio > model.maxAudios || videoSeconds > 30 || audioSeconds > 30) fail('invalid_input', 400, '이 모델의 참조 파일 수·길이 한도를 확인해주세요.');
  return { ...value, prompt: value.prompt.trim() } as GenerationRequest;
}

export function createCanvasHandlers(deps: CanvasDependencies) {
  const now = deps.now ?? Date.now;
  async function owner(): Promise<Owner> {
    const user = await deps.owner(); if (user) return user;
    if (!(await deps.currentUser())) fail('unauthorized', 401, '로그인이 필요합니다.');
    return fail('forbidden', 403, '운영자만 생성 API를 사용할 수 있습니다.');
  }
  async function mutation(request: Request, user: Owner, action: string, limit: number) {
    if (!sameSiteMutation(request, deps.env.NEXT_PUBLIC_SITE_URL)) fail('forbidden', 403, '허용되지 않은 요청입니다.');
    return deps.guard(request, action, limit, user.id);
  }
  async function result(row: Receipt): Promise<ProviderResult> {
    const key = providerKey(deps.env, row.providerId);
    if (!key) fail('config_missing', 503, '선택한 생성 API 연결이 필요합니다.');
    const value = row.providerId === 'opensand' ? await pollOpenSand(row.taskId, key, deps.fetcher) : row.providerId === 'beat' ? await pollBeat(row.taskId, key, deps.fetcher) : await pollKie(row.taskId, key, deps.fetcher);
    if (value.outputs.some(output => !isPublicHttps(output.url) || output.url.includes(key))) fail('invalid_response', 502, '공급자의 파일 주소를 확인하지 못했습니다.');
    return value;
  }
  async function resolveReference(ref: CanvasInputReference, user: Owner) {
    if (ref.assetKey) {
      if (!ownsCanvasAsset(ref.assetKey, user.id)) fail('forbidden', 403, '내가 올린 참조 파일만 사용할 수 있습니다.');
      const storage = deps.storage(); const info = await storage.info(ref.assetKey);
      if (info.error || !info.data) fail('invalid_input', 400, '참조 파일 업로드를 완료해주세요.');
      const verified = uploadInfo(info.data.contentType, info.data.size);
      if (verified.kind !== ref.kind) fail('invalid_input', 400, '참조 파일 종류가 일치하지 않습니다.');
      const signed = await storage.createSignedUrl(ref.assetKey, 3600);
      if (signed.error || !signed.data || !isPublicHttps(signed.data.signedUrl)) fail('storage_unavailable', 503, '참조 파일을 준비하지 못했습니다.');
      return { kind: ref.kind, url: signed.data.signedUrl, durationSeconds: ref.durationSeconds };
    }
    const row = verifyJobReceipt(ref.jobReceipt, user.id, deps.env, now()); const previous = await result(row);
    const output = previous.outputs[ref.outputIndex ?? -1];
    if (previous.state !== 'succeeded' || !output || output.kind !== ref.kind) fail('invalid_input', 400, '완료된 생성 결과를 참조로 선택해주세요.');
    return { kind: ref.kind, url: output.url, durationSeconds: ref.durationSeconds };
  }
  function handler(fn: (request: Request) => Promise<Response>) {
    return async (request: Request) => {
      try { return await fn(request); }
      catch (error) {
        if (error instanceof CanvasProviderError) return json({ error: error.message, code: error.code }, error.status);
        return json({ error: '캔버스 요청을 처리하지 못했습니다. 잠시 후 다시 확인해주세요.', code: 'unavailable' }, 503);
      }
    };
  }
  return {
    models: handler(async () => {
      const user = await deps.owner(); const enabled = deps.env.CANVAS_GENERATION_ENABLED === 'true';
      const models = MODELS.map(base => {
        const model = configuredModel(base.id, videoProvider(deps.env))!;
        const verified = model.providerId !== 'opensand' || OPENSAND_ROUTE_VERIFIED;
        return {
          ...model, connected: Boolean(providerKey(deps.env, model.providerId)),
          canGenerate: Boolean(user && enabled && verified && providerKey(deps.env, model.providerId)),
          ...(model.providerId === 'opensand' ? { configurationNote: OPENSAND_CONFIGURATION_NOTE } : {}),
        };
      });
      return json({ models, canGenerate: models.some(model => model.canGenerate) });
    }),
    generate: handler(async request => {
      const user = await owner(); const blocked = await mutation(request, user, 'canvas-generate', 12); if (blocked) return blocked;
      const provider = videoProvider(deps.env);
      const input = parseGeneration(await readJsonObject(request, 60000), provider); const model = configuredModel(input.modelId, provider)!;
      const key = providerKey(deps.env, model.providerId);
      if (!key) fail('config_missing', 503, '선택한 생성 API 연결이 필요합니다.');
      if (deps.env.CANVAS_GENERATION_ENABLED !== 'true') fail('generation_disabled', 503, '유료 생성 기능이 아직 활성화되지 않았습니다.');
      if (model.providerId === 'opensand' && !OPENSAND_ROUTE_VERIFIED) fail('provider_contract_pending', 503, OPENSAND_CONFIGURATION_NOTE);
      const signingKey = secret(deps.env, model.providerId);
      const references = [];
      for (const ref of input.references) references.push(await resolveReference(ref, user));
      const providerInput: ProviderInput = { ...input, references, operationId: createHmac('sha256', signingKey).update(`operation:${user.id}:${input.operationId}`).digest('hex') };
      const job = model.providerId === 'opensand' ? await submitOpenSand(providerInput, key, deps.fetcher) : model.providerId === 'beat' ? await submitBeat(providerInput, key, deps.fetcher) : await submitKie(providerInput, key, deps.fetcher);
      if (!TASK.test(job.taskId)) fail('invalid_response', 502, '생성 작업 번호를 확인하지 못했습니다.');
      const receipt = signJobReceipt({ v: 1, ownerId: user.id, providerId: model.providerId as Receipt['providerId'], modelId: model.id, taskId: job.taskId, issuedAt: now() }, deps.env);
      return json({ receipt, state: 'queued', pollAfterSeconds: job.pollAfterSeconds }, 202);
    }),
    status: handler(async request => {
      const user = await owner(); const row = verifyJobReceipt(new URL(request.url).searchParams.get('receipt'), user.id, deps.env, now());
      const blocked = await deps.guard(request, 'canvas-status', 900, user.id); if (blocked) return blocked;
      return json(await result(row));
    }),
    createAsset: handler(async request => {
      const user = await owner(); const blocked = await mutation(request, user, 'canvas-upload-ticket', 30); if (blocked) return blocked;
      const body = await readJsonObject(request, 2000);
      if (!body || Object.keys(body).some(key => !['type', 'size'].includes(key))) fail('invalid_input', 400, '업로드할 파일 정보를 확인해주세요.');
      const info = uploadInfo(body.type, body.size); const assetKey = `canvas/${user.id}/${randomUUID()}.${info.ext}`;
      const ticket = await deps.storage().createSignedUploadUrl(assetKey);
      if (ticket.error || !ticket.data) fail('storage_unavailable', 503, '참조 파일 업로드를 준비하지 못했습니다.');
      return json({ assetKey, signedUrl: ticket.data.signedUrl, token: ticket.data.token });
    }),
    deleteAssets: handler(async request => {
      const user = await owner(); const blocked = await mutation(request, user, 'canvas-reference-delete', 30); if (blocked) return blocked;
      const body = await readJsonObject(request, 8000);
      if (!body || Object.keys(body).some(key => key !== 'keys') || !Array.isArray(body.keys) || body.keys.length < 1 || body.keys.length > 50 || !body.keys.every(key => ownsCanvasAsset(key, user.id))) fail('forbidden', 403, '내 캔버스의 참조 파일만 삭제할 수 있습니다.');
      const removed = await deps.storage().remove([...new Set(body.keys)] as string[]);
      if (removed.error) fail('storage_unavailable', 503, '참조 파일을 정리하지 못했습니다.');
      return json({ ok: true });
    }),
  };
}
