import {parseIntroLinks} from '../lib/recruitment-links.ts';
// Disposable, clearly labelled integration fixtures; deletes only IDs created here.
import {createClient} from '@supabase/supabase-js';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import sharp from 'sharp';
import {parsePrivateDetails,safeIntro,uuidPattern} from '../lib/recruitment-private.ts';
import {readJsonObject,sameSiteMutation} from '../lib/request-policy.ts';
import {parseKeywords,parseRecruitment} from '../lib/recruitment.ts';
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
function compile(path,names,values,end){const source=readFileSync(new URL(path,import.meta.url),'utf8').replace(/^import .*;$/gm,'');const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace(/export /g,'');return new Function(...names,code+';return '+end)(...values);}
const access=compile('../lib/recruitment-access.ts',['createAdminClient'],[()=>db],'{ownedFiles,fileMetadata,mayReadFile}');
const {data:profiles,error}=await db.from('profiles').select('id').neq('creator_status','SUSPENDED').limit(2);if(error||profiles.length<2)throw Error('Need two existing active profiles, none will be created.');
const [owner,applicant]=profiles.map(p=>p.id),outsider=crypto.randomUUID(),postId=crypto.randomUUID(),fileIds=[crypto.randomUUID(),crypto.randomUUID()];
const paths=fileIds.map((id,i)=>`${i?applicant:owner}/${id}.pdf`);const bucket='recruitment-private';
function handlers(viewer){return compile('../app/api/community/applications/route.ts',['getCurrentUser','createAdminClient','guardMutation','readJsonObject','parsePrivateDetails','safeIntro','parseIntroLinks','uuidPattern','fileMetadata','ownedFiles'],[async()=>viewer?{id:viewer}:null,()=>db,async r=>sameSiteMutation(r)?null:Response.json({}, {status:403}),readJsonObject,parsePrivateDetails,safeIntro,parseIntroLinks,uuidPattern,access.fileMetadata,access.ownedFiles],'{GET,POST}');}
const get=async who=>{const r=await handlers(who).GET(new Request('https://bottopia.studio/api/community/applications?post='+postId));assert.equal(r.status,200);return r.json();};
const mutate=(who,body)=>handlers(who).POST(new Request('https://bottopia.studio/api/community/applications',{method:'POST',headers:{'content-type':'application/json',origin:'https://bottopia.studio'},body:JSON.stringify({...body,post:postId})}));
try{
 const {data:bucketData,error:be}=await db.storage.getBucket(bucket);if(be)throw be;assert.equal(bucketData.public,false);
 let fileViewer=owner;
 const fileRoute=compile('../app/api/community/files/route.ts',['sharp','getCurrentUser','createAdminClient','guardMutation','mayReadFile','uuidPattern'],[sharp,async()=>fileViewer?({id:fileViewer}):null,()=>db,async()=>null,access.mayReadFile,uuidPattern],'{POST,GET}');
 const bad=await fileRoute.POST(new Request('https://bottopia.studio/api/community/files',{method:'POST',headers:{'content-type':'image/png'},body:'not a png'}));assert.equal(bad.status,400);
 const png=await sharp({create:{width:2,height:2,channels:3,background:'#ffffff'}}).png().toBuffer();
 const upload=await fileRoute.POST(new Request('https://bottopia.studio/api/community/files',{method:'POST',headers:{'content-type':'image/png','x-file-name':'test.png'},body:png}));assert.equal(upload.status,201);const uploaded=(await upload.json()).file;fileIds.push(uploaded.id);paths.push(`${owner}/${uploaded.id}.png`);
 const download=await fileRoute.GET(new Request('https://bottopia.studio/api/community/files?id='+uploaded.id));assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/^attachment/);assert.equal(download.headers.get('cache-control'),'private, no-store');
 fileViewer=outsider;assert.equal((await fileRoute.GET(new Request('https://bottopia.studio/api/community/files?id='+uploaded.id))).status,403);fileViewer=null;assert.equal((await fileRoute.GET(new Request('https://bottopia.studio/api/community/files?id='+uploaded.id))).status,401);
 for(let i=0;i<2;i++){const pdf=Buffer.from('%PDF-1.4\n% disposable recruitment access test\n%%EOF');const u=await db.storage.from(bucket).upload(paths[i],pdf,{contentType:'application/pdf'});if(u.error)throw u.error;const f=await db.from('recruitment_files').insert({id:fileIds[i],user_id:i?applicant:owner,path:paths[i],name:'access-test.pdf',mime:'application/pdf',size:pdf.length});if(f.error)throw f.error;}
 const p=await db.from('recruitment_posts').insert({id:postId,user_id:owner,display_name:'자동 검증용 임시 데이터',title:'[자동검증 전용] 실제 모집이 아닙니다',body:'개인정보 권한 검증용 임시 모집글이며 테스트 직후 자동 삭제됩니다.',tags:['__access_test__'],compensation:'협의',schedule:'2026-12-01',contact_url:'https://example.com',contact_type:'email',contact_value:'owner@example.test',file_ids:[fileIds[0]]});if(p.error)throw p.error;
 const main=compile('../app/api/community/route.ts',['NextResponse','getCurrentUser','createAdminClient','guardMutation','readJsonObject','parseKeywords','parseRecruitment','parsePrivateDetails','ownedFiles'],[Response,async()=>({id:owner}),()=>db,async()=>null,readJsonObject,parseKeywords,parseRecruitment,parsePrivateDetails,access.ownedFiles],'{GET,POST}');
 const edit=await main.POST(new Request('https://bottopia.studio/api/community',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'edit',id:postId,title:'[자동검증 전용] 실제 모집이 아닙니다',body:'개인정보 권한 검증용 임시 모집글이며 테스트 직후 자동 삭제됩니다.',tags:['__access_test__'],compensation:'협의',schedule:'2026-12-02',contact:'https://example.com',introLinks:['https://example.com','https://example.org/portfolio'],privateDetails:{contacts:{email:'owner@example.test',phone:'01012345678',country:'KR',kakao:'owner_test'},fileIds:[fileIds[0]]},privacyConsent:true})}));assert.equal(edit.status,200);
 const publicList=await main.GET(new Request('https://bottopia.studio/api/community?tag=__access_test__'));const published=(await publicList.json()).posts.find(p=>p.id===postId);assert.ok(published);for(const key of ['contact_value','contact_type','contacts','file_ids'])assert.equal(key in published,false);
 assert.equal(published.intro_urls.length,2);assert.equal((await get(owner)).author.contacts.phone,'+821012345678');
 assert.equal((await get(outsider)).author,null);assert.equal(await access.mayReadFile(fileIds[0],applicant),null);
 const a=await mutate(applicant,{action:'apply',message:'권한 검증용 지원서입니다. 실제 지원이 아닙니다.',introUrl:'https://example.com',introLinks:['https://example.com','https://example.org/work'],contacts:{email:'applicant@example.test',phone:'2025550123',country:'US',kakao:'applicant_test'},fileIds:[fileIds[1]],consent:true});assert.equal(a.status,201,await a.text());
 let ownerView=await get(owner),appView=await get(applicant);assert.equal(ownerView.applications[0].contact_value,null);assert.equal(appView.author.contact_value,null);assert.equal(appView.author.contacts,null);assert.equal(ownerView.applications[0].contacts,null);assert.equal(appView.applications[0].intro_urls.length,2);assert.equal(ownerView.applications[0].files[0].id,fileIds[1]);assert.equal(appView.author.files[0].id,fileIds[0]);
 assert.ok(await access.mayReadFile(fileIds[0],applicant));assert.ok(await access.mayReadFile(fileIds[1],owner));assert.equal(await access.mayReadFile(fileIds[1],outsider),null);assert.equal((await get(outsider)).applications.length,0);
 const aid=ownerView.applications[0].id;assert.equal((await mutate(applicant,{action:'accept',id:aid})).status,403);assert.equal((await mutate(owner,{action:'accept',id:aid})).status,200);
 assert.equal((await get(owner)).applications[0].contact_value,'applicant@example.test');assert.equal((await get(applicant)).author.contact_value,'owner@example.test');
 assert.equal((await get(owner)).applications[0].contacts.phone,'+12025550123');assert.equal((await get(applicant)).author.contacts.kakao,'owner_test');
 assert.equal((await mutate(applicant,{action:'withdraw',id:aid})).status,200);assert.equal((await get(applicant)).author,null);assert.equal(await access.mayReadFile(fileIds[0],applicant),null);assert.equal(await access.mayReadFile(fileIds[1],owner),null);
 const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
 assert.ok((await anon.from('recruitment_applications').select('*')).error);
 assert.ok((await anon.storage.from(bucket).download(paths[0])).error);
 console.log('PASS: real DB/storage; apply, role boundaries, pending contact redaction, acceptance, withdrawal, anonymous denial. Auth identities injected into production handlers; not an OAuth end-to-end test.');
}finally{
 const p=await db.from('recruitment_posts').delete().eq('id',postId).eq('title','[자동검증 전용] 실제 모집이 아닙니다');if(p.error)throw p.error;
 const s=await db.storage.from(bucket).remove(paths);if(s.error)throw s.error;
 const f=await db.from('recruitment_files').delete().in('id',fileIds);if(f.error)throw f.error;
 console.log('Fixture post, applications and files cleaned up.');
}
