import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CONNECTION_KEY, readConnection, saveConnection} from '../app/tools/desktop-connection.ts';
const token='a'.repeat(43);
function storage(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
test('connection survives a new page reader and is removed on disconnect',()=>{
 const store=storage();assert.equal(readConnection(store),'');
 assert.equal(saveConnection(store,token),true);assert.equal(readConnection(store),token);
 assert.equal(saveConnection(store,''),true);assert.equal(readConnection(store),'');
});
test('site data deletion and malformed data never restore a connection',()=>{
 const store=storage();saveConnection(store,token);store.removeItem(CONNECTION_KEY);
 assert.equal(readConnection(store),'');
 store.setItem(CONNECTION_KEY,'invalid');assert.equal(readConnection(store),'');
 assert.equal(saveConnection(store,'invalid'),false);
});
test('blocked browser storage does not throw or falsely report persistence',()=>{
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}};
 assert.equal(readConnection(blocked),'');assert.equal(saveConnection(blocked,token),false);assert.equal(saveConnection(blocked,''),false);
});
test('restoration checks the live connector and stale responses cannot save a token',()=>{
 const ui=readFileSync(new URL('../app/tools/DesktopNarration.tsx',import.meta.url),'utf8');
 assert.match(ui,/readConnection\(window.localStorage\)===token/);
 assert.match(ui,/connect\(controller.signal\)/);
 assert.match(ui,/attempt!==connectionAttempt.current/);
 assert.ok(ui.indexOf('if(data.protocol!==1)')<ui.indexOf('saved=saveConnection'));
 assert.match(ui,/controller.abort\(\)/);
 const parent=readFileSync(new URL('../app/tools/LocalNarration.tsx',import.meta.url),'utf8');
 assert.match(parent,/setDesktopToken\(readConnection\(window.localStorage\)\)/);
 assert.match(parent,/saveConnection\(window.localStorage, ''\)/);
});
