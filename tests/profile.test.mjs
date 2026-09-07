import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { creatorInitials, normalizeHandle, normalizeSocialUrl, validHandle } from '../lib/profile-policy.ts';

test('creator handles normalize to a stable public URL segment', () => {
  assert.equal(normalizeHandle('  BOT Topia__Crew  '), 'bot-topia-crew');
  assert.equal(normalizeHandle('../ADMIN'), 'admin');
  assert.equal(validHandle('bot.topia'), true);
  assert.equal(validHandle('bt'), false);
  assert.equal(validHandle('-bottopia'), false);
  assert.equal(validHandle('bottopia-'), false);
});

test('creator social links accept only safe HTTPS URLs', () => {
  assert.equal(normalizeSocialUrl('instagram.com/bot.topia'), 'https://instagram.com/bot.topia');
  assert.equal(normalizeSocialUrl('http://example.com'), null);
  assert.equal(normalizeSocialUrl('https://user:secret@example.com'), null);
  assert.equal(normalizeSocialUrl('javascript:alert(1)'), null);
  assert.equal(normalizeSocialUrl(''), null);
});

test('creator initials support Korean and Latin display names', () => {
  assert.equal(creatorInitials('BOT TOPIA'), 'BT');
  assert.equal(creatorInitials('박 수영'), '박수');
  assert.equal(creatorInitials(''), 'BT');
});

test('public creator payload omits auth identifiers and moderation state', () => {
  const source = readFileSync(new URL('../lib/profiles.ts', import.meta.url), 'utf8');
  const body = source.match(/export function toPublicCreator[\s\S]+?\n}/)?.[0] ?? '';
  assert.match(body, /handle: profile\.handle/);
  assert.doesNotMatch(body, /id: profile\.id/);
  assert.doesNotMatch(body, /creatorStatus: profile\.creatorStatus/);
});
