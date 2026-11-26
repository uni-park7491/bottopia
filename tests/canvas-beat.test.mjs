import test from 'node:test';
import assert from 'node:assert/strict';
import { submitBeat, pollBeat } from '../lib/canvas/beat-provider.ts';
import { submitOpenSand, pollOpenSand } from '../lib/canvas/opensand-provider.ts';

const input = { operationId: 'operation-test', modelId: 'seedance-2-5', prompt: 'Cinematic lighting with soft ambient sound.', aspectRatio: '16:9', resolution: '1080p', durationSeconds: 10, generateAudio: true, references: [{ kind: 'image', url: 'https://owned.example.com/a.png' }, { kind: 'video', url: 'https://owned.example.com/b.mp4', durationSeconds: 5 }, { kind: 'audio', url: 'https://owned.example.com/c.mp3', durationSeconds: 5 }] };
test('Beat uses exact standard model, one POST, scoped idempotency and native audio with multimodal arrays', async () => {
  const requests = [];
  const fetcher = async (url, options) => { requests.push({ url, options }); return Response.json({ data: { id: 'task_ok', poll_after_seconds: 8 } }, { status: 201 }); };
  assert.deepEqual(await submitBeat(input, 'test-key', fetcher), { taskId: 'task_ok', pollAfterSeconds: 8 });
  assert.equal(requests.length, 1); assert.equal(requests[0].url, 'https://api.beatapi.io/v1/videos/tasks');
  const body = JSON.parse(requests[0].options.body);
  assert.equal(body.model, 'seedance-2.5'); assert.equal(body.generate_audio, true); assert.equal(body.output_format, 'mp4'); assert.equal(body.task_type, 'reference');
  assert.deepEqual(body.reference_images, ['https://owned.example.com/a.png']); assert.deepEqual(body.reference_videos, ['https://owned.example.com/b.mp4']); assert.deepEqual(body.reference_audios, ['https://owned.example.com/c.mp3']); assert.equal(requests[0].options.headers['Idempotency-Key'], 'canvas-operation-test');
});
test('Beat timeout or malformed successful response never resubmits and hides raw upstream details', async () => {
  let count = 0;
  await assert.rejects(submitBeat(input, 'private-test-key', async () => { count++; throw new Error('private-test-key'); }), error => error.code === 'provider_timeout' && !error.message.includes('private-test-key'));
  assert.equal(count, 1);
  await assert.rejects(submitBeat(input, 'private-test-key', async () => Response.json({ data: { id: 'https://127.0.0.1' } })), error => error.code === 'invalid_response');
});
test('Beat maps queued/running/failure and parses successful output and settled cost', async () => {
  for (const [status, expected] of [['queued', 'queued'], ['processing', 'running'], ['failed', 'failed']]) {
    const value = await pollBeat('task_ok', 'test-key', async () => Response.json({ data: { status, error_message: 'private raw details' } }));
    assert.equal(value.state, expected); assert.deepEqual(value.outputs, []); assert.ok(!JSON.stringify(value).includes('private raw details'));
  }
  const value = await pollBeat('task_ok', 'test-key', async () => Response.json({ data: { status: 'succeeded', output: { media: [{ type: 'video', url: 'https://cdn.example.com/out.mp4', mime_type: 'video/mp4' }] }, usage: { credits_settled: 1.9 } } }));
  assert.equal(value.outputs[0].kind, 'video'); assert.deepEqual(value.actualCost, { amount: 1.9, currency: 'USD' });
  await assert.rejects(pollBeat('../private', 'test-key'), error => error.code === 'invalid_input');
});

test('unverified exact OpenSand contract cannot submit or poll even when called outside the route guard', async () => {
  let calls = 0; const fetcher = async () => { calls++; throw new Error('must not call'); };
  await assert.rejects(submitOpenSand(input, 'present-key', fetcher), error => error.status === 503 && error.code === 'provider_contract_pending');
  await assert.rejects(pollOpenSand('task', 'present-key', fetcher), error => error.status === 503 && error.code === 'provider_contract_pending');
  assert.equal(calls, 0);
});
