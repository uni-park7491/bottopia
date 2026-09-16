import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = name => readFileSync(new URL(`../app/tools/${name}`, import.meta.url),'utf8');
test('workspace exposes only story/shots and narration and keeps both mounted',()=>{
  const source=read('CreativeTools.tsx');
  assert.equal((source.match(/aria-pressed=/g)||[]).length,2);
  assert.doesNotMatch(source,/CharacterSheet|manual-scene-tools|'character'/);
  assert.match(source,/hidden=\{tab !== 'scenes'\}/);
  assert.match(source,/hidden=\{tab !== 'audio'\}/);
});
test('story flow has readable stages, optional storage and no video editor',()=>{
  const source=read('StoryBuilder.tsx');
  assert.match(source,/aria-label="작업 진행 상태"/);
  assert.match(source,/aria-current=/);
  assert.match(source,/details className="workspace-storage"/);
  assert.doesNotMatch(source,/<Animatic|01 ·|02 ·|03 ·/);
  assert.match(source,/다운로드 용량과 기기 사용 안내/);
});
test('narration retains real audio output and explicit consent',()=>{
  const source=read('LocalNarration.tsx');
  assert.match(source,/<audio.*controls/);
  assert.match(source,/result.blob, 'bottopia-ai-narration.wav'/);
  assert.match(source,/busy \|\| !allowed \|\| !text.trim\(\)/);
});
