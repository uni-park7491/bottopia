import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/supabase/admin';
import { isSupabaseConfigured } from '../../../../../lib/supabase/config';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'Archive not configured' }, { status: 503 });
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'Invalid work id' }, { status: 400 });
  const admin = createAdminClient();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await admin.from('works').select('copies').eq('id', id).eq('published', true).maybeSingle();
    if (error) return NextResponse.json({ error: 'Could not read work' }, { status: 503 });
    if (!data) return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    // Compare-and-swap avoids overwriting another visitor's increment.
    const result = await admin.from('works').update({ copies: data.copies + 1 }).eq('id', id).eq('published', true).eq('copies', data.copies).select('copies').maybeSingle();
    if (result.error) return NextResponse.json({ error: 'Could not update count' }, { status: 503 });
    if (result.data) return NextResponse.json({ copies: result.data.copies });
  }
  return NextResponse.json({ error: 'Please retry' }, { status: 409 });
}
