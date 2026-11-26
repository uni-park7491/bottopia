import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvasHandlers, signJobReceipt, verifyJobReceipt, isPublicHttps } from '../lib/canvas/server.ts';

const OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const FILE = `canvas/${OWNER}/cccccccc-cccc-4ccc-8ccc-cccccccccccc.png`;
const NOW = 1795651200000;
const env = { CANVAS_VIDEO_PROVIDER: 'beat', BEATAPI_API_KEY: 'test-beat-key-private', KIE_API_KEY: 'test-kie-key-private', CANVAS_JOB_SECRET: 'test-secret-is-only-for-tests-123456789', CANVAS_GENERATION_ENABLED: 'true' };
const input = () => ({ operationId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', modelId: 'seedance-2-5', prompt: 'A cinematic landscape with ambient sound.', aspectRatio: '16:9', resolution: '720p', durationSeconds: 5, generateAudio: true, references: [] });
const req = (path, body, extra = {}, method = 'POST') => new Request(`https://studio.example.com/api/canvas/${path}`, { method, headers: { 'Content-Type': 'application/json', Origin: 'https://studio.example.com', ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const receipt = (overrides = {}) => signJobReceipt({ v: 1, ownerId: OWNER, providerId: 'beat', modelId: 'seedance-2-5', taskId: 'task_safe', issuedAt: NOW, ...overrides }, env);

function harness(options = {}) {
  const calls = { fetch: [], info: [], sign: [], upload: [], remove: [], guard: [] };
  const storage = {
    info: async key => { calls.info.push(key); return { data: options.info ?? { contentType: 'image/png', size: 1500 }, error: null }; },
    createSignedUrl: async (key, seconds) => { calls.sign.push({ key, seconds }); return { data: { signedUrl: 'https://owned-storage.example.com/image.png?token=temporary' }, error: null }; },
    createSignedUploadUrl: async key => { calls.upload.push(key); return { data: { signedUrl: 'https://owned-storage.example.com/upload?token=temporary', token: 'upload-ticket' }, error: null }; },
    remove: async keys => { calls.remove.push(keys); return { error: null }; },
  };
  const dependencies = {
    env: options.env ?? env, owner: async () => options.owner === undefined ? { id: OWNER } : options.owner,
    currentUser: async () => options.user ?? null, now: () => NOW, storage: () => storage,
    guard: async (...args) => { calls.guard.push(args); return options.blocked ?? null; },
    fetcher: async (url, init) => {
      calls.fetch.push({ url, init });
      if (options.throwNetwork) throw new Error('private upstream failure ' + env.BEATAPI_API_KEY);
      if (options.providerResponse) return options.providerResponse();
      if (init.method === 'POST') return Response.json({ data: { id: 'task_safe', poll_after_seconds: 8 } }, { status: 201 });
      return Response.json({ data: { status: 'succeeded', output: { media: [{ type: 'video', url: options.outputUrl ?? 'https://cdn.example.com/result.mp4', mime_type: 'video/mp4' }] }, usage: { credits_settled: 0.9801 } } });
    },
  };
  return { api: createCanvasHandlers(dependencies), calls };
}

test('anonymous and member callers cannot submit, poll, upload or delete owner media', async () => {
  for (const [user, status] of [[null, 401], [{ id: OTHER }, 403]]) {
    const h = harness({ owner: null, user });
    for (const [method, request] of [['generate', req('generate', input())], ['status', new Request('https://studio.example.com/api/canvas/status?receipt=' + receipt())], ['createAsset', req('assets', { type: 'image/png', size: 12 })], ['deleteAssets', req('assets', { keys: [FILE] }, {}, 'DELETE')]]) {
      assert.equal((await h.api[method](request)).status, status);
    }
    assert.equal(h.calls.fetch.length + h.calls.upload.length + h.calls.remove.length, 0);
  }
});

test('cross-site mutations and existing durable limits block all provider/storage writes', async () => {
  const cross = harness(); assert.equal((await cross.api.generate(req('generate', input(), { Origin: 'https://attacker.example.com' }))).status, 403);
  assert.equal(cross.calls.fetch.length, 0); assert.equal(cross.calls.guard.length, 0);
  const limited = harness({ blocked: Response.json({ error: 'limited' }, { status: 429 }) });
  assert.equal((await limited.api.generate(req('generate', input()))).status, 429); assert.equal(limited.calls.fetch.length, 0);
});

test('generation defaults off and missing selected-provider keys never fall back to a paid alternative', async () => {
  for (const configuration of [{ ...env, CANVAS_GENERATION_ENABLED: undefined }, { CANVAS_GENERATION_ENABLED: 'true', CANVAS_VIDEO_PROVIDER: 'beat' }, { ...env, CANVAS_VIDEO_PROVIDER: undefined }]) {
    const h = harness({ env: configuration }); assert.equal((await h.api.generate(req('generate', input()))).status, 503); assert.equal(h.calls.fetch.length, 0);
  }
  const h = harness({ owner: null }); const catalog = await (await h.api.models(new Request('https://studio.example.com/api/canvas/models'))).json();
  assert.equal(catalog.canGenerate, false); assert.ok(catalog.models.every(model => !model.canGenerate)); assert.ok(!JSON.stringify(catalog).includes(env.BEATAPI_API_KEY));
});

test('OpenSand remains selected but unverified contract blocks all network even with a key and generation enabled', async () => {
  const h = harness({ env: { ...env, CANVAS_VIDEO_PROVIDER: 'opensand', OPENSAND_API_KEY: 'test-opensand-private' } });
  const catalog = await (await h.api.models(new Request('https://studio.example.com/api/canvas/models'))).json();
  const video = catalog.models.find(model => model.id === 'seedance-2-5');
  assert.equal(video.providerId, 'opensand'); assert.equal(video.connected, true); assert.equal(video.canGenerate, false); assert.match(video.configurationNote, /요청 규격/);
  const response = await h.api.generate(req('generate', input())); assert.equal(response.status, 503); assert.equal((await response.json()).code, 'provider_contract_pending'); assert.equal(h.calls.fetch.length, 0);
});

test('only owned assets or signed job outputs are accepted, never arbitrary/private client URLs', async () => {
  const badReferences = [{ kind: 'image', url: 'http://127.0.0.1/admin' }, { kind: 'image', assetKey: FILE.replace(OWNER, OTHER) }, { kind: 'image', assetKey: '../works/private.png' }, { kind: 'image', assetKey: FILE, jobReceipt: receipt(), outputIndex: 0 }];
  for (const reference of badReferences) {
    const h = harness(); const response = await h.api.generate(req('generate', { ...input(), references: [reference] }));
    assert.ok([400, 403].includes(response.status)); assert.equal(h.calls.fetch.length, 0);
  }
  for (const value of ['http://cdn.example.com/v.mp4', 'https://127.0.0.1/v', 'https://2130706433/v', 'https://[::1]/v', 'https://example.internal/v', 'https://u:p@cdn.example.com/v', 'https://cdn.example.com:444/v']) assert.equal(isPublicHttps(value), false);
});

test('storage metadata is rechecked before generation; oversize or wrong-kind uploads never reach provider', async () => {
  for (const info of [{ contentType: 'image/png', size: 11 * 1024 * 1024 }, { contentType: 'video/mp4', size: 1000 }, { contentType: 'text/html', size: 1000 }]) {
    const h = harness({ info }); assert.equal((await h.api.generate(req('generate', { ...input(), references: [{ kind: 'image', assetKey: FILE }] }))).status, 400); assert.equal(h.calls.fetch.length, 0);
  }
  const h = harness(); const response = await h.api.generate(req('generate', { ...input(), references: [{ kind: 'image', assetKey: FILE }] }));
  assert.equal(response.status, 202); assert.equal(h.calls.info.length, 1); assert.equal(h.calls.sign[0].seconds, 3600);
  const provider = JSON.parse(h.calls.fetch[0].init.body); assert.equal(provider.model, 'seedance-2.5'); assert.equal(provider.reference_images[0], 'https://owned-storage.example.com/image.png?token=temporary'); assert.equal(provider.task_type, 'reference');
});

test('job receipts bind owner, provider, model, task and expiry; tampering cannot trigger provider polling', async () => {
  const valid = receipt(); assert.equal(verifyJobReceipt(valid, OWNER, env, NOW).taskId, 'task_safe');
  const [body, signature] = valid.split('.'); const changed = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url')), taskId: 'forged' })).toString('base64url') + '.' + signature;
  for (const token of [changed, receipt({ ownerId: OTHER }), receipt({ issuedAt: NOW - 8 * 86400000 })]) {
    const h = harness(); const response = await h.api.status(new Request('https://studio.example.com/api/canvas/status?receipt=' + token)); assert.ok([403, 410].includes(response.status)); assert.equal(h.calls.fetch.length, 0);
  }
});

test('signed completed output can be reused and client output URLs are not consulted', async () => {
  const h = harness(); const response = await h.api.generate(req('generate', { ...input(), references: [{ kind: 'video', jobReceipt: receipt(), outputIndex: 0, durationSeconds: 5 }] }));
  assert.equal(response.status, 202); assert.equal(h.calls.fetch.length, 2); assert.equal(h.calls.fetch[0].init.method, 'GET');
  assert.deepEqual(JSON.parse(h.calls.fetch[1].init.body).reference_videos, ['https://cdn.example.com/result.mp4']);
});

test('provider failures and ambiguous submits are sanitized and never automatically repeated', async () => {
  for (const options of [{ throwNetwork: true }, { providerResponse: () => Response.json({ error: env.BEATAPI_API_KEY }, { status: 500 }) }]) {
    const h = harness(options); const response = await h.api.generate(req('generate', input())); assert.ok([502, 504].includes(response.status)); assert.equal(h.calls.fetch.length, 1); assert.ok(!(await response.text()).includes(env.BEATAPI_API_KEY));
  }
  const h = harness({ outputUrl: 'https://127.0.0.1/private.mp4' }); assert.equal((await h.api.status(new Request('https://studio.example.com/api/canvas/status?receipt=' + receipt()))).status, 502);
});

test('status returns actual provider result and exact settlement without exposing keys', async () => {
  const h = harness(); const response = await h.api.status(new Request('https://studio.example.com/api/canvas/status?receipt=' + receipt())); const result = await response.json();
  assert.equal(result.state, 'succeeded'); assert.deepEqual(result.actualCost, { amount: 0.9801, currency: 'USD' }); assert.equal(response.headers.get('cache-control'), 'private, no-store'); assert.ok(!JSON.stringify(result).includes(env.BEATAPI_API_KEY));
});

test('asset tickets are bounded metadata requests and deletion is all-or-nothing within owner canvas prefix', async () => {
  const h = harness(); const ticket = await (await h.api.createAsset(req('assets', { type: 'image/png', size: 1000 }))).json();
  assert.match(ticket.assetKey, new RegExp(`^canvas/${OWNER}/[a-f0-9-]+\\.png$`)); assert.equal(ticket.token, 'upload-ticket'); assert.equal(h.calls.upload.length, 1);
  assert.equal((await h.api.createAsset(req('assets', { type: 'video/mp4', size: 51 * 1024 * 1024 }))).status, 400);
  assert.equal((await h.api.deleteAssets(req('assets', { keys: [FILE, 'works/private/video.mp4'] }, {}, 'DELETE'))).status, 403); assert.equal(h.calls.remove.length, 0);
  assert.equal((await h.api.deleteAssets(req('assets', { keys: [FILE, FILE] }, {}, 'DELETE'))).status, 200); assert.deepEqual(h.calls.remove, [[FILE]]);
});

test('large, invalid and unsupported generation bodies are rejected before billable submission', async () => {
  for (const body of [{ ...input(), prompt: 'x'.repeat(70000) }, { ...input(), durationSeconds: -1 }, { ...input(), modelId: 'seedance-2.0' }, { ...input(), providerId: 'attacker' }]) {
    const h = harness(); assert.equal((await h.api.generate(req('generate', body))).status, 400); assert.equal(h.calls.fetch.length, 0);
  }
});
