import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { uploadError, MAX_VIDEO_BYTES, MAX_POSTER_BYTES } from '../lib/upload-policy.ts';

test('Free plan accepts supported videos up to 50MB, never 500MB', () => {
  for (const mime of ['video/mp4', 'video/webm', 'video/quicktime']) {
    assert.equal(uploadError('video', mime, MAX_VIDEO_BYTES), null);
    assert.ok(uploadError('video', mime, MAX_VIDEO_BYTES + 1));
    assert.ok(uploadError('video', mime, 500 * 1024 * 1024));
  }
});
test('poster has a separate 10MB limit', () => {
  for (const mime of ['image/jpeg', 'image/png', 'image/webp', 'image/avif']) {
    assert.equal(uploadError('poster', mime, MAX_POSTER_BYTES), null);
    assert.ok(uploadError('poster', mime, MAX_POSTER_BYTES + 1));
  }
});
test('upload rejects invalid kinds, MIME types and file sizes', () => {
  for (const size of [undefined, null, '100', NaN, Infinity, -1, 0, 0.5])
    assert.ok(uploadError('video', 'video/mp4', size));
  assert.ok(uploadError('other', 'image/png', 100));
  assert.ok(uploadError('video', 'text/html', 100));
  assert.ok(uploadError('poster', 'video/mp4', 100));
});
test('schema keeps raw data and original media private with matching upload limit', () => {
  const sql = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  assert.ok(sql.includes(`'works', 'works', false, ${MAX_VIDEO_BYTES}`));
  assert.match(sql, /revoke all on public\.profiles, public\.works, public\.work_reactions, public\.work_comments, public\.project_inquiries from anon, authenticated/);
  for (const table of ['profiles', 'works', 'work_comments', 'work_reactions'])
    assert.ok(sql.includes(`alter table public.${table} enable row level security`));
  assert.doesNotMatch(sql, /create policy .*public.* for select/i);
});

test('artwork feed previews on hover and exposes prompt copying', () => {
  const archive = readFileSync(new URL('../app/components/CreatorArchive.tsx', import.meta.url), 'utf8');
  const studio = readFileSync(new URL('../app/studio/StudioUploader.tsx', import.meta.url), 'utf8');
  assert.match(archive, /onMouseEnter=\{\(event\) => playPreview\(event\.currentTarget\)\}/);
  assert.match(archive, /onMouseLeave=\{\(event\) => stopPreview\(event\.currentTarget\)\}/);
  assert.doesNotMatch(archive, /muted loop autoPlay playsInline preload="metadata"/);
  assert.match(archive, /className="transmission-prompt"/);
  assert.match(archive, /onClick=\{\(\) => copyPrompt\(work\)\}/);
  assert.match(studio, /<textarea required name="prompt"/);
  assert.match(archive, /className="featured-work"/);
  assert.match(archive, /VIEW FULL PROJECT|프로젝트 전체 보기/);
});
