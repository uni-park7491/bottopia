import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { getOwnerUser } from '../../../../lib/auth';

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getOwnerUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const admin = createAdminClient();
  const { data: work } = await admin.from('works').select('video_key,poster_key').eq('id', id).maybeSingle();
  if (!work) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await admin.storage.from('works').remove([work.video_key, work.poster_key].filter(Boolean) as string[]);
  const { error } = await admin.from('works').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
