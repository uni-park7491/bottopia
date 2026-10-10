import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const about = readFileSync(new URL('../app/components/AboutPage.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../app/components/AboutPage.module.css', import.meta.url), 'utf8');

test('about explains the product and retains working enquiry and legacy anchors', () => {
  assert.match(page, /<AboutPage locale=\{locale\} onInquiry=/);
  assert.doesNotMatch(page, /orbit-system|trackBotEyes|activePlanet/);
  assert.match(about, /<h1 id="about-title"/);
  assert.match(about, /id="lab"/);
  assert.match(about, /id="contact"/);
  assert.match(about, /onClick=\{onInquiry\}/);
  assert.match(about, /href=\{operatorMailto\}/);
  assert.match(about, /const destinations = \['\/', '\/tools', '\/community'\]/);
});

test('about is localized, theme aware, keyboard accessible and mobile responsive', () => {
  for (const locale of ['ko','en','zh','ja']) assert.match(about, new RegExp(`${locale}: \\{`));
  assert.match(styles, /var\(--site-text\)/);
  assert.match(styles, /var\(--site-muted\)/);
  assert.match(styles, /focus-visible/);
  assert.match(styles, /max-width:1160px/);
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.match(styles, /grid-template-columns:1fr/);
});
