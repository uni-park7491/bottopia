import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import { createAdminClient } from '../../../../lib/supabase/admin';
export async function GET(request:Request){
 const headers={'Cache-Control':'private, no-store'};
 const id=new URL(request.url).searchParams.get('id');
 if(!id||!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'잘못된 모집글입니다.'},{status:400,headers});
 try{const user=await getCurrentUser();const {data,error}=await createAdminClient().from('recruitment_posts').select('id,user_id,title,body,tags,compensation,schedule,status,display_name,profile_handle,created_at'+',contact_url,intro_urls').eq('id',id).maybeSingle();
 if(error)return NextResponse.json({error:'모집글을 불러올 수 없습니다.'},{status:503,headers});
 if(!data)return NextResponse.json({error:'모집글을 찾을 수 없습니다.'},{status:404,headers});
 const {user_id,...post}=data as unknown as Record<string,unknown>;
 return NextResponse.json({post:{...post,mine:user_id===user?.id}},{headers});
 }catch{return NextResponse.json({error:'잠시 후 다시 시도해 주세요.'},{status:503,headers});}
}
