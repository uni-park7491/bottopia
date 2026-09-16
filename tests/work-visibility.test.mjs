import {test} from 'node:test';
import assert from 'node:assert/strict';
import {patchWorkVisibility} from '../lib/work-visibility.ts';
import {sameSiteMutation} from '../lib/request-policy.ts';
const id='33333333-3333-4333-8333-333333333333';
const author='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const allowed={user:{id:author},isOwner:false,canUpload:true};
const request=(body,headers={})=>new Request('https://bottopia.studio/api/works/'+id,{method:'PATCH',headers:{'content-type':'application/json',origin:'https://bottopia.studio',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
// Executes the production handler with an in-memory query adapter, never the live database.
function fixture(access=allowed,{guardStatus=0,dbError=false,dbThrow=false}={}){
  const row={id,creator_id:author,published:false};const calls=[];
  const deps={access:async()=>access,guard:async(req,action,limit,user)=>{
    calls.push(['guard',action,limit,user]);
    if(!sameSiteMutation(req))return Response.json({error:'blocked'},{status:403});
    return guardStatus?Response.json({error:'blocked'},{status:guardStatus}):null;
  },admin:()=>{
    calls.push(['admin']);
    if(dbThrow)throw new Error('private internal configuration');
    return {from:table=>{
      assert.equal(table,'works');let payload;const filters=[];
      const query={update:value=>{payload=value;return query;},eq:(key,value)=>{filters.push([key,value]);return query;},select:columns=>{assert.equal(columns,'id,published');return query;},maybeSingle:async()=>{
        calls.push(['update',payload,filters]);
        if(dbError)return {data:null,error:new Error('private internal failure')};
        if(!filters.every(([key,value])=>row[key]===value))return {data:null,error:null};
        Object.assign(row,payload);return {data:{id:row.id,published:row.published},error:null};
      }};return query;
    }};
  }};
  return {row,calls,run:(body,headers={},workId=id)=>patchWorkVisibility(request(body,headers),Promise.resolve({id:workId}),deps)};
}
test('anonymous or missing authenticated ID cannot reach protection or database',async()=>{
  for(const access of [null,{...allowed,user:{id:''}}]){const f=fixture(access);assert.equal((await f.run({published:true})).status,401);assert.deepEqual(f.calls,[]);}
});
test('author can explicitly publish and withdraw; update itself includes ownership',async()=>{
  const f=fixture();
  for(const published of [true,false]){
    const response=await f.run({published});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.deepEqual(await response.json(),{ok:true,published});assert.equal(f.row.published,published);
  }
  for(const call of f.calls.filter(c=>c[0]==='update'))assert.deepEqual(call[2],[['id',id],['creator_id',author]]);
});
test('another approved member cannot publish or withdraw an author work',async()=>{
  const f=fixture({...allowed,user:{id:other}});
  for(const published of [true,false])assert.equal((await f.run({published})).status,404);
  assert.equal(f.row.published,false);
});
test('suspended author can withdraw but cannot publish; site owner retains moderation',async()=>{
  const f=fixture({...allowed,canUpload:false});f.row.published=true;
  assert.equal((await f.run({published:true})).status,403);assert.equal(f.row.published,true);
  assert.equal((await f.run({published:false})).status,200);assert.equal(f.row.published,false);
  const owner=fixture({...allowed,user:{id:other},isOwner:true});assert.equal((await owner.run({published:true})).status,200);
  assert.deepEqual(owner.calls.find(c=>c[0]==='update')[2],[['id',id]]);
});
test('cross-site, rate-limit and guard-unavailable responses cannot mutate anything',async()=>{
  for(const guardStatus of [429,503]){const f=fixture(allowed,{guardStatus});assert.equal((await f.run({published:true})).status,guardStatus);assert.equal(f.calls.some(c=>c[0]==='admin'),false);}
  const f=fixture();assert.equal((await f.run({published:true},{origin:'https://attacker.invalid'})).status,403);assert.equal(f.row.published,false);
});
test('forged owner/creator fields, nonbooleans, oversized JSON and bad IDs are rejected',async()=>{
  for(const body of [{published:true,isOwner:true},{published:true,creator_id:other},{published:'true'},[],{},'{',JSON.stringify({published:true})+' '.repeat(1024)]){
    const f=fixture();assert.equal((await f.run(body)).status,400);assert.equal(f.calls.some(c=>c[0]==='admin'),false);
  }
  const f=fixture();assert.equal((await f.run({published:true},{},'../works')).status,404);assert.equal(f.row.published,false);
});
test('database errors never expose internals or report publication success',async()=>{
  for(const options of [{dbError:true},{dbThrow:true}]){const f=fixture(allowed,options);const r=await f.run({published:true});assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/private internal/);assert.equal(f.row.published,false);}
});
