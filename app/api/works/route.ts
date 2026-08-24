import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase/admin';
import { isSupabaseConfigured } from '../../../lib/supabase/config';
import { getOwnerUser } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

type WorkRow = {
  id: string; slug: string; title: string; summary: string; category: string; tool: string; model: string;
  prompt: string; negative_prompt: string; video_key: string; poster_key: string | null; original_filename: string;
  content_type: string; file_size: number; duration_seconds: number | null; published: boolean; views: number;
  copies: number; created_at: string;
};

function serialize(row: WorkRow, admin: ReturnType<typeof createAdminClient>) {
  const url = (key: string | null) => key ? admin.storage.from('works').getPublicUrl(key).data.publicUrl : null;
  return {
    id: row.id, slug: row.slug, title: row.title, summary: row.summary, category: row.category,
    tool: row.tool, model: row.model, prompt: row.prompt, negativePrompt: row.negative_prompt,
    videoUrl: url(row.video_key), posterUrl: url(row.poster_key), filename: row.original_filename,
    contentType: row.content_type, fileSize: row.file_size, durationSeconds: row.duration_seconds,
    published: row.published, views: row.views, copies: row.copies, createdAt: row.created_at,
  };
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ works: [], configured: false });
  const studioScope = request.nextUrl.searchParams.get('scope') === 'all';
  if (studioScope && !(await getOwnerUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = createAdminClient();
  let query = admin.from('works').select('*').order('created_at', { ascending: false });
  if (!studioScope) query = query.eq('published', true);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ works: (data ?? []).map((row) => serialize(row as WorkRow, admin)), configured: true });
}

export async function POST(request: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const title = String(body.title ?? '').trim().slice(0, 100);
  const prompt = String(body.prompt ?? '').trim().slice(0, 16000);
  const videoKey = String(body.videoKey ?? '');
  if (!title || !prompt || !videoKey.startsWith('works/')) return NextResponse.json({ error: '제목, 프롬프트, 영상은 필수입니다.' }, { status: 400 });
  const id = videoKey.split('/')[1] || crypto.randomUUID();
  const slugBase = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9가-힣]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 55) || 'work';
  const admin = createAdminClient();
  const { error } = await admin.from('works').insert({
    id, slug: `${slugBase}-${id.slice(0, 8)}`, title,
    summary: String(body.summary ?? '').trim().slice(0, 500), category: String(body.category ?? 'STORY').slice(0, 40),
    tool: String(body.tool ?? '').slice(0, 80), model: String(body.model ?? '').slice(0, 80), prompt,
    negative_prompt: String(body.negativePrompt ?? '').slice(0, 8000), video_key: videoKey,
    poster_key: body.posterKey || null, original_filename: String(body.originalFilename ?? 'video.mp4').slice(0, 255),
    content_type: String(body.contentType ?? 'video/mp4').slice(0, 100), file_size: Number(body.fileSize) || 0,
    duration_seconds: Number(body.durationSeconds) || null, published: Boolean(body.published), owner_email: owner.email,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
