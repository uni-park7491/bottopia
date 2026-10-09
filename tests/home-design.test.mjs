import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('candidate one uses a real lightweight mascot and preserves navigation targets', () => {
  const hero = readFileSync(new URL('../app/components/HomeHero.tsx', import.meta.url), 'utf8');
  assert.match(hero, /상상을 영상으로\./);
  for (const target of ['#work', '/tools', '/community']) assert.ok(hero.includes(`href="${target}"`));
  assert.match(hero, /width=\{900\} height=\{900\}/);
  assert.match(hero, /preload/);
  assert.ok(readFileSync(new URL('../public/bottopia-mascot.webp', import.meta.url)).length < 150_000);
  assert.doesNotMatch(hero, /<video|<canvas/);
});

test('home stylesheet includes mobile, dark theme and reduced-motion variants', () => {
  const css = readFileSync(new URL('../app/home-design.css', import.meta.url), 'utf8');
  assert.match(css, /max-width:700px/);
  assert.match(css, /max-width:380px/);
  assert.match(css, /data-theme="dark"/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /grid-template-columns: 1fr/);
});
