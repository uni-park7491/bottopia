import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
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
test('workspace uses global theme; toggle has keyboard-accessible switch and system reset', () => {
  const css=readFileSync(new URL('../app/tools/studio-theme.css',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../app/components/ThemeSwitch.tsx',import.meta.url),'utf8');
  assert.ok(!css.includes('@media(prefers-color-scheme:dark)'));
  assert.ok(css.includes('html[data-theme="dark"] .creative-tools'));
  assert.match(ui,/role="switch" aria-checked/);
  assert.match(ui,/media.addEventListener\('change', sync\)/);
  assert.match(ui,/localStorage.removeItem\(key\)/);
});
