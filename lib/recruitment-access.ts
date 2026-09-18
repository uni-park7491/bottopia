import 'server-only';
import {createAdminClient} from './supabase/admin';
export async function ownedFiles(ids:string[],user:string){
 if(!ids.length)return true;
 const {data,error}=await createAdminClient().from('recruitment_files').select('id').eq('user_id',user).in('id',ids);
 return !error&&data?.length===ids.length;
}
export async function fileMetadata(ids:string[]){
 if(!ids.length)return [];
 const {data,error}=await createAdminClient().from('recruitment_files').select('id,name,mime,size').in('id',ids);
 if(error)throw error;return data||[];
}
export async function mayReadFile(id:string,user:string){
 const db=createAdminClient();
 const {data:file,error}=await db.from('recruitment_files').select('*').eq('id',id).maybeSingle();
 if(error||!file)return null;
 if(file.user_id===user)return file;
 const {data:posts,error:pe}=await db.from('recruitment_posts').select('id').contains('file_ids',[id]);
 if(pe)return null;
 if(posts?.length){const {data:apps,error:ae}=await db.from('recruitment_applications').select('id').eq('user_id',user).neq('status','withdrawn').in('post_id',posts.map(p=>p.id)).limit(1);if(!ae&&apps?.length)return file;}
 const {data:apps,error:ae}=await db.from('recruitment_applications').select('post_id').contains('file_ids',[id]).neq('status','withdrawn');
 if(ae)return null;
 if(apps?.length){const {data:owner,error:oe}=await db.from('recruitment_posts').select('id').eq('user_id',user).in('id',apps.map(a=>a.post_id)).limit(1);if(!oe&&owner?.length)return file;}
 return null;
}
