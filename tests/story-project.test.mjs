import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { archiveKey, parseArchive, parseProject } from '../lib/story-project.ts';
import { shotSchedule, storyRequest } from '../lib/story-builder.ts';
const project={topic:'퇴근하는 노비',tone:'따뜻한 코미디',runtimeInput:'60',clipInput:'15',story:'초안',feedback:'',shots:[]};
test('custom mood survives project storage and reaches the generation prompt',()=>{
  const custom={...project,tone:'몽환적인 SF와 블랙코미디'};
  const restored=parseProject(JSON.parse(JSON.stringify(custom)));
  assert.equal(restored.tone,custom.tone);
  assert.ok(storyRequest(restored.topic,restored.tone,60).includes(custom.tone));
  assert.throws(()=>parseProject({...custom,tone:'가'.repeat(81)}));
  const ui=readFileSync(new URL('../app/tools/StoryBuilder.tsx',import.meta.url),'utf8');
  assert.match(ui,/<option value="__custom__">직접 입력<\/option>/);
  assert.match(ui,/setCustomTone\(!toneOptions.includes\(p.tone\)\)/);
  assert.match(ui,/!validTone \|\| candidate/);
});
test('project export roundtrip includes bounded versions',()=>{
  const archive={format:'bottopia-story-v1',current:project,versions:[{savedAt:new Date().toISOString(),project}]};
  assert.deepEqual(parseArchive(JSON.stringify(archive)),archive);
  assert.notEqual(archiveKey('member-a'),archiveKey('member-b'));
});
test('untrusted project rejects oversized, malformed and unknown content',()=>{
  for(const text of ['bad','null','{}','x'.repeat(500001),JSON.stringify({format:'bottopia-story-v1',current:project,versions:Array(9).fill({})})]) assert.throws(()=>parseArchive(text));
  assert.throws(()=>parseProject({...project,topic:'x'.repeat(1201)}));
  assert.throws(()=>parseProject({...project,story:{html:'bad'}}));
  assert.throws(()=>parseProject({...project,shots:[{}]}));
  assert.deepEqual(parseProject({...project,extra:'ignored'}),project);
});
test('restored shots cannot forge timing',()=>{
  const shots=shotSchedule(60,15).map(s=>({...s,start:999,duration:999,visual:'문을 연다',camera:'중경',audio:'문소리'}));
  const restored=parseProject({...project,shots});
  assert.equal(restored.shots[0].start,0);
  assert.equal(restored.shots.reduce((sum,s)=>sum+s.duration,0),60);
});
test('tools use verified server member and recheck before AI execution',()=>{
  const page=readFileSync(new URL('../app/tools/page.tsx',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../app/tools/StoryBuilder.tsx',import.meta.url),'utf8');
  assert.match(page,/await getCurrentUser\(\)/);
  assert.match(page,/if \(!user\) redirect/);
  assert.match(ui,/auth.getUser\(\)/);
  assert.match(ui,/data.user\?\.id !== memberId/);
});
