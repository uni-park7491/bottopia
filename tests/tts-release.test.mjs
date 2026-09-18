import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, statSync} from 'node:fs';
import {desktopReleaseReview, connectorDownload, reviewLabel, sourceReadyCount} from '../app/tools/tts-release.ts';
import {execFileSync} from 'node:child_process';
import {desktopSpecs} from '../app/tools/desktop-tts.ts';
test('displayed source ZIP size matches the packaged file',()=>{
 const meta=JSON.parse(readFileSync(new URL('../app/tools/tts-download-size.json',import.meta.url),'utf8'));
 const bytes=statSync(new URL('../public/downloads/bottopia-qwen-source.zip',import.meta.url)).size;
 assert.equal(meta.qwenSource.bytes,bytes);
 assert.equal(meta.qwenSource.label,`${(bytes/1000).toFixed(1)} KB`);
 const ui=readFileSync(new URL('../app/tools/DesktopNarration.tsx',import.meta.url),'utf8');
 assert.match(ui,/downloadSize.qwenSource.label/);assert.match(ui,/4\.52 GB/);
});
test('every PC model has an explicit review reason, separate from runtime support',()=>{
  assert.deepEqual(Object.keys(desktopReleaseReview).sort(),Object.keys(desktopSpecs).sort());
  for(const [id,r] of Object.entries(desktopReleaseReview)){
    assert.ok(r.reason.length>10,id);
    assert.ok(['모델 조건 검토 중','모델별 조건 확인 필요','소스 배포 고지 준비됨'].includes(reviewLabel(id)));
  }
});
test('every known PC model offers source download independently of review status',()=>{
  assert.equal(connectorDownload('piper'),'/downloads/bottopia-tts-connector.zip');
  assert.equal(connectorDownload('unknown'),null);
  assert.equal(sourceReadyCount,2);
  assert.equal(connectorDownload('qwen-custom'),'/downloads/bottopia-qwen-source.zip');
  assert.equal(existsSync(new URL('../public/downloads/bottopia-tts-connector.zip',import.meta.url)),true);
  for(const id of Object.keys(desktopSpecs))assert.ok(connectorDownload(id));
  const src=readFileSync(new URL('../app/tools/DesktopNarration.tsx',import.meta.url),'utf8');
  assert.match(src,/downloadUrl &&/);
  assert.doesNotMatch(src,/href="\/downloads\/bottopia-tts-connector.zip"/);
  assert.match(src,/서명·공증/);
});
test('all-model source archive contains 16 recipes, docs and valid hashes, but no model weights',()=>{
 const meta=JSON.parse(readFileSync(new URL('../app/tools/tts-download-size.json',import.meta.url),'utf8'));
 assert.equal(meta.allSource.bytes,statSync(new URL('../public/downloads/bottopia-tts-connector.zip',import.meta.url)).size);
 execFileSync('python3',['-c',`
import zipfile,hashlib
z=zipfile.ZipFile('public/downloads/bottopia-tts-connector.zip');p='bottopia-tts-connector/'
ns={};exec(z.read(p+'catalog.py'),ns);assert len(ns['MODELS'])==16
assert z.read(p+'UNINSTALL.md')
assert z.read(p+'SOURCES.md')
assert not any(n.endswith(('.whl','.safetensors','.onnx','.exe','.dmg')) for n in z.namelist())
assert z.getinfo(p+'Start-Mac.command').external_attr>>16 & 0o111
for line in z.read(p+'SHA256SUMS.txt').decode().splitlines():
    expected,name=line.split('  ',1);assert hashlib.sha256(z.read(p+name)).hexdigest()==expected
`],{cwd:new URL('..',import.meta.url),stdio:'pipe'});
});
test('Qwen source ZIP contains notices, pinned recipes and no other installable models',()=>{
  execFileSync('python3',['-c',`
import zipfile,json,hashlib
from pathlib import Path
z=zipfile.ZipFile('public/downloads/bottopia-qwen-source.zip')
prefix='bottopia-qwen-source/'
ns={};exec(z.read(prefix+'catalog.py'),ns)
assert set(ns['MODELS'])=={'qwen-custom','qwen-design'}
assert set(ns['LANGUAGES'])=={'qwen-custom','qwen-design'}
assert not ns['REFERENCE_ALLOWED']
for model in ns['MODELS'].values(): assert '#sha256=' in model['packages'][0]
assert b'Copyright 2026 Alibaba Cloud' in z.read(prefix+'licenses/Qwen-Apache-2.0.txt')
assert b'Apache' in z.read(prefix+'QWEN-THIRD-PARTY-NOTICES.md')
assert not any(n.endswith(('.whl','.onnx','.safetensors','.exe','.dmg')) for n in z.namelist())
release=json.loads(z.read(prefix+'qwen-release.json'))
for spec in release['models'].values(): assert len(spec['revision'])==40
for line in z.read(prefix+'SHA256SUMS.txt').decode().splitlines():
    expected,name=line.split('  ',1);assert hashlib.sha256(z.read(prefix+name)).hexdigest()==expected
assert z.read(prefix+'runner.py')==Path('desktop/tts-connector/runner.py').read_bytes()
`],{cwd:new URL('..',import.meta.url),stdio:'pipe'});
});
