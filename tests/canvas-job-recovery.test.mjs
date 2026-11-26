import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recoverRequestJob } from '../app/tools/canvas/canvas-job-recovery.ts';

const startedAt = '2026-11-26T00:00:00.000Z';
const fallback = { receipt: '', state: 'failed', startedAt, message: 'local storage failed', assetKeys: ['temporary-new-reference'] };

test('an acknowledged submission survives local-save failure even when polling already completed or failed', () => {
  for (const state of ['queued', 'running', 'succeeded', 'failed']) {
    const confirmed = { receipt: 'accepted-paid-job', state, startedAt, assetKeys: ['accepted-reference'], message: 'provider status' };
    const recovered = recoverRequestJob(confirmed, 'accepted-paid-job', fallback);
    assert.equal(recovered.retained, true);
    assert.equal(recovered.job, confirmed);
    assert.equal(recovered.job.receipt, 'accepted-paid-job');
    assert.equal(recovered.job.state, state);
    assert.deepEqual(recovered.job.assetKeys, ['accepted-reference']);
  }
});

test('a failed new request does not revive an unrelated previous terminal receipt', () => {
  for (const state of ['succeeded', 'failed']) {
    const prior = { receipt: 'old-finished-job', state, startedAt };
    assert.deepEqual(recoverRequestJob(prior, null, fallback), { job: fallback, retained: false });
  }
});

test('an uncertain unacknowledged request keeps its lock and temporary references; an existing active receipt wins', () => {
  const uncertain = { ...fallback, state: 'unknown', message: 'request acceptance unknown' };
  assert.deepEqual(recoverRequestJob(undefined, null, uncertain), { job: uncertain, retained: false });
  const active = { receipt: 'already-polling', state: 'unknown', startedAt };
  assert.equal(recoverRequestJob(active, null, uncertain).job, active);
});
