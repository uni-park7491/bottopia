import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canUploadWork, canManageWork, memberMediaId } from '../lib/upload-policy.ts';

const user = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const work = '33333333-3333-4333-8333-333333333333';
test('creator approval is explicit and missing or suspended profiles fail closed', () => {
  for (const status of [undefined, null, 'PENDING', 'SUSPENDED', 'ADMIN']) assert.equal(canUploadWork(false, status), false);
  assert.equal(canUploadWork(false, 'APPROVED'), true);
  assert.equal(canUploadWork(true, undefined), true);
});
test('members manage only their own works; site owner retains moderation access', () => {
  assert.equal(canManageWork(user, user, false), true);
  assert.equal(canManageWork(user, other, false), false);
  assert.equal(canManageWork(user, null, false), false);
  assert.equal(canManageWork(user, other, true), true);
  assert.equal(canManageWork('', null, true), false);
});
test('member upload paths cannot claim another member, original, avatar or poster', () => {
  const video = `members/${user}/${work}/video.mp4`;
  assert.equal(memberMediaId(video, `members/${user}/${work}/poster.webp`, user), work);
  assert.equal(memberMediaId(video, null, user), work);
  assert.equal(memberMediaId(video, null, other), null);
  assert.equal(memberMediaId(`works/${work}/video.mp4`, null, user), null);
  assert.equal(memberMediaId(video, `members/${other}/${work}/poster.webp`, user), null);
  assert.equal(memberMediaId(video, `members/${user}/${other}/poster.webp`, user), null);
  assert.equal(memberMediaId(`members/${user}/../${work}/video.mp4`, null, user), null);
});
test('write route retains ownership and checks public remix sources without schema fallback', () => {
  const route = readFileSync(new URL('../app/api/works/route.ts', import.meta.url), 'utf8');
  assert.match(route, /memberMediaId\(videoKey, body.posterKey, owner.id\)/);
  assert.doesNotMatch(route, /insert\(baseRecord\)/);
  assert.match(route, /eq\('id', remixOf\).eq\('published', true\)/);
  assert.match(route, /if \(mine\) query = query.eq\('creator_id', user!.id\)/);
  assert.match(route, /access.isOwner && body.workType === 'ORIGINAL'/);
});

test('visibility changes are authenticated, approval-gated and ownership-constrained in the update itself', () => {
  const route = readFileSync(new URL('../app/api/works/[id]/route.ts', import.meta.url), 'utf8');
  const patch = route.slice(route.indexOf('export async function PATCH'), route.indexOf('export async function DELETE'));
  assert.match(patch, /patchWorkVisibility\(request, params, \{ access: getCreatorAccess, guard: guardMutation, admin: createAdminClient \}\)/);
  const implementation = readFileSync(new URL('../lib/work-visibility.ts', import.meta.url), 'utf8');
  assert.match(implementation, /update\(\{ published: body.published \}\).eq\('id', id\)/);
  assert.match(implementation, /if \(!access.isOwner\) query = query.eq\('creator_id', access.user.id\)/);
});

test('public remix attribution never reads private source details; upload defaults to private', () => {
  const route = readFileSync(new URL('../app/api/works/[id]/route.ts', import.meta.url), 'utf8');
  assert.match(route, /eq\('id', data.remix_of\).eq\('published', true\)/);
  const upload = readFileSync(new URL('../app/studio/StudioUploader.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(upload, /name="published"[^>]*defaultChecked/);
  assert.match(upload, /window.confirm\(work.published/);
});
