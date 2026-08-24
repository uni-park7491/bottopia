import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/supabase/admin';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data } = await admin.from('works').select('copies').eq('id', id).eq('published', true).maybeSingle();
  const copies = (data?.copies ?? 0) + 1;
  await admin.from('works').update({ copies }).eq('id', id).eq('published', true);
  return NextResponse.json({ copies });
}
