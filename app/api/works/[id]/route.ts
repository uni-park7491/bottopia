import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { getCurrentUser } from '../../../../lib/auth';
import { isSiteOwner } from '../../../../lib/auth-policy';
import { canManageWork } from '../../../../lib/upload-policy';
import { isSupabaseConfigured } from '../../../../lib/supabase/config';
import { profilesById, toPublicCreator } from '../../../../lib/profiles';
import { guardMutation } from '../../../../lib/request-guard';
import { getCreatorAccess } from '../../../../lib/creator-access';
import { patchWorkVisibility } from '../../../../lib/work-visibility';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'Archive not configured' }, { status: 503 });
  const { id } = await params;
  const admin = createAdminClient();
  const byId = /^[0-9a-f-]{36}$/i.test(id);
  const { data, error } = await admin.from('works').select('*').eq(byId ? 'id' : 'slug', id).eq('published', true).maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not read work' }, { status: 503 });
  if (!data) return NextResponse.json({ error: 'Work not found' }, { status: 404 });
  const profiles = await profilesById(admin, data.creator_id ? [data.creator_id] : []);
  const creator = data.creator_id ? profiles.get(data.creator_id) ?? null : null;
  let source = null;
  if (data.remix_of) {
    // Never expose a private source title/profile through a public remix.
    const result = await admin.from('works').select('id,title,creator_id').eq('id', data.remix_of).eq('published', true).maybeSingle();
    if (result.error) return NextResponse.json({ error: '원작 정보를 확인하지 못했습니다.' }, { status: 503 });
    if (result.data) {
      const authors = await profilesById(admin, result.data.creator_id ? [result.data.creator_id] : []);
      const author = result.data.creator_id ? authors.get(result.data.creator_id) : null;
      source = { id: result.data.id, title: result.data.title, creator: author ? toPublicCreator(author) : null };
    }
  }
  let remixes: Array<{ id: string; title: string; posterUrl: string | null; creator: unknown }> = [];
  if ('remix_of' in data) {
    const remixResult = await admin.from('works').select('id,title,poster_key,creator_id').eq('remix_of', data.id).eq('published', true).order('created_at', { ascending: false }).limit(12);
    if (!remixResult.error) {
      const remixProfiles = await profilesById(admin, (remixResult.data ?? []).map((row) => row.creator_id ?? ''));
      remixes = (remixResult.data ?? []).map((row) => { const remixCreator = row.creator_id ? remixProfiles.get(row.creator_id) ?? null : null; return { id: row.id, title: row.title, posterUrl: row.poster_key ? `/api/works/${row.id}/media?kind=poster` : null, creator: remixCreator ? toPublicCreator(remixCreator) : null }; });
    }
  }
  return NextResponse.json({ work: {
    id: data.id, slug: data.slug, title: data.title, summary: data.summary, category: data.category,
    tool: data.tool, model: data.model, prompt: data.prompt, negativePrompt: data.negative_prompt,
    videoUrl: `/api/works/${data.id}/media?kind=video`,
    posterUrl: data.poster_key ? `/api/works/${data.id}/media?kind=poster` : null,
    filename: data.original_filename, contentType: data.content_type, fileSize: data.file_size,
    durationSeconds: data.duration_seconds, views: data.views, copies: data.copies, createdAt: data.created_at,
    creator: creator ? toPublicCreator(creator) : null, workType: data.work_type ?? 'ORIGINAL', remixOf: data.remix_of ?? null,
    processNotes: data.process_notes ?? '', aspectRatio: data.aspect_ratio ?? '', seed: data.seed ?? '', remixes, source,
  } }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return patchWorkVisibility(request, params, { access: getCreatorAccess, guard: guardMutation, admin: createAdminClient });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await getCurrentUser();
  if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const blocked = await guardMutation(request, 'work-delete', 30, owner.id);
  if (blocked) return blocked;
  const { id } = await params;
  const admin = createAdminClient();
  const { data: work, error: readError } = await admin.from('works').select('video_key,poster_key,creator_id').eq('id', id).maybeSingle();
  if (readError) return NextResponse.json({ error: '작품을 확인하지 못했습니다.' }, { status: 503 });
  if (!work) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canManageWork(owner.id, work.creator_id, isSiteOwner(owner, process.env.SITE_OWNER_USER_ID, process.env.SITE_OWNER_EMAIL))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const removed = await admin.storage.from('works').remove([work.video_key, work.poster_key].filter(Boolean) as string[]);
  if (removed.error) return NextResponse.json({ error: '파일을 삭제하지 못했습니다. 다시 시도해주세요.' }, { status: 503 });
  const { error } = await admin.from('works').delete().eq('id', id);
  if (error) return NextResponse.json({ error: '작품 정보를 삭제하지 못했습니다. 다시 시도해주세요.' }, { status: 503 });
  return NextResponse.json({ ok: true });
}
