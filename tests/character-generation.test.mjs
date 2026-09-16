import test from 'node:test';
import assert from 'node:assert/strict';
import { characterPrompt, localCharacterRequestAllowed } from '../lib/character-generation.ts';
test('character output is one borderless artwork, not slots or a collage', () => {
  const prompt = characterPrompt('A clockwork gardener', false);
  for (const phrase of ['ONE finished', 'NO grid', 'NO panels', 'Extreme close-up', 'rear full-body', 'clockwork gardener']) assert.ok(prompt.includes(phrase));
});
test('reference identity is explicit and empty description is allowed only with a photo', () => {
  assert.match(characterPrompt('', true), /strict identity anchor/);
  assert.throws(() => characterPrompt('', false));
  assert.throws(() => characterPrompt('x'.repeat(1501), true));
});
test('local execution rejects production and cross-site requests', () => {
  assert.equal(localCharacterRequestAllowed('http://127.0.0.1:3001/api', 'http://127.0.0.1:3001', true), true);
  for (const [url, origin, dev] of [
    ['https://bottopia.studio/api', 'https://bottopia.studio', true],
    ['http://127.0.0.1:3001/api', 'https://evil.example', true],
    ['http://127.0.0.1:3001/api', null, true],
    ['http://127.0.0.1:3001/api', 'http://127.0.0.1:3001', false],
  ]) assert.equal(localCharacterRequestAllowed(url, origin, dev), false);
});
test('Next localhost normalization accepts only the original loopback host and port', () => {
  const url = 'http://localhost:3001/api/tools/character';
  assert.equal(localCharacterRequestAllowed(url, 'http://127.0.0.1:3001', true, '127.0.0.1:3001'), true);
  for (const [origin, host] of [
    ['http://127.0.0.1:3002', '127.0.0.1:3002'],
    ['https://evil.example', 'evil.example'],
    ['http://127.0.0.1:3001', 'localhost:3001'],
    ['http://localhost:3001', 'user@localhost:3001'],
  ]) assert.equal(localCharacterRequestAllowed(url, origin, true, host), false);
});
