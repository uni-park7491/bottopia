import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

test('process bot tracks pointer movement with bounded eye offsets', () => {
  assert.match(page, /onPointerMove=\{trackBotEyes\}/);
  assert.match(page, /Math\.max\(-1, Math\.min\(1,/);
  assert.match(styles, /transform: translate\(var\(--eye-x\),var\(--eye-y\)\)/);
});

test('process planets expose hover, keyboard, and touch descriptions', () => {
  assert.match(page, /role="tooltip"/);
  assert.match(page, /aria-describedby=\{`planet-/);
  assert.match(page, /onClick=\{\(\) => setActivePlanet/);
  assert.match(styles, /\.planet:hover \.planet-tooltip,\.planet:focus-visible \.planet-tooltip,\.planet\.active \.planet-tooltip/);
  assert.match(styles, /\.ecosystem-planet-note/);
});
