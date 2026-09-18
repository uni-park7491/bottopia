import {parseIntroLinks} from '../lib/recruitment-links.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {parsePrivateDetails,uuidPattern,safeIntro} from '../lib/recruitment-private.ts';
import {readJsonObject} from '../lib/request-policy.ts';
const postId='11111111-1111-4111-8111-111111111111',appId='22222222-2222-4222-8222-222222222222';
function compile(path,names,values,end){const source=readFileSync(new URL(path,import.meta.url),'utf8').replace(/^import .*;$/gm,'');const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace(/export /g,'');return new Function(...names,code+';return '+end)(...values);}
function fixture(viewer,status='pending'){
 const rows={recruitment_posts:[{id:postId,user_id:'owner',status:'open',contact_type:'email',contact_value:'owner@example.test',file_ids:['owner-file']}],recruitment_applications:[{id:appId,post_id:postId,user_id:'applicant',display_name:'Applicant',message:'Test',status,contact_type:'phone',contact_value:'01000000000',file_ids:['app-file']},{id:'other-app',post_id:postId,user_id:'other',display_name:'Other applicant',status:'pending',contact_value:'never-disclose',file_ids:['other-file']}]};
 const db={from:table=>{let filters=[],patch;const q={select:()=>q,eq:(k,v)=>{filters.push(r=>r[k]===v);return q;},neq:(k,v)=>{filters.push(r=>r[k]!==v);return q;},order:()=>q,update:p=>{patch=p;return q;},maybeSingle:async()=>({data:rows[table].find(r=>filters.every(f=>f(r)))||null}),then:(resolve)=>{const data=rows[table].filter(r=>filters.every(f=>f(r)));if(patch)data.forEach(r=>Object.assign(r,patch));return Promise.resolve({data}).then(resolve);}};return q;}};
 const handlers=compile('../app/api/community/applications/route.ts',['getCurrentUser','createAdminClient','guardMutation','readJsonObject','parsePrivateDetails','safeIntro','parseIntroLinks','uuidPattern','fileMetadata','ownedFiles'],[async()=>viewer?{id:viewer}:null,()=>db,async()=>null,readJsonObject,parsePrivateDetails,safeIntro,parseIntroLinks,uuidPattern,async ids=>ids.map(id=>({id,name:id})),async()=>true],'{GET,POST}');
 return {rows,get:()=>handlers.GET(new Request('https://bottopia.studio/api/community/applications?post='+postId)),mutate:action=>handlers.POST(new Request('https://bottopia.studio/api/community/applications',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,id:appId,post:postId})}))};
}
test('private inputs validate email/phone/Kakao and bounded owned-file IDs',()=>{
 assert.ok(parsePrivateDetails({contactType:'email',contactValue:'a@example.test',fileIds:[]}));
 for(const value of [{contactType:'email',contactValue:'bad',fileIds:[]},{contactType:'phone',contactValue:'bad',fileIds:[]},{contactType:'kakao',contactValue:'a b',fileIds:[]},{contactType:'email',contactValue:'a@example.test',fileIds:['path/to/file']}])assert.equal(parsePrivateDetails(value),null);
});
test('outsider gets neither author private data nor applications; anonymous rejected',async()=>{
 const r=await fixture('outsider').get();const data=await r.json();assert.equal(data.author,null);assert.deepEqual(data.applications,[]);assert.equal((await fixture(null).get()).status,401);
});
test('pending applicant sees author files and own application, never other applicants or owner contact',async()=>{
 const j=await (await fixture('applicant').get()).json();assert.equal(j.author.contact_value,null);assert.equal(j.author.files[0].id,'owner-file');assert.equal(j.applications.length,1);assert.equal(j.applications[0].contact_value,'01000000000');assert.doesNotMatch(JSON.stringify(j),/never-disclose/);
});
test('recruiter sees applicant files but contacts only after acceptance',async()=>{
 let j=await (await fixture('owner').get()).json();assert.equal(j.author.contact_value,'owner@example.test');assert.equal(j.applications[0].contact_value,null);assert.equal(j.applications[0].files[0].id,'app-file');
 j=await (await fixture('owner','accepted').get()).json();assert.equal(j.applications[0].contact_value,'01000000000');
 j=await (await fixture('applicant','accepted').get()).json();assert.equal(j.author.contact_value,'owner@example.test');
});
test('only recruiter accepts; only own applicant withdraws; withdrawn loses author access',async()=>{
 for(const viewer of ['other','applicant','outsider'])assert.equal((await fixture(viewer).mutate('accept')).status,403);
 const owner=fixture('owner');assert.equal((await owner.mutate('accept')).status,200);assert.equal(owner.rows.recruitment_applications[0].status,'accepted');
 assert.equal((await fixture('other').mutate('withdraw')).status,403);const a=fixture('applicant');assert.equal((await a.mutate('withdraw')).status,200);const j=await (await a.get()).json();assert.equal(j.author,null);assert.deepEqual(j.applications,[]);
});

test('multiple contacts validate independently and normalize international numbers',()=>{
 const contacts={email:'a@example.test',phone:'2025550123',country:'US',kakao:'tester'};
 assert.equal(parsePrivateDetails({contacts,fileIds:[]}).contacts.phone,'+12025550123');
 assert.equal(parsePrivateDetails({contacts:{...contacts,country:'KR',phone:'01012345678'},fileIds:[]}).contacts.phone,'+821012345678');
 for(const change of [{email:'bad'},{phone:'12'},{country:'ZZ'},{kakao:'a b'}])assert.equal(parsePrivateDetails({contacts:{...contacts,...change},fileIds:[]}),null);
 assert.equal(parsePrivateDetails({contacts:{email:'',phone:'',country:'KR',kakao:''},fileIds:[]}),null);
});
test('multiple introduction links reject unsafe URLs and preserve valid values',()=>{
 assert.deepEqual(parseIntroLinks(['https://example.com','https://example.org','']),['https://example.com','https://example.org']);
 for(const links of [[],['javascript:alert(1)'],['https://u:p@example.com'],Array(6).fill('https://example.com')])assert.equal(parseIntroLinks(links),null);
});
