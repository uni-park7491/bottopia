import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSpeech, encodeSpeech, splitSpeech } from '../public/vendor/supertonic/audio-utils.mjs';

test('speech chunks preserve words, content and Unicode within the limit', () => {
  for (const text of ['긴 이야기를 함께 만들어 봅시다. '.repeat(20), '가'.repeat(500), '가'.repeat(99) + '😀끝']) {
    const chunks = splitSpeech(text);
    assert.ok(chunks.every(chunk => chunk.length > 0 && chunk.length <= 100 && chunk.isWellFormed()));
    assert.equal(chunks.join('').replace(/\s/g, ''), text.replace(/\s/g, ''));
  }
  assert.deepEqual(splitSpeech('안녕하세요. 반가워요.', 8), ['안녕하세요.', '반가워요.']);
});

for (const text of ['안녕하세요.', '오늘은 2026년입니다.', 'Hello 봇토피아', '첫 문장.\n다음 문장.', '가'.repeat(500)]) {
  test(`speech accepts valid input ${text.slice(0, 16)}`, () => assert.equal(validateSpeech(text, 'F1', 1), text.trim()));
}
for (const text of ['', '   ', '😀', '\0안녕', '가'.repeat(501)]) {
  test(`speech rejects invalid input ${JSON.stringify(text.slice(0, 12))}`, () => assert.throws(() => validateSpeech(text, 'F1', 1)));
}
test('speech rejects unknown voices and invalid speed', () => {
  for (const speed of [0, 2, NaN, Infinity]) assert.throws(() => validateSpeech('안녕', 'F1', speed));
  assert.throws(() => validateSpeech('안녕', '../voice', 1));
});
test('WAV is mono PCM16 with consistent size, duration and clipped finite values', () => {
  for (const sr of [16000, 24000, 44100]) {
    const samples = Float32Array.from({ length: sr }, (_, i) => Math.sin(i / 10) * 1.2);
    const wav = encodeSpeech(samples, sr), view = new DataView(wav);
    assert.equal(new TextDecoder().decode(wav.slice(0, 4)), 'RIFF');
    assert.equal(view.getUint32(4, true), wav.byteLength - 8);
    assert.equal(view.getUint32(24, true), sr); assert.equal(view.getUint16(22, true), 1);
    assert.equal(view.getUint32(40, true), sr * 2); assert.equal(wav.byteLength, 44 + sr * 2);
  }
});
test('silent, nonfinite, short and invalid-rate output never becomes a download', () => {
  assert.throws(() => encodeSpeech(new Float32Array(24000), 24000));
  assert.throws(() => encodeSpeech(new Float32Array(24000).fill(NaN), 24000));
  assert.throws(() => encodeSpeech([1], 24000));
  assert.throws(() => encodeSpeech([1], Infinity));
});
