import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const launcher=new URL('../desktop/tts-connector/Start-Mac.command',import.meta.url);
test('Trash execution is rejected with recovery instructions before starting Python',()=>{
 const root=mkdtempSync(join(tmpdir(),'bottopia-trash-test-'));
 const dir=join(root,'.Trash','connector');mkdirSync(dir,{recursive:true});
 const file=join(dir,'Start-Mac.command');copyFileSync(launcher,file);
 const result=spawnSync('/bin/sh',[file],{input:'\n',encoding:'utf8'});
 assert.equal(result.status,1);assert.match(result.stdout,/휴지통/);assert.match(result.stdout,/다시 넣기/);
 assert.doesNotMatch(result.stderr,/Operation not permitted/);
});
test('launcher selects Python 3.11 and passes an absolute path containing spaces',()=>{
 const root=mkdtempSync(join(tmpdir(),'bottopia-launcher-test-'));
 const dir=join(root,'folder with spaces');mkdirSync(dir);const bin=join(root,'bin');mkdirSync(bin);
 copyFileSync(launcher,join(dir,'Start-Mac.command'));writeFileSync(join(dir,'connector.py'),'# fixture');
 writeFileSync(join(bin,'python3.11'),'#!/bin/sh\nif [ "$1" = "-c" ]; then exit 0; fi\nprintf "%s\\n" "$@"\n',{mode:0o755});
 const result=spawnSync('/bin/sh',[join(dir,'Start-Mac.command')],{input:'\n',encoding:'utf8',env:{...process.env,PATH:bin+':/usr/bin:/bin'}});
 assert.equal(result.status,0);assert.ok(result.stdout.includes(join(dir,'connector.py')));assert.match(result.stdout,/menu/);
});
test('Mac entry points do not disable Gatekeeper or strip quarantine',()=>{
 const source=readFileSync(launcher,'utf8')+readFileSync(new URL('../desktop/macos/Launcher.swift',import.meta.url),'utf8');
 assert.doesNotMatch(source,/xattr|spctl.*disable|sudo/);
});
