import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import { Mp3Encoder } from '@breezystack/lamejs';
import QR from 'qrcode';
import jsQR from 'jsqr';
import sharp from 'sharp';
import { normalizeQrUrl } from '../app/tools/qr-url.ts';
import { encodeSpeech, validateSpeech } from '../public/vendor/supertonic/audio-utils.mjs';
const read=n=>readFileSync(new URL('../'+n,import.meta.url),'utf8');
test('MP3 worker encodes actual PCM for all three TTS sample rates',async()=>{
  const src=stripTypeScriptTypes(read('app/tools/mp3.worker.ts').replace(/^import .*;\n/gm,''));
  for(const rate of [24000,44100,48000]) {
    const pcm=Float32Array.from({length:rate},(_,i)=>.5*Math.sin(2*Math.PI*440*i/rate));
    const messages=[],self={postMessage:m=>messages.push(m)};
    runInNewContext(src,{self,Mp3Encoder,DataView,Uint8Array,Int16Array,Blob});
    self.onmessage({data:encodeSpeech(pcm,rate)});
    assert.equal(messages[0].blob.type,'audio/mpeg');
    const bytes=new Uint8Array(await messages[0].blob.arrayBuffer());
    assert.ok(bytes.length>8000);assert.equal(bytes[0],255);assert.equal(bytes[1]&224,224);
  }
});
test('MP3 rejects malformed WAV without a success result',()=>{
  const src=stripTypeScriptTypes(read('app/tools/mp3.worker.ts').replace(/^import .*;\n/gm,''));
  const messages=[],self={postMessage:m=>messages.push(m)};
  runInNewContext(src,{self,Mp3Encoder,DataView,Uint8Array,Int16Array,Blob});self.onmessage({data:new ArrayBuffer(12)});assert.ok(messages[0].error);assert.equal(messages[0].blob,undefined);
});
test('QR PNG and SVG independently decode to the same Unicode/escaped URL',async()=>{
  const url=normalizeQrUrl('https://bottopia.studio/작품?name=hello&lang=ko');
  for(const svg of [false,true]) {
    const options={margin:4,width:512,errorCorrectionLevel:'M'};
    const input=svg?Buffer.from(await QR.toString(url,{...options,type:'svg'})):await QR.toBuffer(url,options);
    const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const decoded=jsQR(new Uint8ClampedArray(data),info.width,info.height);
    assert.equal(decoded.data,url);
  }
});
test('QR rejects executable schemes, credentials and oversized data',()=>{
  for(const value of ['javascript:alert(1)','data:text/html,hi','file:///etc/passwd','https://user:secret@example.com','not a URL','https://example.com/'+ 'x'.repeat(2001)])assert.throws(()=>normalizeQrUrl(value));
});
test('QR preview omits the visible URL and explains image-only exports',()=>{
  const src=read('app/tools/QrTool.tsx');
  assert.doesNotMatch(src,/<p>\{result\.url\}<\/p>/);
  assert.match(src,/주소 문구 없이 QR 코드만 저장됩니다/);
});
test('Supertonic accepts all ten voices and the official UI speed bounds; other engines remain restricted',()=>{
  const voices=['F1','F2','F3','F4','F5','M1','M2','M3','M4','M5'];
  for(const voice of voices)for(const speed of [.5,.91,1,1.37,2])assert.equal(validateSpeech('Hello',voice,speed,{voices,min:.5,max:2}),'Hello');
  for(const speed of [.49,2.01,NaN,Infinity])assert.throws(()=>validateSpeech('Hello','F1',speed,{voices,min:.5,max:2}));
  assert.throws(()=>validateSpeech('Hello','F2',1));assert.throws(()=>validateSpeech('Hello','F1',2));
});
test('Tools retain private local processing and real exports; no paid API or generated placeholders',()=>{
  for(const file of ['QrTool.tsx','WatermarkTool.tsx','VideoWatermark.tsx'])assert.doesNotMatch(read('app/tools/'+file),/api[_-]?key|Authorization|fetch\(['"]https?:/i);
  const video=read('app/tools/VideoWatermark.tsx');assert.match(video,/createMediaElementSource/);assert.match(video,/getAudioTracks/);assert.match(video,/MediaRecorder.isTypeSupported/);assert.match(video,/rec.onstop/);assert.match(video,/stream.getTracks\(\).forEach\(track=>track.stop\(\)\)/);
  const tts=read('app/tools/LocalNarration.tsx');assert.doesNotMatch(tts,/type="search"/);assert.match(tts,/voice-chips/);assert.ok(tts.indexOf('AUDIO PREVIEW')>tts.indexOf('onClick={generate}'));
  assert.ok(read('app/tools/studio-theme.css').includes('html[data-theme="dark"] .creative-tools'));
  assert.ok(read('app/components/ThemeSwitch.tsx').includes('prefers-color-scheme: dark'));
});
