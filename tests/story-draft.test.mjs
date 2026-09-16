import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeStoryDraft, StoryFormatError, shotSources, shotSchedule } from '../lib/story-builder.ts';
test('complete short Korean story is accepted even below 100 characters', () => {
  const story = '[기] 노비가 떠난다.\n[승] 집사가 막는다.\n[전] 함께 일을 끝낸다.\n[결] 둘이 퇴근한다.';
  assert.ok(story.length < 100);
  const output = normalizeStoryDraft(story);
  assert.match(output, /\[결\]\n둘이 퇴근한다/);
  assert.equal(shotSources(output, shotSchedule(15,15),2).length,2);
});
test('markdown and inline headings normalize without altering events', () => {
  const body = ['노비가 떠난다.', '집사가 막는다.', '함께 일을 끝낸다.', '둘이 퇴근한다.'];
  for (const format of [(s,b)=>`**[${s}]** ${b}`, (s,b)=>`### ${s}: ${b}`, (s,b)=>`${s} (단계):\n${b}`]) {
    const output = normalizeStoryDraft('```markdown\n제목: 퇴근\n'+body.map((b,i)=>format('기승전결'[i],b)).join('\n')+'\n```');
    body.forEach(b=>assert.ok(output.includes(b)));
    assert.equal(shotSources(output,shotSchedule(15,15),2).map(x=>x.source).join('\n'),body.join('\n'));
  }
});
test('missing, duplicate, reordered, empty or oversized stages fail specifically', () => {
  for (const raw of ['', 'English only', '[기] 시작\n[승] 진행', '[기] 시작\n[기] 다시\n[승] 진행\n[전] 반전\n[결] 끝', '[승] 진행\n[기] 시작\n[전] 반전\n[결] 끝', '[기]\n[승] 진행\n[전] 반전\n[결] 끝', '가'.repeat(2401)]) {
    assert.throws(()=>normalizeStoryDraft(raw),StoryFormatError);
  }
});
test('manual editor is no longer in the tools UI and format errors do not reset the engine',()=>{
  const tools = readFileSync(new URL('../app/tools/CreativeTools.tsx',import.meta.url),'utf8');
  const ui = readFileSync(new URL('../app/tools/StoryBuilder.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(tools,/manual-scene-tools|기존 수동 장면 편집기|newScene|parseSceneFile/);
  assert.match(ui,/attempt < 2/);
  assert.match(ui,/if \(!\(error instanceof StoryFormatError\)\)/);
  assert.doesNotMatch(ui,/result.length < 100|story.trim\(\).length < 100/);
});
