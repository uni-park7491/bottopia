import test from 'node:test';
import assert from 'node:assert/strict';
import { ttsModels, filterTtsModels } from '../app/tools/tts-models.ts';
test('catalog preserves all 17 requested families and three Qwen variants', () => {
  assert.equal(new Set(ttsModels.map(m => m.family)).size, 17);
  assert.equal(new Set(ttsModels.map(m => m.id)).size, ttsModels.length);
  assert.equal(ttsModels.filter(m => m.family === 'qwen').length, 3);
  for (const model of ttsModels) {
    for (const field of ['summary','languages','steps','note','source']) assert.ok(model[field]);
    assert.match(model.source, /^https:\/\//);
  }
});
test('only connected adapters are described as executable', () => {
  assert.deepEqual(ttsModels.filter(m => m.engine).map(m => m.id), ['supertonic','qwen','kokoro']);
});
test('search and combined filters never invent matching models', () => {
  assert.equal(filterTtsModels('qwen', 'all', 'all').length, 3);
  assert.ok(filterTtsModels('', 'ko', 'clone').every(m => m.korean && m.uses.includes('clone')));
  assert.equal(filterTtsModels('no-such-model', 'all', 'all').length, 0);
  assert.ok(filterTtsModels('', 'other', 'all').every(m => !m.korean));
});
