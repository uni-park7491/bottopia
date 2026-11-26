import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAsset, uploadReferences, submitGeneration, pollGeneration, CanvasClientError } from '../app/tools/canvas/canvas-generation.ts';

const json = (body, status = 200) => Response.json(body, { status });
const input = { operationId: 'a', modelId: 'seedream-5-5', prompt: 'hello', aspectRatio: '1:1', resolution: '1K', durationSeconds: 5, generateAudio: true, references: [] };

test('client validates reference MIME, kind and size before issuing any upload ticket', async () => {
  assert.equal(validateAsset(new Blob(['x'], { type: 'image/png' })), 'image');
  assert.throws(() => validateAsset(new Blob(['x'], { type: 'text/html' })));
  assert.throws(() => validateAsset(new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: 'image/png' })));
  let calls = 0;
  await assert.rejects(uploadReferences([{ kind: 'image', name: 'a', blob: new Blob(['x'], { type: 'video/mp4' }) }], async () => { calls++; }), /종류/);
  await assert.rejects(uploadReferences([{ kind: 'image', remoteUrl: 'https://example.com/a.png' }], async () => { calls++; }), /다시 추가/);
  assert.equal(calls, 0);
});

test('owned generated result references use the signed receipt; local media uses a direct signed upload', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push([url, init]);
    return url === '/api/canvas/assets' ? json({ assetKey: 'canvas/owner/asset.png', signedUrl: 'https://storage.example/upload' }) : new Response(null, { status: 200 });
  };
  const result = await uploadReferences([
    { kind: 'image', jobReceipt: 'signed-receipt', outputIndex: 0 },
    { kind: 'image', name: 'a.png', blob: new Blob(['x'], { type: 'image/png' }) },
  ], fetcher);
  assert.deepEqual(result.references, [{ kind: 'image', jobReceipt: 'signed-receipt', outputIndex: 0 }, { kind: 'image', assetKey: 'canvas/owner/asset.png' }]);
  assert.equal(calls.length, 2);
  assert.equal(calls[1][1].method, 'PUT');
  assert.ok(calls[1][1].body instanceof FormData);
  assert.deepEqual(result.assetKeys, ['canvas/owner/asset.png']);
});

test('a partial reference upload is deleted before any generation request exists', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push([url, init.method]);
    if (init.method === 'DELETE') return json({ ok: true });
    if (url === '/api/canvas/assets') return json({ assetKey: 'owned-key', signedUrl: 'https://storage.example/upload' });
    throw new Error('connection dropped');
  };
  await assert.rejects(uploadReferences([{ kind: 'image', name: 'a.png', blob: new Blob(['x'], { type: 'image/png' }) }], fetcher), error => error instanceof CanvasClientError && error.assetKeys[0] === 'owned-key');
  assert.deepEqual(calls, [['/api/canvas/assets', 'POST'], ['https://storage.example/upload', 'PUT'], ['/api/canvas/assets', 'DELETE']]);
});

test('generation never retries an ambiguous paid submission; validation denial remains distinct', async () => {
  let calls = 0;
  await assert.rejects(submitGeneration(input, async () => { calls++; throw new Error('timeout'); }), error => error.uncertain === true);
  assert.equal(calls, 1);
  await assert.rejects(submitGeneration(input, async () => json({ error: 'invalid prompt' }, 400)), error => error.uncertain === false && error.message === 'invalid prompt');
  await assert.rejects(submitGeneration(input, async () => json({ error: 'upstream timeout' }, 502)), error => error.uncertain === true);
  await assert.rejects(submitGeneration(input, async () => json({ error: 'not connected', code: 'config_missing' }, 503)), error => error.uncertain === false);
  await assert.rejects(submitGeneration(input, async () => json({ state: 'queued' }, 202)), error => error.uncertain === true);
  for (const body of [null, [], 'accepted']) await assert.rejects(submitGeneration(input, async () => json(body, 202)), error => error instanceof CanvasClientError && error.uncertain === true);
});

test('completed jobs poll by receipt using GET only; submission respects bounded poll hints', async () => {
  const job = await submitGeneration(input, async () => json({ receipt: 'signed', pollAfterSeconds: 999 }, 202));
  assert.equal(job.pollAfterSeconds, 60);
  let called;
  const result = await pollGeneration('signed/receipt', async (url, init) => { called = [url, init.method]; return json({ state: 'succeeded', outputs: [{ url: 'https://cdn.example/file.png', kind: 'image' }] }); });
  assert.deepEqual(called, ['/api/canvas/status?receipt=signed%2Freceipt', 'GET']);
  assert.equal(result.state, 'succeeded');
});
