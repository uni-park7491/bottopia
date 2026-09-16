import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('explore starts its public feed request before hydration and avoids eager detail requests', () => {
  assert.match(source('app/page.tsx'), /rel="preload" href="\/api\/works" as="fetch" crossOrigin="anonymous"/);
  const archive = source('app/components/CreatorArchive.tsx');
  assert.match(archive, /prefetch=\{false\} href=\{`\/works/);
  assert.match(archive, /prefetch=\{false\} className="transmission-creator"/);
});

test('feed loading has a bounded timeout, cleanup, placeholder and retry', () => {
  const archive = source('app/components/CreatorArchive.tsx');
  assert.match(archive, /controller.abort\(\), 15000/);
  assert.match(archive, /window.clearTimeout\(timeout\); controller.abort\(\)/);
  assert.match(archive, /archive-skeleton/);
  assert.match(archive, /setRetry\(value => value \+ 1\)/);
});

test('share CTA overrides legacy underline and zero horizontal padding', () => {
  const css = source('app/refinement.css');
  assert.match(css, /\.discovery-hero \.portfolio-hero-bottom > div > a\.feed-upload \{[^}]*padding: 12px 22px; border: 1px solid/s);
  assert.match(css, /a:focus-visible/);
});
