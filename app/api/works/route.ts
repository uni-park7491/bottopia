import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase/admin';
import { isSupabaseConfigured } from '../../../lib/supabase/config';
import { getOwnerUser } from '../../../lib/auth';
import { ensureProfile, profilesById, toPublicCreator, type PublicProfile } from '../../../lib/profiles';

export const dynamic = 'force-dynamic';

type WorkRow = {
  id: string; slug: string; title: string; summary: string; category: string; tool: string; model: string;
  prompt: string; negative_prompt: string; video_key: string; poster_key: string | null; original_filename: string;
  content_type: string; file_size: number; duration_seconds: number | null; published: boolean; views: number;
  copies: number; created_at: string;
  creator_id?: string | null; work_type?: string; remix_of?: string | null; process_notes?: string; aspect_ratio?: string; seed?: string;
};

function serialize(row: WorkRow, creator: PublicProfile | null = null) {
  const url = (kind: 'video' | 'poster', key: string | null) => key ? `/api/works/${row.id}/media?kind=${kind}` : null;
  return {
    id: row.id, slug: row.slug, title: row.title, summary: row.summary, category: row.category,
    tool: row.tool, model: row.model, prompt: row.prompt, negativePrompt: row.negative_prompt,
    videoUrl: url('video', row.video_key), posterUrl: url('poster', row.poster_key), filename: row.original_filename,
    contentType: row.content_type, fileSize: row.file_size, durationSeconds: row.duration_seconds,
    published: row.published, views: row.views, copies: row.copies, createdAt: row.created_at,
    creator: creator ? toPublicCreator(creator) : null, workType: row.work_type ?? 'ORIGINAL', remixOf: row.remix_of ?? null,
    processNotes: row.process_notes ?? '', aspectRatio: row.aspect_ratio ?? '', seed: row.seed ?? '',
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
  const rows = (data ?? []) as WorkRow[];
  const profiles = await profilesById(admin, rows.map((row) => row.creator_id ?? ''));
  return NextResponse.json({ works: rows.map((row) => serialize(row, row.creator_id ? profiles.get(row.creator_id) ?? null : null)), configured: true }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
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
  const ensured = await ensureProfile(admin, owner);
  if (ensured.persisted && ensured.profile.role !== 'FOUNDING_CREATOR') {
    await admin.from('profiles').update({ role: 'FOUNDING_CREATOR', creator_status: 'APPROVED' }).eq('id', owner.id);
  }
  const baseRecord = {
    id, slug: `${slugBase}-${id.slice(0, 8)}`, title,
    summary: String(body.summary ?? '').trim().slice(0, 500), category: String(body.category ?? 'STORY').slice(0, 40),
    tool: String(body.tool ?? '').slice(0, 80), model: String(body.model ?? '').slice(0, 80), prompt,
    negative_prompt: String(body.negativePrompt ?? '').slice(0, 8000), video_key: videoKey,
    poster_key: body.posterKey || null, original_filename: String(body.originalFilename ?? 'video.mp4').slice(0, 255),
    content_type: String(body.contentType ?? 'video/mp4').slice(0, 100), file_size: Number(body.fileSize) || 0,
    duration_seconds: Number(body.durationSeconds) || null, published: Boolean(body.published), owner_email: owner.email ?? '',
  };
  const extendedRecord = {
    ...baseRecord,
    creator_id: ensured.persisted ? owner.id : null,
    work_type: ['ORIGINAL', 'COMMUNITY', 'REMIX'].includes(String(body.workType)) ? String(body.workType) : 'ORIGINAL',
    remix_of: /^[0-9a-f-]{36}$/i.test(String(body.remixOf ?? '')) ? String(body.remixOf) : null,
    process_notes: String(body.processNotes ?? '').trim().slice(0, 6000),
    aspect_ratio: String(body.aspectRatio ?? '').trim().slice(0, 30),
    seed: String(body.seed ?? '').trim().slice(0, 120),
  };
  let { error } = await admin.from('works').insert(extendedRecord);
  if (error && ['PGRST204', '42703', '42P01'].includes(error.code ?? '')) {
    ({ error } = await admin.from('works').insert(baseRecord));
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
