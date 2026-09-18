import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import { validateSpeech, splitSpeech, encodeSpeech } from '../public/vendor/supertonic/audio-utils.mjs';
import { languagesFor } from '../public/vendor/tts-languages.mjs';
const source = stripTypeScriptTypes(readFileSync(new URL('../app/tools/kokoro.worker.ts', import.meta.url), 'utf8').replace(/^import .*;\n/gm, ''));
async function run(data, silent = false) {
  const messages = [], calls = [], urls = []; let loaded = 0, disposed = 0;
  const self = { postMessage: m => messages.push(m) };
  class KokoroTTS {
    async generate(text, options) { calls.push({text,...options}); return { sampling_rate: 24000, audio: Float32Array.from({length:24000},(_,i)=>silent?0:Math.sin(i/10)) }; }
  }
  const ctx = {self, KokoroTTS, env:{backends:{onnx:{wasm:{}}}},
    StyleTextToSpeech2Model:{from_pretrained:async()=>{loaded++;return {dispose:async()=>disposed++};}},
    AutoTokenizer:{from_pretrained:async()=>({})}, validateSpeech, splitSpeech, encodeSpeech,
    fetch:async url=>{urls.push(url);return {};}, URL, console:{error(){}} };
  runInNewContext(source, ctx);
  await self.onmessage({data:{text:'Hello world.',voice:'F1',speed:1,language:'en',...data}});
  await ctx.fetch('https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/af_heart.bin');
  return {messages,calls,loaded,disposed,urls};
}
test('Kokoro en-only runtime passes both voices and speed; returns real WAV shape',async()=>{
  assert.deepEqual(languagesFor('kokoro'),[['en','영어']]);
  for (const voice of ['F1','M1']) {
    const r = await run({voice,speed:1.2});
    assert.equal(r.calls[0].voice,voice==='F1'?'af_heart':'am_michael');
    assert.equal(r.calls[0].speed,1.2);
    assert.equal(r.messages.at(-1).type,'result');
    assert.equal(r.messages.at(-1).wav.byteLength,48044);
    assert.equal(r.disposed,1);
    assert.match(r.urls[0],/1939ad2a8e416c0acfeecc08a694d14ef25f2231/);
  }
});
test('Kokoro rejects unsupported language and invalid input before model download',async()=>{
  for (const data of [{language:'ko'},{voice:'invalid'},{text:''},{speed:9}]) {
    const r=await run(data); assert.equal(r.loaded,0); assert.equal(r.messages.at(-1).type,'error');
  }
});
test('Kokoro frees memory after failed output, and never accepts silence as success',async()=>{
  const r=await run({},true); assert.equal(r.disposed,1); assert.equal(r.messages.at(-1).type,'error');
});
test('Kokoro reports generation progress before result without premature 100 percent',async()=>{
  const {messages}=await run({text:'Hello world. '.repeat(25)});
  const progress=messages.filter(m=>m.phase==='generating');
  assert.ok(progress.length>=4);
  assert.equal(progress[0].percent,undefined);
  assert.ok(progress.some(m=>m.percent>0));
  assert.ok(progress.every(m=>m.percent===undefined||m.percent<100));
  assert.equal(messages.at(-1).type,'result');
});
