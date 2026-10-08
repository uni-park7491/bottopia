import test from 'node:test';
import assert from 'node:assert/strict';
import { optimizedMediaKeys } from '../lib/work-media.ts';
test('derivatives activate only for the exact work-specific completion marker', () => {
  assert.equal(optimizedMediaKeys('a', null), null);
  assert.equal(optimizedMediaKeys('a', 'user/cover.jpg'), null);
  assert.equal(optimizedMediaKeys('a', 'optimized/b/v1/poster.jpg'), null);
  assert.deepEqual(optimizedMediaKeys('a', 'optimized/a/v1/poster.jpg'), { poster: 'optimized/a/v1/poster.jpg', preview: 'optimized/a/v1/preview.mp4', playback: 'optimized/a/v1/playback.mp4' });
});
