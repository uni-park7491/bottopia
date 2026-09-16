import { test } from 'node:test';
import assert from 'node:assert/strict';
import { narrationOptions } from '../scripts/local-narration.mjs';
test('local narration validates paths, voices and speed without shell command construction', () => {
  assert.equal(narrationOptions(['input.txt','output.wav']).voice, 'Yuna');
  assert.equal(narrationOptions(['my input.txt','my output.wav','Flo (한국어(한국))','180']).rate, 180);
  for (const args of [[], ['a.txt','b.mp3'], ['a.txt','b.wav','Yuna','0'], ['a.txt','b.wav','bad\nvoice'], ['a.txt','b.wav','Yuna','Infinity']]) assert.throws(() => narrationOptions(args));
});
test('open speech engine is explicit and cannot select arbitrary engines or external voices', () => {
  assert.equal(narrationOptions(['a.txt', 'b.wav', 'ko', '160', 'espeak-ng']).engine, 'espeak-ng');
  assert.equal(narrationOptions(['a.txt', 'b.wav']).engine, 'system');
  for (const args of [
    ['a.txt', 'b.wav', 'ko', '160', '/bin/sh'],
    ['a.txt', 'b.wav', 'mb-ko', '160', 'espeak-ng'],
    ['a.txt', 'b.wav', '../ko', '160', 'espeak-ng'],
    ['a.txt', 'b.wav', 'ko', '160', 'espeak-ng', 'extra'],
  ]) assert.throws(() => narrationOptions(args));
});
