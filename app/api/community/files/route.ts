import sharp from 'sharp';
import {getCurrentUser} from '../../../../lib/auth';
import {createAdminClient} from '../../../../lib/supabase/admin';
import {guardMutation} from '../../../../lib/request-guard';
import {mayReadFile} from '../../../../lib/recruitment-access';
import {uuidPattern} from '../../../../lib/recruitment-private';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
const bucket='recruitment-private',limit=3*1024*1024;
export async function POST(request:Request){
 const user=await getCurrentUser();if(!user)return reply({error:'로그인이 필요합니다.'},401);
 const blocked=await guardMutation(request,'recruitment-upload',20,user.id);if(blocked)return blocked;
 try{
  const db=createAdminClient();const {count,error:ce}=await db.from('recruitment_files').select('id',{head:true,count:'exact'}).eq('user_id',user.id);if(ce)throw ce;
  if((count||0)>=30)return reply({error:'개인 첨부파일 한도는 30개입니다. 사용하지 않는 파일을 삭제하세요.'},429);
  const mime=request.headers.get('content-type');if(!['image/png','application/pdf'].includes(mime||''))return reply({error:'PDF·PNG만 가능합니다.'},400);
  const reader=request.body?.getReader();if(!reader)return reply({error:'파일이 없습니다.'},400);
  const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();return reply({error:'파일당 최대 3MB입니다.'},413);}chunks.push(value);}}finally{reader.releaseLock();}
  let bytes=Buffer.concat(chunks);if(!bytes.length)return reply({error:'빈 파일입니다.'},400);
  if(mime==='application/pdf'){if(bytes.subarray(0,5).toString()!=='%PDF-'||!bytes.subarray(-2048).includes(Buffer.from('%%EOF')))return reply({error:'올바른 PDF가 아닙니다.'},400);}
  else{if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return reply({error:'올바른 PNG가 아닙니다.'},400);bytes=await sharp(bytes,{limitInputPixels:16000000}).png().toBuffer();}
  if(bytes.length>limit)return reply({error:'변환 후 크기가 3MB를 초과합니다.'},413);
  const id=crypto.randomUUID(),ext=mime==='image/png'?'png':'pdf',path=`${user.id}/${id}.${ext}`;
  const raw=decodeURIComponent(request.headers.get('x-file-name')||`attachment.${ext}`);
  const stem=raw.replace(/[\x00-\x1f\x7f/\\]/g,'_').replace(/\.[^.]*$/,'').slice(0,140)||'attachment';
  const name=`${stem}.${ext}`;
  const {error:ue}=await db.storage.from(bucket).upload(path,bytes,{contentType:mime!,upsert:false});if(ue)throw ue;
  const {error:ie}=await db.from('recruitment_files').insert({id,user_id:user.id,path,name,mime,size:bytes.length});
  if(ie){await db.storage.from(bucket).remove([path]);throw ie;}
  return reply({file:{id,name,mime,size:bytes.length}},201);
 }catch{return reply({error:'첨부파일을 저장하지 못했습니다. 파일 형식과 연결을 확인하세요.'},503);}
}
export async function GET(request:Request){
 const user=await getCurrentUser();if(!user)return reply({error:'로그인이 필요합니다.'},401);
 if(new URL(request.url).searchParams.get('mine')==='1'){
  const {data,error}=await createAdminClient().from('recruitment_files').select('id,name,mime,size').eq('user_id',user.id).order('created_at',{ascending:false}).limit(30);
  return error?reply({error:'파일 목록을 불러오지 못했습니다.'},503):reply({files:data||[]});
 }
 const id=new URL(request.url).searchParams.get('id');if(!id||!uuidPattern.test(id))return reply({error:'잘못된 파일입니다.'},400);
 try{const file=await mayReadFile(id,user.id);if(!file)return reply({error:'파일을 열람할 권한이 없습니다.'},403);
 const {data,error}=await createAdminClient().storage.from(bucket).download(file.path);if(error||!data)throw error;
 return new Response(data,{headers:{...headers,'Content-Type':file.mime,'Content-Disposition':`attachment; filename="attachment.${file.mime==='image/png'?'png':'pdf'}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,'Content-Security-Policy':"sandbox; default-src 'none'"}});
 }catch{return reply({error:'파일을 내려받지 못했습니다.'},503);}
}
export async function DELETE(request:Request){
 const user=await getCurrentUser();if(!user)return reply({error:'로그인이 필요합니다.'},401);
 const blocked=await guardMutation(request,'recruitment-file-delete',30,user.id);if(blocked)return blocked;
 const id=new URL(request.url).searchParams.get('id');if(!id||!uuidPattern.test(id))return reply({error:'잘못된 파일입니다.'},400);
 try{const db=createAdminClient();const {data:file,error}=await db.from('recruitment_files').select('path').eq('id',id).eq('user_id',user.id).maybeSingle();if(error)throw error;if(!file)return reply({error:'본인 파일만 삭제할 수 있습니다.'},403);
 const {error:se}=await db.storage.from(bucket).remove([file.path]);if(se)throw se;
 const {error:de}=await db.from('recruitment_files').delete().eq('id',id).eq('user_id',user.id);if(de)throw de;return reply({ok:true});
 }catch{return reply({error:'파일 삭제에 실패했습니다.'},503);}
}
