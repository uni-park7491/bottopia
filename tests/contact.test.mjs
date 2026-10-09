import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('public inquiry pages use the shared domain address', () => {
  const contact = readFileSync(new URL('../lib/contact.ts', import.meta.url), 'utf8');
  assert.match(contact, /operatorEmail = 'contact@bottopia\.studio'/);
  for (const path of ['app/page.tsx', 'app/privacy/page.tsx', 'app/studio/page.tsx']) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.match(source, /operatorMailto/);
    assert.doesNotMatch(source, /bottopia030@gmail\.com/);
  }
});
