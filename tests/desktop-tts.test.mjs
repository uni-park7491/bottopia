import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ttsModels} from '../app/tools/tts-models.ts';
import {desktopSpecs,CONNECTOR_URL} from '../app/tools/desktop-tts.ts';
test('every catalog entry has either a browser adapter or a desktop synthesis adapter',()=>{
  for(const m of ttsModels)assert.ok(m.engine||desktopSpecs[m.id],m.id);
  assert.equal(Object.keys(desktopSpecs).length,16);
  assert.equal(new Set(ttsModels.map(m=>m.family)).size,17);
});
test('desktop requests target loopback only and never accept remote endpoint settings',()=>{
  assert.equal(CONNECTOR_URL,'http://127.0.0.1:47831');
  const src=readFileSync(new URL('../app/tools/desktop-tts.ts',import.meta.url),'utf8');
  assert.match(src,/redirect:'error'/);assert.match(src,/credentials:'omit'/);
});
test('all model buttons are selectable and desktop results use the shared audio preview',()=>{
  const src=readFileSync(new URL('../app/tools/LocalNarration.tsx',import.meta.url),'utf8');
  assert.match(src,/availableModels\.map/);assert.match(src,/onResult={receiveDesktopAudio}/);
  assert.doesNotMatch(src,/실행 연결 미완료/);
});
test('desktop and browser narration share the parent draft across model switches',()=>{
  const parent=readFileSync(new URL('../app/tools/LocalNarration.tsx',import.meta.url),'utf8');
  const child=readFileSync(new URL('../app/tools/DesktopNarration.tsx',import.meta.url),'utf8');
  assert.match(parent,/text=\{text\} onTextChange=\{setText\}/);
  assert.match(child,/onTextChange:setText/);
  assert.doesNotMatch(child,/\[text,setText\]=useState/);
});
