import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {parseKeywords,parseRecruitment} from '../lib/recruitment.ts';
import {readJsonObject,sameSiteMutation} from '../lib/request-policy.ts';
const source=readFileSync(new URL('../app/api/community/route.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source.replace(/^import .*;$/gm,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace(/export /g,'');
const build=new Function('NextResponse','getCurrentUser','createAdminClient','guardMutation','readJsonObject','parseKeywords','parseRecruitment',code+';return POST;');
const id='33333333-3333-4333-8333-333333333333';
const valid={title:'검증용 모집글',body:'영상 편집을 함께 진행할 동료를 찾는 테스트입니다.',tags:['영상'],schedule:'협의',contact:'https://example.com',compensation:'유료 협업'};
function fixture(user='author',failure=false){
 let row={...valid,id,user_id:'author'};const filters=[];let calls=0;
 const db={from:()=>{calls++;let operation,payload;const query={update:p=>{operation='edit';payload=p;return query;},delete:()=>{operation='delete';return query;},eq:(k,v)=>{filters.push([k,v]);return query;},select:async()=>{if(failure)return {error:{message:'private database secret'}};if(!row||!filters.every(([k,v])=>row[k]===v))return {data:[]};row=operation==='delete'?null:{...row,...payload};return {data:[{id}]};}};return query;}};
 const post=build(Response,async()=>user?{id:user}:null,()=>db,async r=>sameSiteMutation(r)?null:Response.json({}, {status:403}),readJsonObject,parseKeywords,parseRecruitment);
 return {get row(){return row;},get calls(){return calls;},filters,run:(action,extra={},origin='https://bottopia.studio')=>post(new Request('https://bottopia.studio/api/community',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({...valid,action,id,...extra})}))};
}
test('community author edits and deletes with ownership in database query',async()=>{
 for(const action of ['edit','delete']){const f=fixture();assert.equal((await f.run(action,{title:'수정된 모집 제목',user_id:'intruder'})).status,200);assert.deepEqual(f.filters,[['id',id],['user_id','author']]);if(action==='delete')assert.equal(f.row,null);else{assert.equal(f.row.title,'수정된 모집 제목');assert.equal(f.row.user_id,'author');}}
});
test('community non-author and anonymous cannot edit or delete',async()=>{
 for(const action of ['edit','delete'])for(const user of ['other',null]){const f=fixture(user);assert.equal((await f.run(action)).status,user?403:401);assert.equal(f.row.title,valid.title);if(!user)assert.equal(f.calls,0);}
});
test('community rejects cross-origin, invalid ID and invalid edit content',async()=>{
 for(const action of ['edit','delete']){const f=fixture();assert.equal((await f.run(action,{},'https://attacker.invalid')).status,403);assert.equal(f.calls,0);assert.equal((await f.run(action,{id:'bad'})).status,400);}
 for(const extra of [{body:'짧음'},{contact:'javascript:alert(1)'},{tags:[]}])assert.equal((await fixture().run('edit',extra)).status,400);
});
test('community database error cannot falsely report success or leak details',async()=>{
 for(const action of ['edit','delete']){const f=fixture('author',true);const r=await f.run(action);assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/secret/);assert.ok(f.row);}
});
