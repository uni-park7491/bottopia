import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { applySiteTheme, resolveSiteTheme } from '../lib/site-theme.ts';
const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url),'utf8');
const script = layout.match(/__html: `([^`]+)`/)[1];
for (const [stored, system, expected] of [[null,true,'dark'],[null,false,'light'],['light',true,'light'],['dark',false,'dark'],['invalid',true,'dark']]) {
  test('initial theme: ' + JSON.stringify({stored,system}), () => {
    const document = {documentElement:{dataset:{}}};
    runInNewContext(script,{document,localStorage:{getItem:()=>stored},matchMedia:()=>({matches:system})});
    assert.equal(document.documentElement.dataset.theme,expected);
  });
}
test('blocked local storage falls back to system theme', () => {
  const document = {documentElement:{dataset:{}}};
  runInNewContext(script,{document,localStorage:{getItem:()=>{throw Error('blocked');}},matchMedia:()=>({matches:true})});
  assert.equal(document.documentElement.dataset.theme,'dark');
});
test('workspace uses global theme; only the manual day/night switch is visible', () => {
  const css=readFileSync(new URL('../app/tools/studio-theme.css',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../app/components/ThemeSwitch.tsx',import.meta.url),'utf8');
  assert.ok(!css.includes('@media(prefers-color-scheme:dark)'));
  assert.ok(css.includes('html[data-theme="dark"] .creative-tools'));
  assert.match(ui,/role="switch" aria-checked/);
  assert.match(ui,/media.addEventListener\('change', sync\)/);
  assert.doesNotMatch(ui,/theme-auto|function reset|>자동</);
  assert.match(ui,/localStorage.setItem\(key, theme\)/);
  assert.match(ui,/temporaryTheme.current = theme/);
});
test('system changes apply only when no manual preference exists', () => {
  assert.equal(resolveSiteTheme(null, true), 'dark');
  assert.equal(resolveSiteTheme(null, false), 'light');
  assert.equal(resolveSiteTheme('light', true), 'light');
  assert.equal(resolveSiteTheme('dark', false), 'dark');
  assert.equal(resolveSiteTheme('invalid', false), 'light');
});
test('theme updates the page, native controls and installed-app toolbar together', () => {
  const metas = [0, 1].map(() => ({ content: '', removeAttribute(name) { this.removed = name; } }));
  const document = { documentElement: { dataset: {}, style: {} }, querySelectorAll: () => metas };
  for (const theme of ['dark', 'light', 'dark', 'light']) {
    applySiteTheme(document, theme);
    assert.equal(document.documentElement.dataset.theme, theme);
    assert.equal(document.documentElement.style.colorScheme, `only ${theme}`);
    for (const meta of metas) {
      assert.equal(meta.content, theme === 'dark' ? '#111318' : '#f7f8fa');
      assert.equal(meta.removed, 'media');
    }
  }
});
test('light palette explicitly opts out of browser auto-dark recoloring', () => {
  const css = readFileSync(new URL('../app/brand-theme.css', import.meta.url), 'utf8');
  assert.match(css, /html\[data-theme="light"\]\s*\{\s*color-scheme: only light/);
  assert.match(css, /html\[data-theme="dark"\]\s*\{\s*color-scheme: only dark/);
});
