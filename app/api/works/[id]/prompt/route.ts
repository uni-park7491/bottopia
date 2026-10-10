import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../lib/auth';
import { createAdminClient } from '../../../../../lib/supabase/admin';

export const dynamic = 'force-dynamic';
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (!(await getCurrentUser())) return NextResponse.json({ error: 'Sign in to access prompts' }, { status: 401, headers });
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'Invalid work id' }, { status: 400, headers });
  const { data, error } = await createAdminClient().from('works').select('prompt,negative_prompt').eq('id', id).eq('published', true).maybeSingle();
  if (error) return NextResponse.json({ error: 'Prompt unavailable' }, { status: 503, headers });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404, headers });
  return NextResponse.json({ prompt: data.prompt, negativePrompt: data.negative_prompt }, { headers });
}
