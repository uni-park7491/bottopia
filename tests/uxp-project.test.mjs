import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { parseProject, wrap, shotText } = createRequire(import.meta.url)('../extensions/photoshop-shot-desk/project.js');
const archive = { format: 'bottopia-story-v1', current: { topic: 'Test', shots: [{ start: 0, duration: 8, visual: '<script>not executed</script>', camera: '고정', audio: '바람' }, { start: 8, duration: 7, visual: '걷는다', camera: '와이드', audio: '발소리' }] } };
test('UXP imports validated shots without interpreting markup or supplied indices', () => {
  const parsed = parseProject(JSON.stringify(archive));
  assert.equal(parsed.duration, 15); assert.equal(parsed.shots[0].index, 1);
  assert.match(shotText(parsed.shots[0]), /<script>not executed<\/script>/);
  assert.equal(wrap('가나다라마바사', 3), '가나다\r라마바\r사');
});
test('UXP rejects unsafe size, timelines and malformed descriptions', () => {
  for (const mutate of [a => a.format = 'other', a => a.current.shots[1].start = 7, a => a.current.shots[0].duration = -1, a => a.current.shots[0].visual = 123, a => a.current.shots = [], a => a.current.shots[0].audio = 'a'.repeat(501)]) {
    const input = structuredClone(archive); mutate(input); assert.throws(() => parseProject(JSON.stringify(input)));
  }
  assert.throws(() => parseProject(' '.repeat(500001)));
});
test('UXP requests only picker file access and no network, shell or clipboard access', () => {
  const manifest = JSON.parse(readFileSync(new URL('../extensions/photoshop-shot-desk/manifest.json', import.meta.url)));
  assert.deepEqual(manifest.requiredPermissions, { localFileSystem: 'request' });
  assert.equal(manifest.host.app, 'PS');
});
