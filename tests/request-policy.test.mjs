import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sameSiteMutation, readJsonObject } from '../lib/request-policy.ts';
const req = (body, headers = {}) => new Request('https://bottopia.studio/api/profile', { method:'POST', body, headers: { 'content-type':'application/json', ...headers } });
test('mutation rejects cross-site and foreign/null origins', () => {
  assert.ok(sameSiteMutation(req('{}', {origin:'https://bottopia.studio'})));
  assert.ok(sameSiteMutation(req('{}')));
  for (const origin of ['https://evil.example', 'null', 'https://bottopia.studio.evil.example']) assert.equal(sameSiteMutation(req('{}', {origin})), false);
  assert.equal(sameSiteMutation(req('{}', {'sec-fetch-site':'cross-site'})), false);
});
test('local request preserves the real local host and rejects forged hosts', () => {
  const local = new Request('http://localhost:3001/api/profile', {headers:{host:'127.0.0.1:3001',origin:'http://127.0.0.1:3001'}});
  assert.ok(sameSiteMutation(local));
  assert.equal(sameSiteMutation(new Request('http://localhost:3001/api/profile',{headers:{host:'evil.example:3001',origin:'http://evil.example:3001'}})),false);
});
test('JSON reader rejects oversized, malformed, primitive, array, and wrong MIME bodies', async () => {
  assert.deepEqual(await readJsonObject(req('{"title":"test"}')), {title:'test'});
  for (const body of ['[1]', 'null', 'true', '{']) assert.equal(await readJsonObject(req(body)), null);
  assert.equal(await readJsonObject(req('{}', {'content-type':'text/plain'})), null);
  assert.equal(await readJsonObject(req('{"x":"12345"}'), 5), null);
});
