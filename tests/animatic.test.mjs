import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activeShot,timelineDuration,audioPosition} from '../lib/animatic.ts';
import {shotSchedule} from '../lib/story-builder.ts';
test('timeline advances exactly at shot boundaries and clamps last frame',()=>{
 const shots=shotSchedule(60,15);
 assert.equal(timelineDuration(shots),60);
 shots.forEach((s,i)=>{assert.equal(activeShot(shots,s.start),i);assert.equal(activeShot(shots,s.start+s.duration-.001),i);});
 assert.equal(activeShot(shots,60),shots.length-1);assert.equal(activeShot(shots,-1),0);
 assert.throws(()=>timelineDuration([{start:1,duration:10}]));
 assert.throws(()=>timelineDuration([{start:0,duration:Infinity}]));
});
test('audio offset gives silence outside selected track and correct seek inside',()=>{
 assert.equal(audioPosition(2,3,10),null);assert.equal(audioPosition(3,3,10),0);
 assert.equal(audioPosition(7,3,10),4);assert.equal(audioPosition(13,3,10),null);
 assert.equal(audioPosition(1,0,NaN),null);
});
