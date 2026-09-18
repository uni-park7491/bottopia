import {getCurrentUser} from '../../../../lib/auth';
import {createAdminClient} from '../../../../lib/supabase/admin';
import {guardMutation} from '../../../../lib/request-guard';
import {readJsonObject} from '../../../../lib/request-policy';
import {parsePrivateDetails,safeIntro,uuidPattern} from '../../../../lib/recruitment-private';
import {fileMetadata,ownedFiles} from '../../../../lib/recruitment-access';
import {parseIntroLinks} from '../../../../lib/recruitment-links';
const headers={'Cache-Control':'private, no-store'};
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
export async function GET(request:Request){
 const user=await getCurrentUser();if(!user)return reply({error:'로그인이 필요합니다.'},401);
 const id=new URL(request.url).searchParams.get('post');if(!id||!uuidPattern.test(id))return reply({error:'잘못된 모집글입니다.'},400);
 try{
  const db=createAdminClient();const {data:post,error}=await db.from('recruitment_posts').select('id,user_id,contact_type,contact_value,file_ids,status,contacts').eq('id',id).maybeSingle();
  if(error)throw error;if(!post)return reply({error:'모집글을 찾을 수 없습니다.'},404);
  const mine=post.user_id===user.id;
  let query=db.from('recruitment_applications').select('*').eq('post_id',id).neq('status','withdrawn').order('created_at',{ascending:false});
  if(!mine)query=query.eq('user_id',user.id);
  const {data:apps,error:ae}=await query;if(ae)throw ae;
  const accepted=!!apps?.some(a=>a.user_id===user.id&&a.status==='accepted');
  const allowed=mine||!!apps?.length;
  return reply({mine,open:post.status==='open',author:allowed?{contact_type:post.contact_type,contact_value:mine||accepted?post.contact_value:null,contacts:mine||accepted?post.contacts:null,files:await fileMetadata(post.file_ids||[])}:null,
   applications:await Promise.all((apps||[]).map(async a=>({id:a.id,display_name:a.display_name,message:a.message,intro_url:a.intro_url,intro_urls:a.intro_urls,status:a.status,contact_type:a.contact_type,contact_value:a.user_id===user.id||a.status==='accepted'?a.contact_value:null,contacts:a.user_id===user.id||a.status==='accepted'?a.contacts:null,files:await fileMetadata(a.file_ids||[])})))});
 }catch{return reply({error:'지원 정보를 불러오지 못했습니다. 다시 시도해 주세요.'},503);}
}
export async function POST(request:Request){
 const user=await getCurrentUser();if(!user)return reply({error:'로그인이 필요합니다.'},401);
 const blocked=await guardMutation(request,'recruitment-application',30,user.id);if(blocked)return blocked;
 const input=await readJsonObject(request,12000);if(!input||typeof input.post!=='string'||!uuidPattern.test(input.post))return reply({error:'잘못된 요청입니다.'},400);
 try{
  const db=createAdminClient();const {data:post,error}=await db.from('recruitment_posts').select('id,user_id,status').eq('id',input.post).maybeSingle();
  if(error)throw error;if(!post)return reply({error:'모집글을 찾을 수 없습니다.'},404);
  if(input.action==='apply'){
   if(post.user_id===user.id||post.status!=='open')return reply({error:'이 모집글에는 지원할 수 없습니다.'},403);
   const links=input.introLinks===undefined?null:parseIntroLinks(input.introLinks);
   const detail=parsePrivateDetails(input);const message=typeof input.message==='string'?input.message.trim():'';
   if(!detail||message.length<10||message.length>2000||!(links?.length||safeIntro(input.introUrl))||(input.introLinks!==undefined&&!links)||input.consent!==true)return reply({error:'소개·연락처·링크와 공개 범위 동의를 확인하세요.'},400);
   if(!await ownedFiles(detail.file_ids,user.id))return reply({error:'본인이 올린 파일만 첨부할 수 있습니다.'},403);
   const {data:profile,error:pe}=await db.from('profiles').select('display_name,creator_status').eq('id',user.id).maybeSingle();if(pe)throw pe;
   if(!profile||profile.creator_status==='SUSPENDED')return reply({error:'활성 크리에이터 프로필이 필요합니다.'},403);
   const payload={post_id:post.id,user_id:user.id,display_name:profile.display_name,message,intro_url:links?.[0]||input.introUrl,...(links?{intro_urls:links}:{}),...detail};
   const {data:existing,error:ee}=await db.from('recruitment_applications').select('id,status').eq('post_id',post.id).eq('user_id',user.id).maybeSingle();if(ee)throw ee;
   if(existing){
    if(existing.status!=='withdrawn')return reply({error:'이미 지원한 모집글입니다.'},409);
    const {data:restored,error:re}=await db.from('recruitment_applications').update({...payload,status:'pending',created_at:new Date().toISOString()}).eq('id',existing.id).eq('user_id',user.id).eq('status','withdrawn').select('id');
    if(re)throw re;return restored?.length?reply({ok:true}):reply({error:'지원 상태가 변경되었습니다. 새로고침해 주세요.'},409);
   }
   const {error:ie}=await db.from('recruitment_applications').insert(payload);
   if(ie?.code==='23505')return reply({error:'이미 지원한 모집글입니다.'},409);if(ie)throw ie;return reply({ok:true},201);
  }
  if(!['accept','withdraw'].includes(String(input.action))||typeof input.id!=='string'||!uuidPattern.test(input.id))return reply({error:'잘못된 요청입니다.'},400);
  if(input.action==='accept'&&(post.user_id!==user.id||post.status!=='open'))return reply({error:'모집 중인 글의 작성자만 확정할 수 있습니다.'},403);
  let query=db.from('recruitment_applications').update({status:input.action==='accept'?'accepted':'withdrawn'}).eq('post_id',post.id).eq('id',input.id);
  if(input.action==='withdraw')query=query.eq('user_id',user.id);else query=query.eq('status','pending');
  const {data,error:ue}=await query.select('id');if(ue)throw ue;return data?.length?reply({ok:true}):reply({error:'변경 권한이 없거나 이미 처리된 지원입니다.'},403);
 }catch{return reply({error:'저장하지 못했습니다. 다시 시도해 주세요.'},503);}
}
