import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {recordTiming,estimateTiming,estimateLabel} from '../app/tools/tts-estimate.ts';
function storage(){let value=null;return {getItem:()=>value,setItem:(_,v)=>{value=v;}};}
test('first run has no fabricated estimate; successful samples scale by length',()=>{
 const s=storage();assert.equal(estimateTiming(s,'qwen-ko',100),null);
 recordTiming(s,'qwen-ko',100,60);
 assert.equal(estimateTiming(s,'qwen-ko',150),90);
 assert.equal(estimateTiming(s,'qwen-en',100),null);
 assert.equal(estimateTiming(s,'qwen-ko',500),null);
});
test('median resists slow outlier and storage failures are safe',()=>{
 const s=storage();[60,65,1000].forEach(v=>recordTiming(s,'qwen',100,v));
 assert.equal(estimateTiming(s,'qwen',100),65);
 const blocked={getItem(){throw Error();},setItem(){throw Error();}};
 recordTiming(blocked,'qwen',100,60);assert.equal(estimateTiming(blocked,'qwen',100),null);
 s.setItem('', '{broken');assert.equal(estimateTiming(s,'qwen',100),null);
});
test('countdown never reports zero completion while generation continues',()=>{
 assert.match(estimateLabel(90,30,'generating'),/남은 시간 약 1분/);
 assert.match(estimateLabel(90,100,'generating'),/오래 걸리고/);
 assert.match(estimateLabel(90,null,'loading'),/준비 시간 별도/);
 assert.match(estimateLabel(90,null,'downloading'),/계산 대기/);
 assert.match(estimateLabel(null,null,'generating'),/첫 완료 후/);
});
test('invalid and expired samples are ignored',()=>{
 const s=storage();recordTiming(s,'qwen',0,60);recordTiming(s,'qwen',100,NaN);
 assert.equal(estimateTiming(s,'qwen',100),null);
 s.setItem('',JSON.stringify([{context:'qwen',chars:100,seconds:60,at:0}]));
 assert.equal(estimateTiming(s,'qwen',100),null);
});
test('UI records only validated completed audio after observed generation stage',()=>{
 const ui=readFileSync(new URL('../app/tools/DesktopNarration.tsx',import.meta.url),'utf8');
 assert.ok(ui.indexOf("if(blob.size<44")<ui.indexOf('recordTiming(window'));
 assert.match(ui,/if\(generationStartedAt.current\)\{try\{recordTiming/);
 assert.match(ui,/setGenerationOffset\(null\)/);
});
