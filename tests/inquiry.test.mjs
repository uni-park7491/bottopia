import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseInquiry } from '../lib/inquiry-policy.ts';

test('project inquiry accepts the public contact workflow', () => {
  const result = parseInquiry({ name: 'Studio A', contact: 'hello@example.com', projectType: 'AI FILM', timelineBudget: 'Q4', brief: 'We want to build a cinematic world.', locale: 'en' });
  assert.equal(result.error, undefined);
  assert.equal(result.data?.projectType, 'AI FILM');
});

test('project inquiry rejects bots and incomplete submissions', () => {
  assert.ok(parseInquiry(null).error);
  assert.ok(parseInquiry({ name: 'A', contact: 'x', brief: 'short' }).error);
  assert.ok(parseInquiry({ name: 'Studio', contact: 'hello@example.com', brief: 'A complete project brief', website: 'spam.example' }).error);
});

test('inquiries remain private and owner-readable through the server API', () => {
  const sql = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  const route = readFileSync(new URL('../app/api/inquiries/route.ts', import.meta.url), 'utf8');
  assert.match(sql, /alter table public\.project_inquiries enable row level security/);
  assert.match(sql, /revoke all on public\.profiles, public\.works, public\.work_reactions, public\.work_comments, public\.project_inquiries from anon, authenticated/);
  assert.match(route, /if \(!\(await getOwnerUser\(\)\)\).*401/);
  assert.match(route, /parseInquiry/);
});

test('portfolio exposes a shareable full project route', () => {
  const archive = readFileSync(new URL('../app/components/CreatorArchive.tsx', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../app/works/[id]/page.tsx', import.meta.url), 'utf8');
  assert.match(archive, /href=\{`\/works\/\$\{featured\.id\}`\}/);
  assert.match(page, /<WorkDetail id=\{id\}/);
});
