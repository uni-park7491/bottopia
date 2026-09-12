import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('drop input keeps native form behavior and accessible validation', () => {
  const source = read('app/components/FileDropInput.tsx');
  for (const expected of ['onDrop=', 'event.preventDefault()', 'input.current.files = transfer.files', 'setCustomValidity', "addEventListener('reset'", 'files.length !== 1', 'aria-describedby', 'disabled={disabled}']) assert.ok(source.includes(expected), expected);
});
test('avatar, artwork and cover all use the shared file drop input', () => {
  assert.ok(read('app/components/AvatarUploader.tsx').includes('<FileDropInput'));
  assert.equal((read('app/studio/StudioUploader.tsx').match(/<FileDropInput/g) || []).length, 2);
});
test('role badges are presentation only, not verified status or role grants', () => {
  const badge = read('app/components/CreatorBadge.tsx');
  assert.ok(badge.includes('등급이나 본인 인증 표시는 아닙니다.'));
  assert.ok(!badge.includes('fetch('));
  for (const file of ['app/profile/ProfileEditor.tsx', 'app/creators/CreatorsDirectory.tsx', 'app/creators/[handle]/CreatorProfile.tsx']) assert.ok(read(file).includes('<CreatorBadge role='));
});
