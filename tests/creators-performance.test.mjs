import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('directory shell can be prerendered and preloads its public API', () => {
  const page = read('app/creators/page.tsx');
  assert.doesNotMatch(page, /force-dynamic/);
  assert.match(page, /rel="preload" href="\/api\/creators"/);
});
test('directory caching remains limited to approved public profiles and published counts', () => {
  const api = read('app/api/creators/route.ts');
  assert.match(api, /creator_status.eq.APPROVED/);
  assert.match(api, /neq\('creator_status', 'SUSPENDED'\)/);
  assert.match(api, /eq\('published', true\)/);
  assert.match(api, /toPublicCreator\(profile\)/);
  assert.match(api, /s-maxage=15, stale-while-revalidate=30/);
  assert.doesNotMatch(api, /await profileColumns/);
  assert.match(api, /if \(works.error\).*status: 503/);
});
test('directory requests are bounded and retryable', () => {
  const ui = read('app/creators/CreatorsDirectory.tsx');
  assert.match(ui, /response.ok/);
  assert.match(ui, /controller.abort\(\), 15000/);
  assert.match(ui, /setRetry\(value => value \+ 1\)/);
});
