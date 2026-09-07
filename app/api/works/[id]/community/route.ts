import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../lib/auth';
import { isSiteOwner } from '../../../../../lib/auth-policy';
import { createAdminClient } from '../../../../../lib/supabase/admin';
import { isSupabaseConfigured } from '../../../../../lib/supabase/config';

export const dynamic = 'force-dynamic';

type CommentRow = { id: string; user_id: string; body: string; display_name: string; created_at: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const unavailable = () => NextResponse.json({ error: 'Community is temporarily unavailable' }, { status: 503 });

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ configured: false, signedIn: false, likes: 0, liked: false, comments: [] });
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ error: 'Invalid work id' }, { status: 400 });
  const user = await getCurrentUser();
  const admin = createAdminClient();
  const { data: work, error: workError } = await admin.from('works').select('id').eq('id', id).eq('published', true).maybeSingle();
  if (workError) return unavailable();
  if (!work) return NextResponse.json({ error: 'Work not found' }, { status: 404 });
  const [reactions, notes, likedResult] = await Promise.all([
    admin.from('work_reactions').select('*', { count: 'exact', head: true }).eq('work_id', id),
    admin.from('work_comments').select('id,user_id,body,display_name,created_at').eq('work_id', id).order('created_at', { ascending: false }).limit(30),
    user ? admin.from('work_reactions').select('work_id').eq('work_id', id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (reactions.error || notes.error || likedResult.error) return unavailable();
  const owner = isSiteOwner(user, process.env.SITE_OWNER_USER_ID, process.env.SITE_OWNER_EMAIL);
  return NextResponse.json({
    configured: true, signedIn: Boolean(user), likes: reactions.count ?? 0, liked: Boolean(likedResult.data),
    comments: (notes.data ?? []).map((comment) => { const row = comment as CommentRow; return { id: row.id, body: row.body, displayName: row.display_name, createdAt: row.created_at, mine: row.user_id === user?.id, canDelete: owner || row.user_id === user?.id }; }),
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return unavailable();
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ error: 'Invalid work id' }, { status: 400 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const admin = createAdminClient();
  const { data: work, error: workError } = await admin.from('works').select('id').eq('id', id).eq('published', true).maybeSingle();
  if (workError) return unavailable();
  if (!work) return NextResponse.json({ error: 'Work not found' }, { status: 404 });

  if (body.action === 'toggle_like') {
    const { data: existing, error: lookupError } = await admin.from('work_reactions').select('work_id').eq('work_id', id).eq('user_id', user.id).maybeSingle();
    if (lookupError) return unavailable();
    const result = existing
      ? await admin.from('work_reactions').delete().eq('work_id', id).eq('user_id', user.id)
      : await admin.from('work_reactions').insert({ work_id: id, user_id: user.id });
    if (result.error) return unavailable();
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'comment') {
    const content = typeof body.body === 'string' ? body.body.trim() : '';
    if (!content || content.length > 300) return NextResponse.json({ error: 'Comment must be 1–300 characters' }, { status: 400 });
    const metadata = user.user_metadata ?? {};
    const displayName = String(metadata.full_name || metadata.name || metadata.nickname || user.email?.split('@')[0] || 'BOTTOPIAN').slice(0, 60);
    const { error } = await admin.from('work_comments').insert({ work_id: id, user_id: user.id, body: content, display_name: displayName });
    if (error) return unavailable();
    return NextResponse.json({ ok: true }, { status: 201 });
  }
  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return unavailable();
  const { id } = await params;
  const commentId = request.nextUrl.searchParams.get('commentId');
  if (!uuid.test(id) || !commentId || !uuid.test(commentId)) return NextResponse.json({ error: 'Invalid work or comment id' }, { status: 400 });
  const admin = createAdminClient();
  let query = admin.from('work_comments').delete().eq('id', commentId).eq('work_id', id);
  if (!isSiteOwner(user, process.env.SITE_OWNER_USER_ID, process.env.SITE_OWNER_EMAIL)) query = query.eq('user_id', user.id);
  const { error } = await query;
  if (error) return unavailable();
  return NextResponse.json({ ok: true });
}
