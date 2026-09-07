// Run against the unconfigured local preview only; never touches a live backend.
import assert from 'node:assert/strict';
const base = new URL(process.env.SMOKE_URL || 'http://127.0.0.1:3000');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname), 'Local preview only');
let passed = 0;
const read = async (path, options) => fetch(new URL(path, base), options);
const archive = await read('/api/works');
assert.equal(archive.status, 200);
assert.deepEqual(await archive.json(), { works: [], configured: false }, 'Use an unconfigured preview, not a live project');
passed++;
for (const [path, expected] of [
  ['/', 'WORLDS'], ['/login', '네이버로 계속하기'],
  ['/login?lang=en', 'Continue with Kakao'], ['/login?lang=zh', '使用 NAVER 继续'],
  ['/login?lang=ja', 'Googleで続ける'], ['/studio', '영상 업로드는 로그인한 BOTTOPIA 운영자만'],
  ['/login?error=oauth', '로그인이 취소되었거나 완료되지 않았어요.'],
]) {
  const response = await read(path);
  assert.equal(response.status, 200, path);
  assert.ok((await response.text()).includes(expected), path);
  passed++;
}
const home = await read('/', { redirect: 'manual' });
assert.equal(home.status, 200, 'Home must not redirect to login');
assert.equal(home.headers.get('location'), null);
const homeHtml = await home.text();
assert.ok(homeHtml.includes('portfolio-hero'), 'Public portfolio is the initial page');
assert.ok(!homeHtml.includes('class="social-auth"'), 'No sign-up form before a participation action');
assert.ok(homeHtml.includes('작품 업로드 ↗'), 'Upload is an explicit action');
passed++;
const studio = await read('/studio', { redirect: 'manual' });
assert.equal(studio.status, 307, 'Upload requires sign-in');
assert.equal(new URL(studio.headers.get('location'), base).searchParams.get('next'), '/studio');
passed++;
for (const path of ['/auth/callback', '/auth/callback?code=invalid', '/auth/callback?error=access_denied&next=%2Fstudio&lang=ja', '/auth/callback?code=x&next=%2F%5Cevil.example']) {
  const response = await read(path, { redirect: 'manual' });
  assert.equal(response.status, 307, path);
  const target = new URL(response.headers.get('location'));
  assert.equal(target.origin, base.origin);
  assert.equal(target.pathname, '/login');
  assert.equal(target.searchParams.get('error'), 'setup');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  if (path.includes('evil')) assert.equal(target.searchParams.get('next'), '/');
  passed++;
}
const id = '00000000-0000-4000-8000-000000000001';
for (const [path, method, status] of [
  ['/api/works', 'POST', 401], ['/api/studio/upload-url', 'POST', 401],
  ['/api/inquiries', 'GET', 401],
  [`/api/works/${id}`, 'DELETE', 401], [`/api/works/${id}/community`, 'POST', 401],
  [`/api/works/${id}/community`, 'DELETE', 401], [`/api/works/${id}/copy`, 'POST', 503],
]) {
  const response = await read(path, { method });
  assert.equal(response.status, status, `${method} ${path}`);
  passed++;
}
console.log(`${passed} local HTTP checks passed (no external credentials or data).`);
