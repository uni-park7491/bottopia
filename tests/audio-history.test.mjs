import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const source=stripTypeScriptTypes(readFileSync(new URL('../app/tools/audio-history.ts',import.meta.url),'utf8'));
const {audioHistory}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const make=(owner,id)=>({id,owner,at:Date.now(),blob:new Blob(['audio'],{type:'audio/wav'}),seconds:1,text:'안녕하세요.',voice:'F1',engine:'supertonic',language:'ko'});
test('audio history persists real blobs across connections, sorts newest and separates accounts',async()=>{
 const first=make('one','first'); first.at=1;
 await audioHistory('one','save',first);
 await audioHistory('two','save',make('two','other'));
 await audioHistory('one','save',make('one','second'));
 const rows=await audioHistory('one');
 assert.deepEqual(rows.map(row=>row.id),['second','first']);
 assert.equal(await rows[0].blob.text(),'audio');
 assert.equal((await audioHistory('two')).length,1);
 await audioHistory('two','delete','first');
 assert.equal((await audioHistory('one')).length,2);
 await audioHistory('one','save',first);
 assert.equal((await audioHistory('one')).length,2);
 await audioHistory('one','delete','first');
 assert.equal((await audioHistory('one')).length,1);
});
test('history limit rejects new record without silently deleting existing audio',async()=>{
 for(let i=0;i<50;i++)await audioHistory('limit','save',make('limit',`limit-${i}`));
 await assert.rejects(audioHistory('limit','save',make('limit','overflow')));
 assert.equal((await audioHistory('limit')).length,50);
});
