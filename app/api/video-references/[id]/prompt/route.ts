import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../lib/auth';
import { videoReferences } from '../../../../../lib/video-references';

export const dynamic = 'force-dynamic';
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (!(await getCurrentUser())) return NextResponse.json({ error: 'Sign in to access prompts' }, { status: 401, headers });
  const { id } = await params;
  const item = videoReferences.find(item => item.id === id);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404, headers });
  return NextResponse.json({ prompt: item.prompt, negativePrompt: '' }, { headers });
}
