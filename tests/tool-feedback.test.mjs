import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseToolFeedback} from '../lib/tool-feedback.ts';
import {isSiteOwner} from '../lib/auth-policy.ts';
import ts from 'typescript';
import {readJsonObject} from '../lib/request-policy.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function routeHarness({user=null,owner=null,blocked=null}={}){
 let reads=0,writes=0,inserted;
 const db={select(){reads++;return this;},eq(){return this;},order(){return this;},range:async()=>({data:[],error:null}),insert:async row=>{writes++;inserted=row;return {error:null};}};
 const source=read('app/api/tools/feedback/route.ts').replace(/^import .*;\n/gm,'').replace(/export /g,'');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const api=new Function('NextResponse','getCurrentUser','getOwnerUser','createAdminClient','guardMutation','readJsonObject','FEEDBACK_TYPE','parseToolFeedback',js+';return {GET,POST};')(Response,async()=>user,async()=>owner,()=>({from:()=>db}),async()=>blocked,readJsonObject,'TOOL_FEEDBACK',parseToolFeedback);
 return {api,counts:()=>({reads,writes,inserted})};
}
test('real route handlers reject anonymous and non-owner users before touching storage',async()=>{
 for(const user of [null,{id:'member'}]){
   const h=routeHarness({user});const response=await h.api.GET(new Request('http://localhost/api/tools/feedback'));
   assert.equal(response.status,403);assert.equal(h.counts().reads,0);
 }
 const h=routeHarness();assert.equal((await h.api.POST(new Request('http://localhost/api/tools/feedback',{method:'POST'}))).status,401);assert.equal(h.counts().writes,0);
});
test('member submission uses authenticated identity; owner can read; rate limits block writes',async()=>{
 const req=()=>new Request('http://localhost/api/tools/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tool:'audio',title:'테스트 제목',message:'테스트 피드백 내용입니다.',userId:'forged'})});
 const h=routeHarness({user:{id:'actual-member'},owner:{id:'actual-owner'}});
 assert.equal((await h.api.POST(req())).status,201);assert.equal(h.counts().inserted.contact,'actual-member');
 const response=await h.api.GET(new Request('http://localhost/api/tools/feedback'));
 assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'private, no-store');
 const limited=routeHarness({user:{id:'member'},blocked:Response.json({error:'limit'},{status:429})});
 assert.equal((await limited.api.POST(req())).status,429);assert.equal(limited.counts().writes,0);
});
test('feedback validates category and bounded title/body',()=>{
 assert.deepEqual(parseToolFeedback({tool:'audio',title:' 음성 오류 ',message:' 음성 생성이 끝나지 않습니다. '}),{tool:'audio',title:'음성 오류',message:'음성 생성이 끝나지 않습니다.'});
 for(const value of [null,{}, {tool:'__proto__',title:'오류',message:'가'.repeat(10)},{tool:'audio',title:'가',message:'가'.repeat(10)},{tool:'audio',title:'오류',message:'가'.repeat(3001)}])assert.equal(parseToolFeedback(value),null);
});
test('only configured owner, not role claims or unauthenticated visitors, can read feedback',()=>{
 assert.equal(isSiteOwner(null,'owner'),false);
 assert.equal(isSiteOwner({id:'member'},'owner'),false);
 assert.equal(isSiteOwner({id:'owner'},'owner'),true);
 const route=read('app/api/tools/feedback/route.ts');
 assert.ok(route.indexOf('if(!(await getOwnerUser()))')<route.indexOf(".select('id,name"));
 assert.match(route,/if\(!user\).*status:401/);
 assert.match(route,/guardMutation\(request,'tool-feedback',5,user.id\)/);
 assert.match(route,/contact:user.id/);
 assert.match(route,/private, no-store/);
 assert.match(route,/readJsonObject\(request,16000\)/);
 assert.match(route,/\.eq\('project_type',FEEDBACK_TYPE\)/);
 const sql=read('supabase/schema.sql');
 assert.match(sql,/project_inquiries enable row level security/);
 assert.match(sql,/revoke all on [^;]*project_inquiries from anon, authenticated/);
});
test('feedback text is rendered as text and never exposed to ordinary page visitors',()=>{
 const ui=read('app/tools/feedback/ToolFeedback.tsx');
 assert.doesNotMatch(ui,/dangerouslySetInnerHTML/);
 assert.match(ui,/owner&&<section/);
 assert.match(ui,/\{item.brief\}/);
 assert.match(ui,/minLength=\{10\}/);
});
