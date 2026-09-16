import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { encodeSpeech, splitSpeech, validateSpeech } from '../public/vendor/supertonic/audio-utils.mjs';
import { referenceVoice, loadReferenceVoice } from '../public/vendor/qwen-tts/voices.mjs';
import { validateLanguage, languagesFor } from '../public/vendor/tts-languages.mjs';
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
 const route=read('app/tools/page.tsx'), config=read('next.config.ts');
 assert.match(route,/getCurrentUser\(\)/);
 assert.match(route,/redirect\(`/);
 assert.match(config,/source: '\/tools\/:path\*'/);
 assert.match(config,/source: '\/vendor\/:path\*'/);
 assert.match(config,/source: '\/_next\/static\/:path\*'/);
 assert.match(config,/Cross-Origin-Embedder-Policy/);
});
test('Model selection never navigates or discards text/audio, and resets download consent',()=>{
 const ui=read('app/tools/LocalNarration.tsx');
 assert.doesNotMatch(ui,/href="\/tools\/tts|window.location|router.push/);
 assert.match(ui,/selectEngine\('qwen'\)/);
 assert.match(ui,/setEngine\(next\); setAllowed\(false\)/);
 const start=ui.indexOf('function selectEngine');
 const select=ui.slice(start,ui.indexOf('useEffect(',start));
 assert.match(select,/if \(busy \|\| next === engine\) return/);
 assert.doesNotMatch(select,/setText|setResult|revokeObjectURL/);
 assert.match(read('app/tools/tts/page.tsx'),/redirect\(`\/tools\?tab=audio&model=/);
});
test('TTS retains consent, real playback, download and forced worker cancellation', () => {
 const ui=read('app/tools/LocalNarration.tsx');
 assert.match(ui,/Qwen3-TTS/); assert.match(ui,/1.48GB/);
 assert.match(ui,/!allowed/); assert.match(ui,/worker.current\?\.terminate\(\)/);
 assert.match(ui,/<audio.*controls/); assert.match(ui,/downloadFile\(result.blob/);
 assert.match(ui,/isQwen \? '\/vendor\/qwen-tts\/worker.mjs'/);
 assert.match(ui,/text: submitted, voice/);
 assert.match(ui,/result.voice === 'M1'/);
 assert.doesNotMatch(ui,/!isQwen && <div className="scene-fields"/);
});

async function exercise({ text='안녕하세요.', voice='F1', language='ko', truncated=false, silent=false, isolated=true, supported=true, supportsSpeakerReference=true }={}) {
 const messages=[], references=[], languages=[]; let disposed=0, loaded=0;
 const self={crossOriginIsolated:isolated,postMessage:message=>messages.push(message)};
 class Bridge {
  async loadModelFromUrl(){loaded++;}
  async loadMultimodalProjector(){}
  async getTextToSpeechCapabilities(){return {supported,supportsSpeakerReference,sampleRate:24000,channels:1};}
  async synthesizeSpeech(options){references.push(options.speakerAudio);languages.push(options.language);return {pcm:Float32Array.from({length:24000},(_,i)=>silent?0:Math.sin(i/10)),sampleRate:24000,channels:1,truncated};}
  async dispose(){disposed++;}
 }
 const source=read('public/vendor/qwen-tts/worker.mjs').replace(/^import .*;\n/gm,'').replaceAll('import.meta.url',JSON.stringify('https://bottopia.studio/vendor/qwen-tts/worker.mjs'));
 runInNewContext(source,{self,LlamaWebGpuBridge:Bridge,encodeSpeech,splitSpeech,validateSpeech,validateLanguage,referenceVoice,loadReferenceVoice:async voice=>voice,URL,Float32Array,console:{error(){}}});
 await self.onmessage({data:{text,voice,language}});
 return {messages,disposed,loaded,references,languages};
}
test('Language allowlists match pinned engines and reject unsupported values',()=>{
 assert.equal(languagesFor('qwen').length,10);
 assert.equal(languagesFor('supertonic').length,31);
 assert.equal(validateLanguage('qwen'), 'ko');
 for(const bad of ['ar','../../en',null,{},'']) assert.throws(()=>validateLanguage('qwen',bad));
 assert.throws(()=>validateLanguage('supertonic','zh'));
 assert.throws(()=>languagesFor('paid-api'));
});
test('Selected languages reach every Qwen chunk and invalid values stop before download',async()=>{
 for(const [language] of languagesFor('qwen')) {
  const result=await exercise({language});
  assert.deepEqual(result.languages,[language]);
  assert.equal(result.messages.at(-1).type,'result');
 }
 const rejected=await exercise({language:'ar'});
 assert.equal(rejected.loaded,0); assert.equal(rejected.messages.at(-1).type,'error');
});
test('Qwen worker success emits playable PCM16 WAV and disposes the engine',async()=>{
 const {messages,disposed}=await exercise();const result=messages.find(m=>m.type==='result');
 assert.equal(result.seconds,1);assert.equal(result.wav.byteLength,48044);assert.equal(disposed,1);
});
test('Qwen rejects incomplete, silent and unsupported output rather than showing success',async()=>{
 for(const options of [{truncated:true},{silent:true},{supported:false},{supportsSpeakerReference:false}]){
  const {messages,disposed}=await exercise(options);
  assert.equal(messages.some(m=>m.type==='result'),false);assert.equal(messages.at(-1).type,'error');assert.equal(disposed,1);
 }
});
test('Qwen rejects invalid input and non-isolated contexts before downloading',async()=>{
 for(const options of [{text:''},{text:'가'.repeat(501)},{isolated:false},{voice:'invalid'}]){
  const {messages,loaded}=await exercise(options);assert.equal(loaded,0);assert.equal(messages.at(-1).type,'error');
 }
});
test('Both selected voices reach synthesis, including every chunk',async()=>{
 for(const voice of ['F1','M1']) {
  const result=await exercise({voice,text:'가'.repeat(210)});
  assert.equal(result.messages.at(-1).type,'result');
  assert.ok(result.references.length>1);
  assert.ok(result.references.every(reference=>reference===voice));
 }
});
test('Voice references reject unknown IDs, failed downloads and non-WAV responses',async()=>{
 assert.throws(()=>referenceVoice('../../secrets'));
 assert.throws(()=>referenceVoice(undefined));
 await assert.rejects(loadReferenceVoice('F1',async()=>({ok:false})));
 await assert.rejects(loadReferenceVoice('F1',async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(44)})));
});
test('Bundled female and male references are distinct, valid bounded WAVs',async()=>{
 const hashes=[];
 for(const voice of ['F1','M1']) {
  const bytes=readFileSync(referenceVoice(voice));
  const loaded=await loadReferenceVoice(voice,async()=>({ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}));
  assert.equal(loaded.length,bytes.length);
  assert.equal(bytes.readUInt16LE(20),1); // PCM
  assert.equal(bytes.readUInt16LE(22),1); // mono
  assert.equal(bytes.readUInt32LE(24),24000);
  assert.equal(bytes.readUInt16LE(34),16);
  assert.ok(bytes.length>144000 && bytes.length<1000000);
  hashes.push(createHash('sha256').update(bytes).digest('hex'));
 }
 assert.notEqual(hashes[0],hashes[1]);
});
