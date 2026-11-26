import test from 'node:test';
import assert from 'node:assert/strict';
import { CanvasProviderError, submitKie, pollKie } from '../lib/canvas/kie-provider.ts';

const KEY = 'server-only-test-secret';
const image = n => ({ kind: 'image', url: `https://assets.example.com/image-${n}.png` });
const input = (modelId, resolution = '1K', references = []) => ({
  operationId: 'op-one', modelId, prompt: 'A blue bird on a tree', aspectRatio: '1:1', resolution,
  durationSeconds: 5, generateAudio: true, references,
});
function stub(response, status = 200) {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options, body: options?.body ? JSON.parse(options.body) : undefined });
    return Response.json(response, { status });
  };
  return { fetcher, calls };
}
const success = data => ({ code: 200, data });
const rejectsSafely = async (promise, code) => {
  await assert.rejects(promise, error => error instanceof CanvasProviderError && error.code === code
    && !error.message.includes(KEY) && !error.message.includes('upstream-secret'));
};

test('Pro sends exact text/edit IDs and basic/high quality, with correct reference field', async () => {
  for (const [resolution, quality] of [['1K', 'basic'], ['2K', 'high']]) {
    for (const references of [[], [image(1), image(2)]]) {
      const { fetcher, calls } = stub(success({ taskId: 'task_pro_123' }));
      assert.deepEqual(await submitKie(input('seedream-5-pro', resolution, references), KEY, fetcher), { taskId: 'task_pro_123', pollAfterSeconds: 3 });
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, 'https://api.kie.ai/api/v1/jobs/createTask');
      assert.equal(calls[0].body.model, references.length ? 'seedream/5-pro-image-to-image' : 'seedream/5-pro-text-to-image');
      assert.equal(calls[0].body.input.quality, quality);
      assert.equal(calls[0].body.input.size, undefined);
      assert.equal(calls[0].body.input.resolution, undefined);
      assert.deepEqual(calls[0].body.input.image_urls, references.length ? references.map(ref => ref.url) : undefined);
      assert.equal(calls[0].body.input.num_images, undefined);
      assert.equal(calls[0].options.headers.Authorization, `Bearer ${KEY}`);
      assert.equal(calls[0].options.redirect, 'error');
      assert.equal(calls[0].options.cache, 'no-store');
      assert.ok(calls[0].options.signal instanceof AbortSignal);
    }
  }
});

test('5.5 preserves all exact size tiers and uses editing-only auto ratio only with references', async () => {
  for (const size of ['1K', '1.5K', '2K']) {
    const { fetcher, calls } = stub(success({ taskId: 'task_55' }));
    await submitKie(input('seedream-5-5', size), KEY, fetcher);
    assert.equal(calls[0].body.model, 'seedream/5-5-text-to-image');
    assert.equal(calls[0].body.input.size, size);
    assert.equal(calls[0].body.input.quality, undefined);
  }
  const { fetcher, calls } = stub(success({ taskId: 'task_edit55' }));
  await submitKie({ ...input('seedream-5-5', '2K', [image(1)]), aspectRatio: 'auto' }, KEY, fetcher);
  assert.equal(calls[0].body.model, 'seedream/5-5-image-to-image');
  assert.equal(calls[0].body.input.aspect_ratio, 'auto');
  assert.deepEqual(calls[0].body.input.image_urls, [image(1).url]);
  await rejectsSafely(submitKie({ ...input('seedream-5-5'), aspectRatio: 'auto' }, KEY, fetcher), 'invalid_input');
  assert.equal(calls.length, 1);
});

test('Nano2.1 sends its distinct ID, resolution and image_input rather than a substituted Nano model', async () => {
  for (const resolution of ['1K', '2K', '4K']) {
    const { fetcher, calls } = stub(success({ taskId: 'nano21' }));
    await submitKie(input('nano-banana-2-1', resolution, [image(1)]), KEY, fetcher);
    assert.equal(calls[0].body.model, 'nano-banana-2-1');
    assert.deepEqual(calls[0].body.input.image_input, [image(1).url]);
    assert.equal(calls[0].body.input.resolution, resolution);
    assert.equal(calls[0].body.input.output_format, 'png');
    assert.equal(calls[0].body.input.thinking_level, undefined);
    assert.equal(calls[0].body.input.image_urls, undefined);
  }
});

test('invalid models, prompts, enums, reference limits and unsafe inputs never submit a paid task', async () => {
  const { fetcher, calls } = stub(success({ taskId: 'must_not_submit' }));
  for (const value of [
    input('seedance-2-5'), input('seedream-5-lite'), input('seedream-5-pro', '4K'),
    { ...input('seedream-5-pro'), prompt: 'abc' },
    { ...input('seedream-5-5'), prompt: 'abcd' },
    { ...input('nano-banana-2-1'), prompt: ' ' },
    { ...input('seedream-5-5'), prompt: 'x'.repeat(5001) },
    { ...input('nano-banana-2-1'), prompt: 'x'.repeat(20001) },
    { ...input('seedream-5-pro'), aspectRatio: '8:1' },
    input('nano-banana-2-1', '1K', Array.from({ length: 11 }, (_, i) => image(i))),
    input('seedream-5-pro', '1K', [{ kind: 'video', url: 'https://assets.example.com/clip.mp4' }]),
    input('seedream-5-pro', '1K', [{ kind: 'image', url: 'http://assets.example.com/x.png' }]),
  ]) await rejectsSafely(submitKie(value, KEY, fetcher), 'invalid_input');
  assert.equal(calls.length, 0);
});

test('both HTTP errors and HTTP200 application errors are sanitized, without automatic POST retry', async () => {
  for (const [body, status] of [[{ code: 402, msg: `${KEY} upstream-secret` }, 200], [{ code: 200 }, 500]]) {
    const { fetcher, calls } = stub(body, status);
    await rejectsSafely(submitKie(input('seedream-5-pro'), KEY, fetcher), 'provider_rejected');
    assert.equal(calls.length, 1);
  }
  await rejectsSafely(submitKie(input('seedream-5-pro'), KEY, async () => { throw new Error(`${KEY} upstream-secret`); }), 'provider_network');
});

test('submission timeout aborts one request and never resubmits', async () => {
  const original = globalThis.setTimeout;
  let calls = 0;
  globalThis.setTimeout = (callback, milliseconds, ...args) => {
    assert.equal(milliseconds, 30000);
    return original(callback, 1, ...args);
  };
  try {
    const fetcher = async (_url, options) => {
      calls++;
      return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('upstream-secret', 'AbortError')), { once: true }));
    };
    await rejectsSafely(submitKie(input('seedream-5-pro'), KEY, fetcher), 'provider_timeout');
    assert.equal(calls, 1);
  } finally { globalThis.setTimeout = original; }
});

test('poll maps only documented asynchronous states and hides upstream failure text', async () => {
  for (const [state, expected] of [['waiting', 'queued'], ['queuing', 'queued'], ['generating', 'running'], ['fail', 'failed']]) {
    const { fetcher, calls } = stub(success({ state, failMsg: `${KEY} upstream-secret` }));
    const result = await pollKie('task_123', KEY, fetcher);
    assert.equal(result.state, expected);
    assert.deepEqual(result.outputs, []);
    assert.equal(JSON.stringify(result).includes(KEY), false);
    assert.equal(calls[0].options.method, 'GET');
    assert.equal(calls[0].url, 'https://api.kie.ai/api/v1/jobs/recordInfo?taskId=task_123');
  }
  await rejectsSafely(pollKie('task_123', KEY, stub(success({ state: 'completed' })).fetcher), 'invalid_response');
  const { fetcher, calls } = stub(success({ state: 'waiting' }));
  await rejectsSafely(pollKie('task&key=leak', KEY, fetcher), 'invalid_input');
  assert.equal(calls.length, 0);
});

test('completed image returns only validated output and normalized actual credit cost', async () => {
  const { fetcher } = stub(success({ state: 'success', resultJson: JSON.stringify({ resultUrls: ['https://tempfile.aiquickdraw.com/x.png#ignored'] }), creditsConsumed: 3.6 }));
  assert.deepEqual(await pollKie('task_success', KEY, fetcher), {
    state: 'succeeded', outputs: [{ url: 'https://tempfile.aiquickdraw.com/x.png', kind: 'image' }], actualCost: { amount: 0.018, currency: 'USD' },
  });
});

test('malformed or unsafe completed outputs and malformed task IDs never become success', async () => {
  for (const url of ['http://cdn.example.com/x.png', 'https://localhost/x.png', 'https://localhost./x.png', 'https://127.0.0.1/x.png', 'https://2130706433/x.png', 'https://[::1]/x.png', 'https://metadata.google.internal/x.png', 'https://user:pass@cdn.example.com/x.png', 'https://cdn.example.com:8443/x.png', `https://cdn.example.com/${KEY}.png`]) {
    await rejectsSafely(pollKie('task_safe', KEY, stub(success({ state: 'success', resultJson: JSON.stringify({ resultUrls: [url] }) })).fetcher), 'invalid_response');
  }
  for (const resultJson of ['', 'broken', '{}', '{"resultUrls":[]}', '{"resultUrls":["https://cdn.example.com/a.png","https://cdn.example.com/b.png"]}']) {
    await rejectsSafely(pollKie('task_safe', KEY, stub(success({ state: 'success', resultJson })).fetcher), 'invalid_response');
  }
  for (const taskId of ['', 'unsafe?task=1', KEY]) await rejectsSafely(submitKie(input('seedream-5-pro'), KEY, stub(success({ taskId })).fetcher), 'invalid_response');
});

test('browser execution and missing keys are rejected before any fetch', async () => {
  const { fetcher, calls } = stub(success({ taskId: 'nope' }));
  for (const key of ['', '\nsecret']) await rejectsSafely(submitKie(input('seedream-5-pro'), key, fetcher), 'provider_unavailable');
  globalThis.window = {};
  try { await rejectsSafely(submitKie(input('seedream-5-pro'), KEY, fetcher), 'provider_unavailable'); }
  finally { delete globalThis.window; }
  assert.equal(calls.length, 0);
});
