import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shotSchedule, parseShots, storyRequest, shotsRequest, shotSources, exportStory, hasRunawayRepetition, shotBeatStages } from '../lib/story-builder.ts';
test('runaway repeated prose is detected without rejecting short repeated labels',()=>{
  const line='노비가 집으로 돌아가려고 짐을 들고 문을 열었지만 집사가 다시 일을 시키는 상황입니다.';
  assert.equal(hasRunawayRepetition([line,line,line].join('\n')),true);
  assert.equal(hasRunawayRepetition([line,line].join('\n')),false);
  assert.equal(hasRunawayRepetition('카메라\n카메라\n카메라'),false);
});
test('complete shot-list allocation preserves all beats and does not duplicate short-story events',()=>{
  for(let count=2;count<=24;count++){
    const assignments=Array.from({length:count},(_,i)=>shotBeatStages(i+1,count));
    assert.equal([...new Set(assignments.join(''))].join(''),'기승전결');
    if(count<=4)assert.equal(assignments.join(''),'기승전결');
    assert.ok(assignments.at(-1).endsWith('결'));
  }
  assert.deepEqual([shotBeatStages(1,2),shotBeatStages(2,2)],['기승','전결']);
  assert.throws(()=>shotBeatStages(0,2));assert.throws(()=>shotBeatStages(3,2));
});
test('review references retain exact confirmed action text independently of generated suggestions',()=>{
  const bodies=['민수가 상자를 찾는다.','지우가 민수에게 우산을 빌려준다.','다음 날 민수가 지우에게 우산과 편지를 돌려준다.','지우는 편지를 읽고 미소 짓는다.'];
  const story=bodies.map((body,i)=>`[${'기승전결'[i]}]\n${body}`).join('\n');
  const slots=shotSchedule(15,15);
  const references=shotSources(story,slots,slots.length);
  assert.equal(references.map(r=>r.source).join('\n'),bodies.join('\n'));
  assert.equal(references[0].stage,'기승');assert.equal(references[1].stage,'전결');
  const generated=parseShots(JSON.stringify({shots:slots.map(()=>({visual:'잘못된 제안',camera:'고정',audio:'무음'}))}),slots);
  assert.equal(shotSources(story,generated,generated.length)[1].source,bodies.slice(2).join('\n'));
});
test('shot batches receive only their assigned story beats', () => {
  const story = '**[기]**\n소개한다.\n\n**[승]**\n갈등한다.\n\n**[전]**\n해결한다.\n\n**[결]**\n퇴근한다.';
  const first = shotsRequest(story, shotSchedule(60,15).slice(0,4),60,8);
  assert.match(first, /소개한다/); assert.match(first, /갈등한다/);
  assert.doesNotMatch(first, /퇴근한다|해결한다/);
  const last = shotsRequest(story, shotSchedule(60,15).slice(4),60,8);
  assert.match(last, /해결한다/); assert.match(last, /퇴근한다/);
  assert.doesNotMatch(last, /소개한다|갈등한다/);
});
test('every supported duration and clip schedule sums exactly and never crosses clip boundary', () => {
  for (let time = 15; time <= 120; time++) for (let clip = 5; clip <= 30; clip++) {
    const slots = shotSchedule(time, clip);
    assert.equal(slots.reduce((sum, s) => sum + s.duration, 0), time);
    slots.forEach((s, i) => {
      assert.ok(s.duration > 0 && s.duration <= 8);
      assert.equal(s.index, i + 1);
      assert.equal(s.start, i ? slots[i - 1].start + slots[i - 1].duration : 0);
      assert.ok(s.start + s.duration <= Math.min(s.clip * clip, time));
    });
  }
});
test('short runtimes retain every beat and only the final batch gets the ending directive', () => {
  const story = '[기]\n첫상황\n[승]\n진행사건\n[전]\n선택행동\n[결]\n확정결말';
  for (let runtime = 15; runtime <= 120; runtime++) for (let clip = 5; clip <= 30; clip++) {
    const slots = shotSchedule(runtime, clip);
    const all = shotsRequest(story, slots, runtime, slots.length);
    for (const beat of ['첫상황','진행사건','선택행동','확정결말']) assert.ok(all.includes(beat), `${runtime}/${clip}: ${beat}`);
    assert.match(all, /마지막 샷에서 확정 시나리오의 결말을 보여주세요/);
    assert.doesNotMatch(all, /퇴근|장애물과 갈등만|전체 이야기를 이 배치 안에서 끝내지/);
    const earlier = shotsRequest(story, slots.slice(0, 1), runtime, slots.length);
    assert.match(earlier, /아직 마지막 묶음이 아닙니다/);
  }
});
test('parenthesized, inline and markdown stage headings preserve assigned beats', () => {
  for (const story of [
    '**기 (목표):**\n문앞이다.\n**승 (갈등):**\n짐이막는다.\n**전 (해결 행동):**\n함께든다.\n**결 (결과):**\n함께떠난다.',
    '### 기: 문앞이다.\n### 승: 짐이막는다.\n### 전: 함께든다.\n### 결: 함께떠난다.',
    '[기] 문앞이다.\n[승] 짐이막는다.\n[전] 함께든다.\n[결] 함께떠난다.',
  ]) {
    const request = shotsRequest(story, shotSchedule(60,15).slice(0,4),60,8);
    assert.match(request, /문앞이다|짐이막는다/);
    assert.doesNotMatch(request, /함께든다|함께떠난다/);
  }
});
test('ordinary prose is not a heading and partial or duplicated stages fail clearly', () => {
  assert.match(shotsRequest('기차를 탄 노비는 전날의 일을 떠올린다.',shotSchedule(15,15),15,2), /기차를 탄/);
  assert.throws(()=>shotsRequest('기: 시작\n승: 갈등',shotSchedule(15,15),15,2), /비어 있는 단계/);
  assert.throws(()=>shotsRequest('기: 시작\n기: 다시 시작',shotSchedule(15,15),15,2), /중복/);
});
test('invalid timings fail closed', () => {
  for (const [a,b] of [[NaN,15],[14,15],[121,15],[60,0],[60,31],[60,5.5]]) assert.throws(() => shotSchedule(a,b));
});
test('AI output validates shape, bounds and count; model cannot override timing', () => {
  const slot = shotSchedule(15,15).slice(0,1);
  const row = { visual:'노비가 문을 연다', camera:'클로즈업', audio:'문 여는 소리', duration:999, clip:999 };
  const parsed = parseShots(JSON.stringify({ shots:[row] }), slot);
  assert.equal(parsed[0].duration, slot[0].duration);
  assert.equal(parsed[0].clip, 1);
  for (const value of ['bad', '{}', '{"shots":[]}', JSON.stringify({shots:[{...row,visual:''}]}), JSON.stringify({shots:[{...row,audio:'a'.repeat(501)}]})]) assert.throws(() => parseShots(value,slot));
  assert.match(exportStory('퇴근',parsed), /노비가 문을 연다/);
});
test('director input bounds', () => {
  assert.match(storyRequest('퇴근하는 노비','코미디',60), /아직 샷리스트는 작성하지 마세요/);
  assert.throws(() => storyRequest('x'.repeat(1201),'코미디',60));
});
test('AI integration has no prompt uploads, HTML execution or paid fallback', () => {
  const engine = readFileSync(new URL('../app/tools/story-engine.ts', import.meta.url),'utf8');
  const ui = readFileSync(new URL('../app/tools/StoryBuilder.tsx', import.meta.url),'utf8');
  assert.doesNotMatch(engine + ui, /dangerouslySetInnerHTML|\beval\(|new Function|OPENAI_API_KEY|api\.openai\.com|sendBeacon|XMLHttpRequest/);
  assert.match(engine, /\/resolve\/[a-f0-9]{40}\//);
  assert.match(engine, /binary-mlc-llm-libs\/[a-f0-9]{40}\//);
  assert.match(ui, /if \(!confirmed \|\| !ready \|\| !engine.current\) return/);
  assert.match(ui, /disabled=\{!supported \|\| !consent \|\| !!busy\}/);
  assert.match(engine, /worker.terminate\(\)/);
  assert.match(engine, /json \? shotDirectorInstruction : directorInstruction/);
  const prompt=shotsRequest('[기]\n준비\n[승]\n전달\n[전]\n반환\n[결]\n인사',shotSchedule(15,15),15,2);
  assert.match(prompt,/모든 행동을 빠짐없이/);
  assert.match(prompt,/대사가 없으면 대사를 만들지 말고/);
  assert.doesNotMatch(prompt,/핵심 행동을 압축|한 샷에는 촬영 가능한 핵심 행동/);
});
