import {test} from 'node:test';import assert from 'node:assert/strict';
import {creatorCredit,imageContain,mockupSizes} from '../lib/promotion-mockup.ts';
test('profile credit cannot become an arbitrary URL or markup',()=>{
 assert.equal(creatorCredit(''),'');assert.equal(creatorCredit('bottopia'),'bottopia.studio/creators/bottopia');
 for(const s of ['https://evil.example','../profile','<script>','a','a?token=123'])assert.throws(()=>creatorCredit(s));
});
test('image containment preserves all of landscape and portrait artwork',()=>{
 assert.deepEqual(imageContain(200,100,10,20,100,100),{x:10,y:45,width:100,height:50});
 assert.deepEqual(imageContain(100,200,10,20,100,100),{x:35,y:20,width:50,height:100});
 assert.throws(()=>imageContain(0,100,0,0,100,100));assert.equal(Object.keys(mockupSizes).length,3);
});
