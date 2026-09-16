import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { encodeSpeech, splitSpeech, validateSpeech } from '../public/vendor/supertonic/audio-utils.mjs';
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
test('Qwen downloads are pinned and execution never sends entered text to a server', () => {
 const worker = read('public/vendor/qwen-tts/worker.mjs');
 assert.match(worker, /ca27d74bc954b73dadab5b71ca265d87fc861a7c/);
 assert.match(worker, /disableWorker: true/);
 assert.match(worker, /crossOriginIsolated/);
 assert.doesNotMatch(worker, /fetch\(|api[_-]?key|Authorization|\/api\//i);
 assert.match(worker, /encodeSpeech\(pcm, 24000\)/);
 assert.match(worker, /result.truncated/);
 assert.match(worker, /bridge\?\.dispose\(\)/);
});
test('Qwen runtime matches the pinned upstream release checksums', () => {
 const dir='public/vendor/qwen-tts/';
 const checksums=read(dir+'sha256sums.txt');
 for(const file of ['llama_webgpu_bridge.js','llama_webgpu_core.js','llama_webgpu_core.wasm','llama_webgpu_core_mem64.js','llama_webgpu_core_mem64.wasm']) {
  const expected=checksums.split('\n').find(l=>l.endsWith(file)).split(/\s+/)[0];
  assert.equal(createHash('sha256').update(readFileSync(new URL('../'+dir+file,import.meta.url))).digest('hex'),expected);
 }
});
test('Qwen route requires login; isolation is not applied to the whole site', () => {
 const route=read('app/tools/tts/page.tsx'), config=read('next.config.ts');
 assert.match(route,/getCurrentUser\(\)/);
 assert.match(route,/redirect\(`/);
 assert.match(config,/source: '\/tools\/tts', has: \[\{ type: 'query' as const, key: 'model', value: 'qwen'/);
 assert.match(config,/source: '\/vendor\/qwen-tts\/:path\*'/);
 assert.match(config,/Cross-Origin-Embedder-Policy/);
});
test('TTS retains consent, real playback, download and forced worker cancellation', () => {
 const ui=read('app/tools/LocalNarration.tsx');
 assert.match(ui,/Qwen3-TTS/); assert.match(ui,/1.48GB/);
 assert.match(ui,/!allowed/); assert.match(ui,/worker.current\?\.terminate\(\)/);
 assert.match(ui,/<audio.*controls/); assert.match(ui,/downloadFile\(result.blob/);
 assert.match(ui,/isQwen \? '\/vendor\/qwen-tts\/worker.mjs'/);
});

async function exercise({ text='안녕하세요.', truncated=false, silent=false, isolated=true, supported=true }={}) {
 const messages=[]; let disposed=0, loaded=0;
 const self={crossOriginIsolated:isolated,postMessage:message=>messages.push(message)};
 class Bridge {
  async loadModelFromUrl(){loaded++;}
  async loadMultimodalProjector(){}
  async getTextToSpeechCapabilities(){return {supported,sampleRate:24000,channels:1};}
  async synthesizeSpeech(){return {pcm:Float32Array.from({length:24000},(_,i)=>silent?0:Math.sin(i/10)),sampleRate:24000,channels:1,truncated};}
  async dispose(){disposed++;}
 }
 const source=read('public/vendor/qwen-tts/worker.mjs').replace(/^import .*;\n/gm,'').replaceAll('import.meta.url',JSON.stringify('https://bottopia.studio/vendor/qwen-tts/worker.mjs'));
 runInNewContext(source,{self,LlamaWebGpuBridge:Bridge,encodeSpeech,splitSpeech,validateSpeech,URL,Float32Array,console:{error(){}}});
 await self.onmessage({data:{text}});
 return {messages,disposed,loaded};
}
test('Qwen worker success emits playable PCM16 WAV and disposes the engine',async()=>{
 const {messages,disposed}=await exercise();const result=messages.find(m=>m.type==='result');
 assert.equal(result.seconds,1);assert.equal(result.wav.byteLength,48044);assert.equal(disposed,1);
});
test('Qwen rejects incomplete, silent and unsupported output rather than showing success',async()=>{
 for(const options of [{truncated:true},{silent:true},{supported:false}]){
  const {messages,disposed}=await exercise(options);
  assert.equal(messages.some(m=>m.type==='result'),false);assert.equal(messages.at(-1).type,'error');assert.equal(disposed,1);
 }
});
test('Qwen rejects invalid input and non-isolated contexts before downloading',async()=>{
 for(const options of [{text:''},{text:'가'.repeat(501)},{isolated:false}]){
  const {messages,loaded}=await exercise(options);assert.equal(loaded,0);assert.equal(messages.at(-1).type,'error');
 }
});
