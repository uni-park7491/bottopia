import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../app/brand-theme.css',import.meta.url),'utf8');
test('studio title, profile guidance and publish checkbox use theme-aware text colors',()=>{
  assert.match(css,/\.studio-shell \.studio-title h1 \{ color:var\(--site-text\)/);
  assert.match(css,/\.studio-profile-callout p,.field-help,.studio-empty.*color:var\(--site-muted\)/);
  assert.match(css,/\.studio-shell \.publish-check \{ color:var\(--site-text\) !important/);
  assert.match(css,/\.studio-profile-callout :is\(span,a\) \{ color:var\(--site-accent\)/);
  assert.match(css,/input::file-selector-button \{ background:var\(--site-soft\); color:var\(--site-text\)/);
});
test('studio light/dark text and action tokens meet 4.5:1 contrast',()=>{
  const lum=hex=>{const rgb=hex.replace('#','').match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
  const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  for(const [text,bg] of [['#16191e','#f7f8fa'],['#5b626d','#ffffff'],['#b73910','#ffffff'],['#f2f4f7','#111318'],['#aeb6c3','#1a1d24'],['#dfff00','#1a1d24']])assert.ok(ratio(text,bg)>=4.5,`${text}/${bg}`);
});
