import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { validateLanguage, languagesFor } from '../public/vendor/tts-languages.mjs';
import { validateSpeech, encodeSpeech, splitSpeech } from '../public/vendor/supertonic/audio-utils.mjs';

const source = readFileSync(new URL('../public/vendor/supertonic/worker.mjs', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '').replaceAll('import.meta.url', JSON.stringify('https://bottopia.studio/vendor/supertonic/worker.mjs'));
async function exercise(language) {
  const messages=[], calls=[]; let downloads=0;
  const self={postMessage:m=>messages.push(m)};
  const loadTextToSpeech=async()=>{downloads++;return {textToSpeech:{sampleRate:24000,call:async(text,lang)=>{
    calls.push(lang); return {duration:[1],wav:Float32Array.from({length:24000},(_,i)=>Math.sin(i/10))};
  }}};};
  const loadVoiceStyle=async()=>({ttl:{dispose(){}},dp:{dispose(){}}});
  runInNewContext(source,{self,ort:{env:{wasm:{}}},URL,validateLanguage,validateSpeech,encodeSpeech,splitSpeech,loadTextToSpeech,loadVoiceStyle,console:{error(){}}});
  await self.onmessage({data:{text:'Hello world.',voice:'F1',speed:1,language}});
  return {messages,calls,downloads};
}
test('Every exposed Supertonic language reaches inference',async()=>{
  for(const [language] of languagesFor('supertonic')) {
    const result=await exercise(language);
    assert.deepEqual(result.calls,[language]);
    assert.equal(result.messages.at(-1).type,'result');
  }
});
test('Unsupported Supertonic language cannot start model downloads',async()=>{
  for(const language of ['zh','../en',null,{}]) {
    const result=await exercise(language);
    assert.equal(result.downloads,0);
    assert.equal(result.messages.at(-1).type,'error');
  }
});
