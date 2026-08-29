import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getOwnerUser } from '../../../../../lib/auth';
import { createAdminClient } from '../../../../../lib/supabase/admin';
import { isSupabaseConfigured } from '../../../../../lib/supabase/config';

export const dynamic = 'force-dynamic';

type CommentRow = { id: string; user_id: string; body: string; display_name: string; created_at: string };

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ configured: false, signedIn: false, likes: 0, liked: false, comments: [] });
  const { id } = await params;
  const user = await getCurrentUser();
  const admin = createAdminClient();
  const [{ count }, { data: comments }, likedResult] = await Promise.all([
    admin.from('work_reactions').select('*', { count: 'exact', head: true }).eq('work_id', id),
    admin.from('work_comments').select('id,user_id,body,display_name,created_at').eq('work_id', id).order('created_at', { ascending: false }).limit(30),
    user ? admin.from('work_reactions').select('work_id').eq('work_id', id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return NextResponse.json({
    configured: true, signedIn: Boolean(user), likes: count ?? 0, liked: Boolean(likedResult.data),
    comments: (comments ?? []).map((comment) => { const row = comment as CommentRow; return { id: row.id, body: row.body, displayName: row.display_name, createdAt: row.created_at, mine: row.user_id === user?.id }; }),
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Google sign-in required' }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const admin = createAdminClient();
  const { data: work } = await admin.from('works').select('id').eq('id', id).eq('published', true).maybeSingle();
  if (!work) return NextResponse.json({ error: 'Work not found' }, { status: 404 });

  if (body.action === 'toggle_like') {
    const { data: existing } = await admin.from('work_reactions').select('work_id').eq('work_id', id).eq('user_id', user.id).maybeSingle();
    const result = existing
      ? await admin.from('work_reactions').delete().eq('work_id', id).eq('user_id', user.id)
      : await admin.from('work_reactions').insert({ work_id: id, user_id: user.id });
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'comment') {
    const content = String(body.body ?? '').trim().slice(0, 300);
    if (!content) return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
    const metadata = user.user_metadata ?? {};
    const displayName = String(metadata.full_name || metadata.name || user.email?.split('@')[0] || 'BOTTOPIAN').slice(0, 60);
    const { error } = await admin.from('work_comments').insert({ work_id: id, user_id: user.id, body: content, display_name: displayName });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 201 });
  }
  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const commentId = request.nextUrl.searchParams.get('commentId');
  if (!commentId) return NextResponse.json({ error: 'Comment id required' }, { status: 400 });
  const admin = createAdminClient();
  let query = admin.from('work_comments').delete().eq('id', commentId).eq('work_id', id);
  if (!(await getOwnerUser())) query = query.eq('user_id', user.id);
  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
