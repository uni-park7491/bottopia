import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newScene, parseSceneFile, sceneDocument } from '../lib/creative-tools.ts';
import { emptySheet, parseSheet } from '../app/tools/character-canvas.ts';

test('scene document keeps order and only uses provided details', () => {
  const first = { ...newScene('a'), subject: '로봇', action: '퇴근한다' };
  const second = { ...newScene('b'), setting: '서울', duration: 10 };
  const text = sceneDocument('퇴근', [second, first]);
  assert.ok(text.indexOf('서울') < text.indexOf('로봇'));
  assert.match(text, /SCENE 01 · 10s/);
  assert.doesNotMatch(text, /조명 \/ 분위기:/);
  assert.deepEqual(parseSceneFile(JSON.parse(JSON.stringify({ format: 'bottopia-scenes-v1', title: '퇴근', scenes: [first] }))).scenes[0].subject, '로봇');
});
test('scene import rejects malformed fields, oversized lists and invalid timing', () => {
  const base = { format: 'bottopia-scenes-v1', title: '', scenes: [newScene('a')] };
  for (const value of [null, {}, { ...base, scenes: [] }, { ...base, scenes: Array(25).fill(newScene('a')) }, { ...base, scenes: [{ ...newScene('a'), duration: -1 }] }, { ...base, scenes: [{ ...newScene('a'), action: {} }] }]) assert.throws(() => parseSceneFile(value));
});
test('character projects round-trip and cannot load remote images or SVG', () => {
  const base = { format: 'bottopia-character-v1', ...emptySheet(), name: '봇' };
  assert.equal(parseSheet(JSON.parse(JSON.stringify(base))).name, '봇');
  for (const src of ['https://example.com/tracking.png', 'javascript:alert(1)', 'data:image/svg+xml,<svg/>']) assert.throws(() => parseSheet({ ...base, images: [src, '', '', ''] }));
  assert.throws(() => parseSheet({ ...base, colors: ['red', 'blue', 'white'] }));
});
test('legacy manual editors introduce no API, cloud persistence or key entry', () => {
  for (const path of ['CreativeTools.tsx', 'LegacyCharacterSheet.tsx', 'character-canvas.ts', 'download.ts']) {
    const source = readFileSync(new URL(`../app/tools/${path}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|supabase|localStorage|sessionStorage/);
  }
});
