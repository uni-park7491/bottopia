import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { isSupabaseConfigured } from '../../../../lib/supabase/config';
import { normalizeHandle } from '../../../../lib/profile-policy';
import { profileColumns, serializeProfile, toPublicCreator, type ProfileRow } from '../../../../lib/profiles';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ handle: string }> }) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'Creator profiles not configured' }, { status: 503 });
  const { handle: input } = await params;
  const handle = normalizeHandle(input);
  if (!handle) return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  const admin = createAdminClient();
  const result = await admin.from('profiles').select(await profileColumns(admin)).eq('handle', handle).maybeSingle().returns<ProfileRow>();
  if (result.error || !result.data) return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  const profile = serializeProfile(result.data as ProfileRow);
  const visible = profile.creatorStatus !== 'SUSPENDED' && (profile.creatorStatus === 'APPROVED' || profile.role === 'FOUNDING_CREATOR' || profile.role === 'ADMIN');
  if (!visible) return NextResponse.json({ error: 'Creator not found' }, { status: 404 });

  const works = await admin.from('works').select('*').eq('creator_id', profile.id).eq('published', true).order('created_at', { ascending: false });
  const serializedWorks = (works.data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    category: row.category,
    tool: row.tool,
    model: row.model,
    prompt: row.prompt,
    negativePrompt: row.negative_prompt,
    videoUrl: `/api/works/${row.id}/media?kind=video`,
    posterUrl: row.poster_key ? `/api/works/${row.id}/media?kind=poster` : null,
    durationSeconds: row.duration_seconds,
    copies: row.copies,
    createdAt: row.created_at,
    workType: row.work_type ?? 'ORIGINAL',
    remixOf: row.remix_of ?? null,
  }));

  return NextResponse.json({ profile: toPublicCreator(profile), works: serializedWorks }, { headers: { 'Cache-Control': 'no-store' } });
}
