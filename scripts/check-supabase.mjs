// Read-only integration checks. Never print credentials or create sample works/users.
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

nextEnv.loadEnvConfig(process.cwd());
const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(projectUrl && publicKey && serverKey, 'Supabase configuration is required');
const site = new URL(process.env.NEXT_PUBLIC_SITE_URL);
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(site.hostname), 'Only run this check against a local site');
const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(15000) }) },
};
const admin = createClient(projectUrl, serverKey, clientOptions);
const visitor = createClient(projectUrl, publicKey, clientOptions);
let passed = 0;
let failed = 0;
async function check(name, action) {
  try { await action(); passed++; console.log(`PASS ${name}`); }
  catch { failed++; console.error(`FAIL ${name} (credentials and response details withheld)`); }
}

for (const [table, field] of [['works', 'id'], ['work_comments', 'id'], ['work_reactions', 'work_id']]) {
  await check(`server can read ${table}`, async () => {
    const result = await admin.from(table).select(field, { head: true, count: 'exact' });
    assert.equal(result.error, null);
    assert.equal(typeof result.count, 'number');
  });
  await check(`visitor cannot read raw ${table}`, async () => {
    const result = await visitor.from(table).select(field).limit(1);
    assert.ok(result.error);
    assert.ok([401, 403].includes(result.status));
  });
}
await check('works storage is private and limited to 50MB', async () => {
  const result = await admin.storage.getBucket('works');
  assert.equal(result.error, null);
  assert.equal(result.data.public, false);
  assert.equal(result.data.file_size_limit, 50 * 1024 * 1024);
});

const request = (path, options = {}) => fetch(new URL(path, site), {
  ...options, redirect: 'manual', signal: AbortSignal.timeout(15000),
});
await check('home is public', async () => assert.equal((await request('/')).status, 200));
await check('public works API is connected', async () => {
  const response = await request('/api/works');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.configured, true);
  assert.ok(Array.isArray(body.works));
  for (const work of body.works) {
    assert.equal(work.published, true);
    assert.equal('owner_email' in work, false);
  }
});
await check('studio requires login and preserves return destination', async () => {
  const response = await request('/studio');
  assert.ok([302, 303, 307].includes(response.status));
  const destination = new URL(response.headers.get('location'), site);
  assert.equal(destination.pathname, '/login');
  assert.equal(destination.searchParams.get('next'), '/studio');
});
for (const path of ['/api/studio/upload-url', '/api/works', '/api/works/00000000-0000-0000-0000-000000000000/community']) {
  await check(`anonymous POST blocked at ${path}`, async () => {
    const response = await request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 401);
  });
}
await check('owner library is not public', async () => assert.equal((await request('/api/works?scope=all')).status, 401));
await check('unknown video does not receive a playback URL', async () => {
  const response = await request('/api/works/00000000-0000-0000-0000-000000000000/media?kind=video');
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('location'), null);
});
await check('configuration file is owner-readable only', async () => {
  const file = await stat('.env.local');
  assert.equal(file.mode & 0o077, 0);
});
await check('server key is absent from browser JavaScript', async () => {
  let checked = 0;
  async function scan(path) {
    const entries = await readdir(path, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) await scan(file);
      else if (entry.name.endsWith('.js')) {
        assert.equal((await readFile(file, 'utf8')).includes(serverKey), false);
        checked++;
      }
    }
  }
  await scan('.next/static');
  await scan('.next/dev/static');
  assert.ok(checked > 0, 'Generate a client build before checking');
});
console.log(`Integration results: ${passed} passed, ${failed} failed. No sample data created.`);
process.exitCode = failed ? 1 : 0;
