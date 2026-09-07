import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase/server';
import { isSupabaseConfigured } from '../../../lib/supabase/config';
import { callbackOrigin, safeReturnPath } from '../../../lib/auth-policy';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeReturnPath(url.searchParams.get('next'));
  // Never use arbitrary forwarded-host headers to construct authentication redirects.
  const origin = callbackOrigin(request.url, request.headers.get('host'), process.env.NEXT_PUBLIC_SITE_URL, process.env.NODE_ENV === 'production');
  if (!origin) return NextResponse.json({ error: 'Site URL is not configured correctly.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  const failure = new URL('/login', origin);
  failure.searchParams.set('next', next);
  const lang = url.searchParams.get('lang') || 'ko';
  failure.searchParams.set('lang', ['ko', 'en', 'zh', 'ja'].includes(lang) ? lang : 'ko');
  failure.searchParams.set('error', isSupabaseConfigured ? 'oauth' : 'setup');
  if (isSupabaseConfigured && code && !url.searchParams.has('error')) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, origin), { headers: { 'Cache-Control': 'private, no-store' } });
    } catch { /* Show a safe retry page without exposing provider errors or tokens. */ }
  }
  return NextResponse.redirect(failure, { headers: { 'Cache-Control': 'private, no-store' } });
}
