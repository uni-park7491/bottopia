import {execFileSync} from 'node:child_process';
import {mkdirSync, existsSync, statSync, writeFileSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const files=['connector.py','catalog.py','runner.py','README.md','UNINSTALL.md','SOURCES.md','LICENSE','test_connector.py','Start-Mac.command','Start-Windows.cmd','qwen-release.json','QWEN-THIRD-PARTY-NOTICES.md','licenses/Qwen-Apache-2.0.txt'];
if (process.argv.includes('--all-source')) {
  execFileSync('python3',['-c',`
import zipfile,hashlib
from pathlib import Path
base=Path('desktop/tts-connector')
names=${JSON.stringify(files)}
contents={n:(base/n).read_bytes() for n in names}
contents['SHA256SUMS.txt']=('\\n'.join(hashlib.sha256(v).hexdigest()+'  '+k for k,v in sorted(contents.items()))+'\\n').encode()
target=Path('public/downloads/bottopia-tts-connector.zip')
target.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED) as z:
    for name,data in sorted(contents.items()):
        info=zipfile.ZipInfo('bottopia-tts-connector/'+name,(2026,9,18,0,0,0))
        info.compress_type=zipfile.ZIP_DEFLATED
        info.external_attr=(0o100755 if name.endswith('.command') else 0o100644)<<16
        z.writestr(info,data)
print('All-model connector source ZIP built; weights and third-party binaries excluded.')
`],{cwd:root,stdio:'inherit'});
  const metaPath=new URL('../app/tools/tts-download-size.json',import.meta.url);
  const meta=JSON.parse(readFileSync(metaPath,'utf8'));
  const bytes=statSync(new URL('../public/downloads/bottopia-tts-connector.zip',import.meta.url)).size;
  meta.allSource={bytes,label:`${(bytes/1000).toFixed(1)} KB`};
  writeFileSync(metaPath,JSON.stringify(meta,null,2)+'\n');
  process.exit(0);
}
if (process.argv.includes('--qwen-source')) {
  execFileSync('python3', ['-c', `
import json, runpy, zipfile, hashlib
from pathlib import Path
base=Path('desktop/tts-connector')
release=json.loads((base/'qwen-release.json').read_text())
assert release['scope']=='connector-source-only'
assert release['license']=='Apache-2.0'
assert not release['bundlesWeights'] and not release['bundlesThirdPartyBinaries']
allowed={'qwen-custom','qwen-design'}
assert set(release['models'])==allowed
catalog=runpy.run_path(str(base/'catalog.py'))
recipes={k:v.copy() for k,v in catalog['MODELS'].items() if k in allowed}
for recipe in recipes.values():
    recipe['packages']=[release['package']['url']+'#sha256='+release['package']['sha256']]
data={k:(recipes if k=='MODELS' else {m:v for m,v in catalog[k].items() if m in allowed}) for k in ['MODELS','LANGUAGES','VOICES']}
catalog_text='"""Qwen-only source release; other recipes are not included."""\\n'
catalog_text+='\\n'.join(k+' = '+repr(v) for k,v in data.items())
catalog_text+='\\nREFERENCE_REQUIRED = set()\\nREFERENCE_ALLOWED = set()\\n'
files={n:(base/n).read_bytes() for n in ['connector.py','runner.py','UNINSTALL.md','LICENSE','Start-Mac.command','Start-Windows.cmd','qwen-release.json','QWEN-THIRD-PARTY-NOTICES.md','licenses/Qwen-Apache-2.0.txt']}
files['README.md']=(base/'QWEN-README.md').read_bytes()
files['catalog.py']=catalog_text.encode()
files['SHA256SUMS.txt']=('\\n'.join(hashlib.sha256(v).hexdigest()+'  '+k for k,v in sorted(files.items()))+'\\n').encode()
target=Path('public/downloads/bottopia-qwen-source.zip')
target.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED) as z:
    for name,content in sorted(files.items()):
        info=zipfile.ZipInfo('bottopia-qwen-source/'+name,(2026,9,18,0,0,0))
        info.compress_type=zipfile.ZIP_DEFLATED
        info.external_attr=(0o100755 if name.endswith('.command') else 0o100644)<<16
        z.writestr(info,content)
print('Qwen source-only ZIP:', target, hashlib.sha256(target.read_bytes()).hexdigest())
`],{cwd:root,stdio:'inherit'});
  const bytes = statSync(new URL('../public/downloads/bottopia-qwen-source.zip', import.meta.url)).size;
  const metaPath=new URL('../app/tools/tts-download-size.json',import.meta.url);
  const meta=existsSync(metaPath)?JSON.parse(readFileSync(metaPath,'utf8')):{};
  writeFileSync(metaPath, JSON.stringify({...meta,qwenSource:{bytes,label:`${(bytes / 1000).toFixed(1)} KB`}},null,2)+'\n');
  process.exit(0);
}
// Review builds must never silently become public downloads.
const staging = new URL('../artifacts/tts-license-review/', import.meta.url);
mkdirSync(staging,{recursive:true});
execFileSync('python3',['-m','zipfile','-c','artifacts/tts-license-review/bottopia-tts-connector.zip',...files.map(f=>'desktop/tts-connector/'+f)],{cwd:root,stdio:'inherit'});
console.log('Review artifact only: artifacts/tts-license-review/bottopia-tts-connector.zip. Existing public downloads are unchanged; use --all-source to rebuild the authorized source release.');
