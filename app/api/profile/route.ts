import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/auth';
import { isSiteOwner } from '../../../lib/auth-policy';
import { normalizeHandle, normalizeSocialUrl, validHandle } from '../../../lib/profile-policy';
import { ensureProfile, publicProfileSelect, serializeProfile, type ProfileRow } from '../../../lib/profiles';
import { createAdminClient } from '../../../lib/supabase/admin';
import { isSupabaseConfigured } from '../../../lib/supabase/config';

export const dynamic = 'force-dynamic';

const unavailable = () => NextResponse.json({ error: '프로필 저장소를 준비하고 있습니다.' }, { status: 503 });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return unavailable();

  const admin = createAdminClient();
  const result = await ensureProfile(admin, user);
  let profile = result.profile;
  const owner = isSiteOwner(user, process.env.SITE_OWNER_USER_ID, process.env.SITE_OWNER_EMAIL);
  if (result.persisted && owner && profile.role !== 'FOUNDING_CREATOR') {
    const promoted = await admin.from('profiles').update({ role: 'FOUNDING_CREATOR', creator_status: 'APPROVED' })
      .eq('id', user.id).select(publicProfileSelect).single();
    if (promoted.data) profile = serializeProfile(promoted.data as ProfileRow);
  }
  if (result.persisted && owner && user.email) {
    await admin.from('works').update({ creator_id: user.id }).is('creator_id', null).eq('owner_email', user.email);
  }

  return NextResponse.json({ profile, persisted: result.persisted, owner }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return unavailable();
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });

  const handle = normalizeHandle(body.handle);
  const displayName = String(body.displayName ?? '').trim().slice(0, 60);
  if (!validHandle(handle)) return NextResponse.json({ error: '아이디는 영문 소문자·숫자·점·밑줄·하이픈으로 3–30자여야 합니다.' }, { status: 400 });
  if (!displayName) return NextResponse.json({ error: '표시 이름을 입력해주세요.' }, { status: 400 });

  const socialInput = {
    instagram_url: body.instagramUrl,
    x_url: body.xUrl,
    youtube_url: body.youtubeUrl,
    tiktok_url: body.tiktokUrl,
    website_url: body.websiteUrl,
  };
  const socialUrls: Record<string, string | null> = {};
  for (const [field, value] of Object.entries(socialInput)) {
    const raw = String(value ?? '').trim();
    const normalized = normalizeSocialUrl(raw);
    if (raw && !normalized) return NextResponse.json({ error: '소셜 링크는 안전한 https 주소로 입력해주세요.' }, { status: 400 });
    socialUrls[field] = normalized;
  }

  const admin = createAdminClient();
  const ensured = await ensureProfile(admin, user);
  if (!ensured.persisted) return unavailable();
  const updated = await admin.from('profiles').update({
    handle,
    display_name: displayName,
    bio: String(body.bio ?? '').trim().slice(0, 500),
    location: String(body.location ?? '').trim().slice(0, 80),
    tools: String(body.tools ?? '').trim().slice(0, 200),
    ...socialUrls,
    available_for_work: Boolean(body.availableForWork),
    updated_at: new Date().toISOString(),
  }).eq('id', user.id).select(publicProfileSelect).single();

  if (updated.error?.code === '23505') return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 409 });
  if (updated.error || !updated.data) return unavailable();
  return NextResponse.json({ profile: serializeProfile(updated.data as ProfileRow) });
}
