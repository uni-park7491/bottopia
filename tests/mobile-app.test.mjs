import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { readUploadDraft } from '../lib/upload-draft.ts';
import { uploadTransfer } from '../lib/upload-transfer.ts';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url),'utf8');

test('manifest installs one same-origin app with real correctly sized PNG icons', () => {
  const manifest = read('app/manifest.ts');
  assert.match(manifest, /display: 'standalone'/);
  assert.match(manifest, /start_url: '\/'/);
  assert.match(manifest, /scope: '\/'/);
  for (const size of [192,512]) {
    const png=readFileSync(new URL(`../public/app-icon-${size}.png`,import.meta.url));
    assert.equal(png.readUInt32BE(16),size); assert.equal(png.readUInt32BE(20),size);
  }
  assert.match(read('app/layout.tsx'),/viewportFit:'cover'/);
  assert.doesNotMatch(read('app/layout.tsx'),/userScalable:\s*false|maximumScale:\s*1/);
});

test('mobile navigation has touch targets, safe-area clearance and active-page state', () => {
  const ui=read('app/components/MobileApp.tsx'),css=read('app/mobile-app.css');
  assert.match(ui,/const paths = \['\/', '\/tools', '\/studio', '\/community', '\/profile'\]/);
  assert.match(ui,/aria-current=\{active/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/min-height:48px/);
  assert.match(css,/font-size:16px/);
});

test('install prompt is progressive, dismissible, localized and hidden in standalone mode', () => {
  const ui=read('app/components/MobileApp.tsx');
  assert.match(ui,/beforeinstallprompt/); assert.match(ui,/appinstalled/);
  assert.match(ui,/!standalone &&/); assert.match(ui,/await install.prompt\(\)/);
  assert.match(ui,/Safari/); assert.match(ui,/setHelp\(false\)/);
  for (const locale of ['ko','en','zh','ja']) assert.match(ui,new RegExp(`${locale}: \\{`));
});

function worker(fetchImpl) {
  const handlers={}; let matches=0;
  const self={location:{origin:'https://bottopia.studio'},addEventListener:(name,handler)=>{handlers[name]=handler;}};
  const context={self,URL,Response,fetch:fetchImpl,caches:{match:async path=>{assert.equal(path,'/offline.html');matches++;return new Response('offline');}}};
  vm.runInNewContext(read('public/sw.js'),context);
  return {handlers,matched:()=>matches};
}
test('worker does not intercept API, video, uploads or third-party requests', () => {
  const w=worker(()=>{throw Error('must not fetch');});
  for (const request of [
    {mode:'cors',method:'GET',url:'https://bottopia.studio/api/works'},
    {mode:'cors',method:'PUT',url:'https://storage.example/object'},
    {mode:'navigate',method:'GET',url:'https://other.example/'},
    {mode:'navigate',method:'POST',url:'https://bottopia.studio/api/works'},
  ]) w.handlers.fetch({request,respondWith:()=>assert.fail('private request intercepted')});
  assert.equal(w.matched(),0);
});
test('navigation is always network-first, with no private-page cache writes', async () => {
  const w=worker(async()=>new Response('fresh'));
  let response;
  w.handlers.fetch({request:{mode:'navigate',method:'GET',url:'https://bottopia.studio/studio'},respondWith:p=>response=p});
  assert.equal(await (await response).text(),'fresh'); assert.equal(w.matched(),0);
});
test('failed navigation has a static offline explanation instead of cached user data', async () => {
  const w=worker(async()=>{throw Error('offline');}); let response;
  w.handlers.fetch({request:{mode:'navigate',method:'GET',url:'https://bottopia.studio/profile'},respondWith:p=>response=p});
  assert.equal(await (await response).text(),'offline'); assert.equal(w.matched(),1);
});

test('draft restores only whitelisted text, not files, publication state or arbitrary objects', () => {
  assert.equal(readUploadDraft('bad'),null); assert.equal(readUploadDraft('[]'),null);
  assert.deepEqual(readUploadDraft(JSON.stringify({title:'hello',prompt:'p',published:true,video:'secret.mov',token:'secret',model:3})),{title:'hello',prompt:'p'});
  assert.equal(readUploadDraft(JSON.stringify({prompt:'x'.repeat(17000)})).prompt.length,16000);
  assert.match(read('app/studio/StudioUploader.tsx'),/bottopia-upload-draft:\$\{userId\}/);
  assert.match(read('app/studio/StudioUploader.tsx'),/sessionStorage.removeItem\(draftKey\)/);
});

function requestMock() {
  return {upload:{},headers:{},open(method,url){this.method=method;this.url=url;},setRequestHeader(k,v){this.headers[k]=v;},send(body){this.body=body;}};
}
test('signed upload uses SDK-compatible PUT multipart data and real byte progress', async () => {
  const xhr=requestMock(),percent=[];
  const result=uploadTransfer('https://storage.example/signed',new File(['video'],'test.mp4',{type:'video/mp4'}),p=>percent.push(p),()=>xhr);
  assert.equal(xhr.method,'PUT'); assert.equal(xhr.headers['x-upsert'],'false');
  assert.equal(xhr.body.get('cacheControl'),'3600'); assert.equal(xhr.body.get('').name,'test.mp4');
  xhr.upload.onprogress({lengthComputable:true,loaded:50,total:100});
  xhr.upload.onprogress({lengthComputable:true,loaded:100,total:100});
  assert.deepEqual(percent,[50,99]);
  xhr.status=200; xhr.onload(); await result; assert.deepEqual(percent,[50,99,100]);
});
test('failed signed upload never reports completion and can be retried', async () => {
  for (const failure of ['onerror','ontimeout','onabort','onload']) {
    const xhr=requestMock(),percent=[];
    const result=uploadTransfer('https://storage.example/signed',new File(['x'],'test.mp4'),p=>percent.push(p),()=>xhr);
    xhr.status=403; xhr[failure](); await assert.rejects(result); assert.ok(!percent.includes(100));
  }
});
test('mobile uploads retain approval and private defaults; only final saved records reach 100%', () => {
  assert.match(read('app/api/studio/upload-url/route.ts'),/if \(!access.canUpload\)/);
  assert.match(read('app/api/studio/upload-url/route.ts'),/signedUrl: data.signedUrl/);
  const ui=read('app/studio/StudioUploader.tsx');
  assert.ok(ui.indexOf('if (!response.ok) throw new Error(result.error') < ui.indexOf('setProgress(100)'));
  assert.match(ui,/status === 'error' \? '다시 시도하기'/);
  assert.doesNotMatch(ui,/name="published"[^>]*defaultChecked/);
});
