import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/auth';
import { createAdminClient } from '../../../lib/supabase/admin';
import { guardMutation } from '../../../lib/request-guard';
import { readJsonObject } from '../../../lib/request-policy';
import { parseKeywords, parseRecruitment } from '../../../lib/recruitment';

import {parsePrivateDetails} from '../../../lib/recruitment-private';
import {ownedFiles} from '../../../lib/recruitment-access';

export const dynamic = 'force-dynamic';
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
const unavailable = () => reply({ error: '모집 게시판 연결을 준비 중입니다. 잠시 후 다시 시도해 주세요.' }, 503);
export async function GET(request: Request) {
 try {
  const user = await getCurrentUser(), db = createAdminClient();
  const params = new URL(request.url).searchParams;
  const page = Math.min(1000, Math.max(0, Number(params.get('page')) || 0));
  if (!Number.isInteger(page)) return reply({ error: '잘못된 페이지입니다.' }, 400);
  const fields = 'id,title,body,tags,compensation,schedule,status,display_name,profile_handle,created_at,user_id' + ',contact_url,intro_urls';
  let query = db.from('recruitment_posts').select(fields).order('created_at', { ascending: false }).range(page * 20, page * 20 + 20);
  const tag = params.get('tag'); if (tag && tag.length <= 24) query = query.contains('tags', [tag]);
  const [posts, prefs, alerts, count] = await Promise.all([
   query,
   user ? db.from('recruitment_preferences').select('keywords').eq('user_id',user.id).maybeSingle() : Promise.resolve({ data:null,error:null }),
   user ? db.from('recruitment_notifications').select('id,post_id,matched_keywords,read_at,created_at,recruitment_posts(title,status)').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50) : Promise.resolve({data:[],error:null}),
   user ? db.from('recruitment_notifications').select('id',{count:'exact',head:true}).eq('user_id',user.id).is('read_at',null) : Promise.resolve({count:0,error:null}),
  ]);
  if (posts.error || prefs.error || alerts.error || count.error) return unavailable();
  return reply({ signedIn:!!user, posts:(posts.data || []).slice(0,20).map(row => { const { user_id, ...post } = row as unknown as Record<string,unknown>; return {...post,mine:user_id === user?.id}; }), hasMore:(posts.data?.length || 0)>20, keywords:prefs.data?.keywords || [], notifications:alerts.data || [], unread:count.count || 0 });
 } catch { return unavailable(); }
}
export async function POST(request: Request) {
 const user = await getCurrentUser(); if (!user) return reply({error:'로그인이 필요합니다.'},401);
 const blocked = await guardMutation(request,'recruitment',30,user.id); if (blocked) return blocked;
 const input = await readJsonObject(request,12000); if (!input) return reply({error:'입력 내용을 확인해 주세요.'},400);
 try {
  const db = createAdminClient();
  let privateData={};
  if ((input.action==='create'||input.action==='edit')&&input.privateDetails!==undefined){
   if(!input.privateDetails||typeof input.privateDetails!=='object'||Array.isArray(input.privateDetails))return reply({error:'비공개 입력을 확인하세요.'},400);
   const detail=parsePrivateDetails(input.privateDetails as Record<string,unknown>);
   if(!detail||input.privacyConsent!==true)return reply({error:'연락처와 자료 공개 범위 동의를 확인하세요.'},400);
   if(!await ownedFiles(detail.file_ids,user.id))return reply({error:'본인이 올린 첨부파일만 사용하세요.'},403);
   privateData=detail;
  }
  if (input.action === 'edit' || input.action === 'delete') {
   if (typeof input.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.id)) return reply({error:'잘못된 모집글입니다.'},400);
   const post = input.action === 'edit' ? parseRecruitment(input) : null;
   if (input.action === 'edit' && !post) return reply({error:'제목·소개·역할·일정과 https 연락 링크를 확인해 주세요.'},400);
   const query = input.action === 'delete' ? db.from('recruitment_posts').delete() : db.from('recruitment_posts').update({...post!,...privateData});
   const {data,error} = await query.eq('id',input.id).eq('user_id',user.id).select('id');
   return error ? unavailable() : data?.length ? reply({ok:true}) : reply({error:'본인의 모집글만 수정하거나 삭제할 수 있습니다.'},403);
  }
  if (input.action === 'create') {
   const post = parseRecruitment(input); if (!post) return reply({error:'제목·소개·역할·일정과 https 연락 링크를 확인해 주세요.'},400);
   const {data:profile,error} = await db.from('profiles').select('display_name,handle,creator_status').eq('id',user.id).maybeSingle();
   if (error) return unavailable();
   if (!profile || profile.creator_status === 'SUSPENDED') return reply({error:'먼저 크리에이터 프로필을 등록해 주세요.'},403);
   const result = await db.from('recruitment_posts').insert({...post,...privateData,user_id:user.id,display_name:profile.display_name,profile_handle:profile.handle}).select('id').single();
   return result.error ? unavailable() : reply({ok:true,id:result.data.id},201);
  }
  if (input.action === 'keywords') {
   const keywords = parseKeywords(input.keywords); if (!keywords) return reply({error:'키워드는 각 24자, 최대 8개입니다.'},400);
   const {error} = await db.from('recruitment_preferences').upsert({user_id:user.id,keywords,updated_at:new Date().toISOString()});
   return error ? unavailable() : reply({ok:true});
  }
  if (input.action === 'read') {
   if (typeof input.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.id)) return reply({error:'잘못된 알림입니다.'},400);
   const {error} = await db.from('recruitment_notifications').update({read_at:new Date().toISOString()}).eq('user_id',user.id).eq('id',input.id);
   return error ? unavailable() : reply({ok:true});
  }
  if (input.action === 'close') {
   if (typeof input.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.id)) return reply({error:'잘못된 모집글입니다.'},400);
   const {data,error} = await db.from('recruitment_posts').update({status:'closed'}).eq('id',input.id).eq('user_id',user.id).select('id');
   return error ? unavailable() : data?.length ? reply({ok:true}) : reply({error:'본인의 모집글만 마감할 수 있습니다.'},403);
  }
  return reply({error:'지원하지 않는 요청입니다.'},400);
 } catch { return unavailable(); }
}
