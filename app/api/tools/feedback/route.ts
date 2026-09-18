import {NextResponse} from 'next/server';
import {getCurrentUser,getOwnerUser} from '../../../../lib/auth';
import {createAdminClient} from '../../../../lib/supabase/admin';
import {guardMutation} from '../../../../lib/request-guard';
import {readJsonObject} from '../../../../lib/request-policy';
import {FEEDBACK_TYPE,parseToolFeedback} from '../../../../lib/tool-feedback';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function POST(request:Request){
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({error:'로그인 후 피드백을 보낼 수 있습니다.'},{status:401,headers});
  const blocked=await guardMutation(request,'tool-feedback',5,user.id);
  if(blocked)return blocked;
  const data=parseToolFeedback(await readJsonObject(request,16000));
  if(!data)return NextResponse.json({error:'제목 2–100자, 내용 10–3,000자를 입력해주세요.'},{status:400,headers});
  try{
    // Existing server-only table: RLS enabled, anon/authenticated grants revoked.
    const {error}=await createAdminClient().from('project_inquiries').insert({
      name:data.title,contact:user.id,project_type:FEEDBACK_TYPE,timeline_budget:data.tool,brief:data.message,locale:'ko',status:'NEW',
    });
    if(error)throw error;
    return NextResponse.json({ok:true},{status:201,headers});
  }catch{return NextResponse.json({error:'저장하지 못했습니다. 작성 내용은 유지되니 잠시 후 다시 시도해주세요.'},{status:503,headers});}
}
export async function GET(request:Request){
  if(!(await getOwnerUser()))return NextResponse.json({error:'운영자만 조회할 수 있습니다.'},{status:403,headers});
  const raw=new URL(request.url).searchParams.get('page')||'0';
  if(!/^\d{1,5}$/.test(raw))return NextResponse.json({error:'잘못된 페이지입니다.'},{status:400,headers});
  const page=Number(raw);
  try{
    const {data,error}=await createAdminClient().from('project_inquiries').select('id,name,contact,timeline_budget,brief,created_at').eq('project_type',FEEDBACK_TYPE).order('created_at',{ascending:false}).order('id',{ascending:false}).range(page*20,page*20+20);
    if(error)throw error;
    return NextResponse.json({items:(data||[]).slice(0,20),hasMore:(data||[]).length>20},{headers});
  }catch{return NextResponse.json({error:'피드백을 불러오지 못했습니다.'},{status:503,headers});}
}
