// Unit-only platform doubles. These do not operate a browser or bypass file permissions.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getEventListeners} from 'node:events';
import {exportAnimatic} from '../app/tools/animatic-export.ts';
const shots=[{index:1,clip:1,start:0,duration:15,visual:'합성 테스트 장면',camera:'고정',audio:'없음'}];
function platform(t,mode){
  let stopped=0,cancelled=0;
  const frames=new Map();const track={stop(){stopped++;}};
  const stream={getTracks:()=>[track],addTrack(){}};
  const context={fillRect(){},fillText(){},measureText:text=>({width:text.length*12})};
  class Canvas{getContext(){return context;}captureStream(){return stream;}}
  const doc=new EventTarget();doc.hidden=false;doc.createElement=()=>new Canvas();
  const recorders=[];
  class Recorder{
    static isTypeSupported(){return true;}
    state='inactive';
    constructor(){recorders.push(this);}
    start(){if(mode==='start-error')throw new Error('start failed');this.state='recording';}
    stop(){this.state='inactive';if(mode!=='empty')this.ondataavailable?.({data:new Blob(['synthetic-frame'])});this.onstop?.();}
  }
  const globals={document:doc,HTMLCanvasElement:Canvas,MediaRecorder:Recorder,requestAnimationFrame:callback=>{const id=frames.size+1;frames.set(id,callback);return id;},cancelAnimationFrame:id=>{cancelled++;frames.delete(id);}};
  for(const [key,value]of Object.entries(globals)){
    const descriptor=Object.getOwnPropertyDescriptor(globalThis,key);
    Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
    t.after(()=>{if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});
  }
  return {doc,frames,get recorder(){return recorders.at(-1);},get stopped(){return stopped;},get cancelled(){return cancelled;}};
}
test('encoder startup failure releases tracks and removes listeners',async t=>{
  const p=platform(t,'start-error'),controller=new AbortController();
  await assert.rejects(exportAnimatic(shots,{},null,0,.7,controller.signal,()=>{}),/start failed/);
  assert.equal(p.stopped,1);assert.equal(getEventListeners(controller.signal,'abort').length,0);assert.equal(getEventListeners(p.doc,'visibilitychange').length,0);
});
test('frame failure rejects promptly and cleans up recorder',async t=>{
  const p=platform(t),controller=new AbortController();
  const pending=exportAnimatic(shots,{},null,0,.7,controller.signal,()=>{throw new Error('frame failed');});
  [...p.frames.values()][0](performance.now()+100);
  await assert.rejects(pending,/frame failed/);assert.equal(p.recorder.state,'inactive');assert.equal(p.stopped,1);assert.equal(p.frames.size,0);
});
test('abort stops recording, removes listeners and never returns partial output',async t=>{
  const p=platform(t),controller=new AbortController();
  const pending=exportAnimatic(shots,{},null,0,.7,controller.signal,()=>{});controller.abort();
  await assert.rejects(pending,/취소/);assert.equal(p.stopped,1);assert.equal(getEventListeners(p.doc,'visibilitychange').length,0);
});
test('successful encoder stop requires nonempty data',async t=>{
  const p=platform(t,'empty');
  const pending=exportAnimatic(shots,{},null,0,.7,new AbortController().signal,()=>{});
  p.recorder.stop();await assert.rejects(pending,/데이터가 생성되지/);assert.equal(p.stopped,1);
});
test('hidden tab and invalid sound options fail before capture',async t=>{
  const p=platform(t);p.doc.hidden=true;
  await assert.rejects(exportAnimatic(shots,{},null,0,.7,new AbortController().signal,()=>{}),/화면에 표시/);
  p.doc.hidden=false;
  await assert.rejects(exportAnimatic(shots,{},null,Infinity,.7,new AbortController().signal,()=>{}),/음량/);
  assert.equal(p.recorder,undefined);assert.equal(p.stopped,0);
});
