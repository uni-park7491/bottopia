import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/supabase/admin';
import { getOwnerUser } from '../../../../../lib/auth';
import { isSupabaseConfigured } from '../../../../../lib/supabase/config';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404, headers });

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const kind = request.nextUrl.searchParams.get('kind');
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id)
    || (kind !== 'video' && kind !== 'poster')
    || !isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return notFound();

  const admin = createAdminClient();
  const { data: work, error } = await admin.from('works')
    .select('published, video_key, poster_key').eq('id', id).maybeSingle();
  if (error) return NextResponse.json({ error: '영상을 불러오지 못했습니다.' }, { status: 503, headers });
  if (!work || (!work.published && !(await getOwnerUser()))) return notFound();
  const key = kind === 'video' ? work.video_key : work.poster_key;
  if (!key) return notFound();

  // The bucket stays private. Only published works (or the owner's drafts) receive a playback URL.
  const { data, error: signingError } = await admin.storage.from('works').createSignedUrl(key, 300);
  if (signingError || !data?.signedUrl) return notFound();
  return NextResponse.redirect(data.signedUrl, { status: 307, headers });
}
