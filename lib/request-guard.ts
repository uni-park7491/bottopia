import 'server-only';
import { createHmac } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from './supabase/admin';
import { sameSiteMutation } from './request-policy';

// Durable, atomic limits work across serverless instances. Missing protection fails closed.
export async function guardMutation(request: Request, action: string, limit: number, userId?: string) {
  if (!sameSiteMutation(request, process.env.NEXT_PUBLIC_SITE_URL)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403 });
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return NextResponse.json({ error: '잠시 후 다시 시도해주세요.' }, { status: 503 });
  const address = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() : 'local';
  const identity = userId || address || 'unknown';
  const hash = createHmac('sha256', secret).update(action + ':' + identity).digest('hex');
  try {
    const { data, error } = await createAdminClient().rpc('bottopia_rate_limit', { p_key: hash, p_limit: limit, p_window_seconds: 3600 });
    if (error || typeof data?.allowed !== 'boolean') throw new Error('Limiter unavailable');
    if (!data.allowed) return NextResponse.json({ error: '요청이 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429, headers: { 'Retry-After': String(data.retry_after || 3600), 'Cache-Control': 'private, no-store' } });
    return null;
  } catch { return NextResponse.json({ error: '요청 보호 기능을 준비하고 있습니다. 잠시 후 다시 시도해주세요.' }, { status: 503 }); }
}
