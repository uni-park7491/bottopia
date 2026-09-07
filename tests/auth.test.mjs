import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callbackOrigin, safeReturnPath, isSiteOwner } from '../lib/auth-policy.ts';
import { authProviders, oauthOptions } from '../lib/auth-providers.ts';

for (const path of ['/', '/studio', '/?tab=archive#work', '/작품', '/studio?draft=1']) {
  test(`return path allows ${path}`, () => assert.equal(safeReturnPath(path), path));
}
for (const path of [undefined, '', 'https://evil.example', '//evil.example', '/\\evil.example', '/%5cevil.example', '/%2fevil.example', '/%252fevil.example', '/%0a/evil.example', '/\n/evil.example', '/%ZZ', '/login', '/auth/callback', '/studio/../auth/callback', '/'.repeat(2049)]) {
  test(`return path rejects ${JSON.stringify(path)?.slice(0, 70)}`, () => assert.equal(safeReturnPath(path), '/'));
}
const user = { id: 'member-1', email: 'owner@example.com', email_confirmed_at: '2026-08-30T00:00:00Z' };
test('local callback preserves 127.0.0.1 instead of Next normalized localhost', () => {
  assert.equal(callbackOrigin('http://localhost:3000/auth/callback', '127.0.0.1:3000', undefined, false), 'http://127.0.0.1:3000');
});
test('local callback rejects forged external host', () => {
  assert.equal(callbackOrigin('http://localhost:3000/auth/callback', 'evil.example', undefined, false), null);
  assert.equal(callbackOrigin('http://localhost:3000/auth/callback', 'evil@localhost:3000', undefined, false), null);
});
test('production callback uses only configured HTTPS origin', () => {
  assert.equal(callbackOrigin('http://internal:3000/auth/callback', 'evil.example', 'https://bottopia.example/', true), 'https://bottopia.example');
});
test('missing or invalid production site URL fails closed', () => {
  for (const value of [undefined, 'bad', 'http://example.com', 'https://secret@example.com']) assert.equal(callbackOrigin('http://localhost:3000/', null, value, true), null);
});
test('no configuration or user never grants owner access', () => {
  assert.equal(isSiteOwner(null), false);
  assert.equal(isSiteOwner({ id: 'email-less' }), false);
  assert.equal(isSiteOwner(user, '', ''), false);
  assert.equal(isSiteOwner(user, undefined, undefined), false);
});
test('unverified/missing email never matches owner email', () => {
  assert.equal(isSiteOwner({ id: 'member-1', email: user.email }, '', user.email), false);
  assert.equal(isSiteOwner({ id: 'member-1' }, '', user.email), false);
});
test('confirmed owner email matches normalized configured email', () => {
  assert.equal(isSiteOwner(user, '', ' Owner@Example.com '), true);
  assert.equal(isSiteOwner(user, '', 'different@example.com'), false);
});
test('immutable owner ID takes priority even for email-less users', () => {
  assert.equal(isSiteOwner({ id: 'member-1' }, 'member-1'), true);
  assert.equal(isSiteOwner(user, 'someone-else', user.email), false);
});
test('provider ordering and Naver OIDC identifier', () => {
  assert.deepEqual(authProviders.map(p => p.provider), ['google', 'custom:naver', 'kakao']);
});
for (const provider of authProviders) {
  test(`${provider.id} OAuth preserves return page and locale`, () => {
    const payload = oauthOptions(provider, 'http://127.0.0.1:3000', '/studio?draft=1', 'ja');
    assert.equal(payload.provider, provider.provider);
    const callback = new URL(payload.options.redirectTo);
    assert.equal(callback.origin, 'http://127.0.0.1:3000');
    assert.equal(callback.pathname, '/auth/callback');
    assert.equal(callback.searchParams.get('next'), '/studio?draft=1');
    assert.equal(callback.searchParams.get('lang'), 'ja');
    assert.deepEqual(payload.options.queryParams, provider.id === 'google' ? { prompt: 'select_account' } : undefined);
  });
}
