import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
test('runner emits stage data atomically without prompt or token information',()=>{
 const result=execFileSync('python3',['-c',`
import sys,tempfile,json
from pathlib import Path
sys.path.insert(0,'desktop/tts-connector')
from runner import progress
with tempfile.TemporaryDirectory() as d:
    output=Path(d)/'output.wav'
    for stage in ['preparing','downloading','loading','generating','encoding']:
        progress(output,stage)
        assert json.loads((Path(d)/'progress.json').read_text())=={'stage':stage}
        assert not (Path(d)/'progress.tmp').exists()
print('OK')
`],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
 assert.match(result,/OK/);
});
test('unknown completion percentage stays indeterminate and elapsed timer is cleaned up',()=>{
 const ui=readFileSync(new URL('../app/tools/DesktopNarration.tsx',import.meta.url),'utf8');
 assert.match(ui,/value=\{phase==='done'\?100:undefined\}/);
 assert.match(ui,/clearInterval\(id\)/);
 assert.match(ui,/setPhase\('receiving'\)/);
 assert.match(ui,/stages\[state.stage\]\?state.stage:'preparing'/);
 assert.match(ui,/setElapsed\(0\);setPhase\('request'\)/);
});
