import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { localCharacterRequestAllowed } from '../lib/character-generation.ts';

// Execute the actual route logic with authentication and inference isolated.
const source = readFileSync(new URL('../app/api/tools/character/route.ts', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '').replace(/export /g, '')
  .replace("process.env.NODE_ENV === 'development'", 'true');
const js = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext });
function fixture({ user = { id: 'member-a' }, failure = '', job } = {}) {
  const calls = [];
  const routes = new Function('getCurrentUser', 'characterEngineAvailable', 'getCharacterJob', 'startCharacterJob', 'localCharacterRequestAllowed', `${js}; return {GET,POST};`)(
    async () => user, async () => true,
    (id, owner) => job?.owner === owner && job.id === id ? job : undefined,
    async (...args) => { calls.push(args); if (failure) throw new Error(failure); return 'test-job'; }, localCharacterRequestAllowed);
  return { ...routes, calls };
}
const request = (body, origin = 'http://127.0.0.1:3001') => new Request('http://127.0.0.1:3001/api/tools/character', {
  method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body),
});
test('anonymous and cross-site callers cannot start inference', async () => {
  const anonymous = fixture({ user: null });
  assert.equal((await anonymous.POST(request({ description: 'robot' }))).status, 401);
  assert.equal(anonymous.calls.length, 0);
  const f = fixture();
  assert.equal((await f.POST(request({ description: 'robot' }, 'https://evil.example'))).status, 403);
  assert.equal(f.calls.length, 0);
});
test('malformed and oversized inputs never reach the engine', async () => {
  const f = fixture();
  for (const input of ['{', null, {}, { description: '' }, { description: 'x'.repeat(1501) }, { description: 'robot', image: 'https://evil.example/x.png' }, { description: 'robot', image: 'data:image/svg+xml;base64,AAAA' }]) {
    assert.equal((await f.POST(request(input))).status, 400);
  }
  assert.equal((await f.POST(request('x'.repeat(8000001)))).status, 413);
  assert.equal(f.calls.length, 0);
});
test('accepted generation is owned by the authenticated user, not submitted owner', async () => {
  const f = fixture();
  const response = await f.POST(request({ description: 'robot', owner: 'forged' }));
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { id: 'test-job' });
  assert.equal(f.calls[0][0], 'member-a');
});
test('realistic Next normalized URL does not reject a valid local browser', async () => {
  const f = fixture();
  const response = await f.POST(new Request('http://localhost:3001/api/tools/character', {
    method: 'POST', headers: { host: '127.0.0.1:3001', origin: 'http://127.0.0.1:3001', 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: 'dragon' }),
  }));
  assert.equal(response.status, 202);
  assert.equal(f.calls.length, 1);
});
test('other members cannot read the result; PNG results are private and not cached', async () => {
  const job = { id: 'j1', owner: 'member-b', state: 'done', image: Buffer.from('fixture') };
  const url = new Request('http://127.0.0.1:3001/api/tools/character?id=j1&image=1');
  assert.equal((await fixture({ job }).GET(url)).status, 404);
  const response = await fixture({ job, user: { id: 'member-b' } }).GET(url);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'image/png');
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
});
test('busy and unavailable engines return actionable errors without exposing internals', async () => {
  for (const [failure, status] of [['ENGINE_BUSY', 409], ['ENGINE_UNAVAILABLE', 503], ['private-path-secret', 400]]) {
    const response = await fixture({ failure }).POST(request({ description: 'robot' }));
    assert.equal(response.status, status);
    assert.doesNotMatch(await response.text(), /private-path-secret/);
  }
});
