import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {MAX_STORY_SHOTS,shotSchedule,shotBeatStages} from '../lib/story-builder.ts';
import {parseArchive} from '../lib/story-project.ts';
import {timelineDuration} from '../lib/animatic.ts';
const plugin=createRequire(import.meta.url)('../extensions/photoshop-shot-desk/project.js');
test('every supported schedule survives archive, animatic and UXP parsers',()=>{
  let maximum=0;
  for(let runtime=15;runtime<=120;runtime++)for(let clip=5;clip<=30;clip++){
    const slots=shotSchedule(runtime,clip);maximum=Math.max(maximum,slots.length);
    assert.ok(slots.length<=MAX_STORY_SHOTS);
    const current={topic:'합성 검증',tone:'드라마',runtimeInput:String(runtime),clipInput:String(clip),story:'테스트',feedback:'',shots:slots.map(s=>({...s,visual:'움직인다',camera:'고정',audio:'무음'}))};
    const text=JSON.stringify({format:'bottopia-story-v1',current,versions:[]});
    assert.equal(timelineDuration(parseArchive(text).current.shots),runtime);
    assert.equal(plugin.parseProject(text).duration,runtime);
    assert.equal([...new Set(slots.map(s=>shotBeatStages(s.index,slots.length)).join(''))].join(''),'기승전결');
  }
  assert.equal(maximum,27);
});
