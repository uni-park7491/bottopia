import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { ensureProfile } from '../../../../lib/profiles';
import { MAX_AVATAR_BYTES, normalizeAvatar } from '../../../../lib/avatar-image';
import { guardMutation } from '../../../../lib/request-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const blocked = await guardMutation(request, 'avatar', 12, user.id);
  if (blocked) return blocked;
  if (!request.headers.get('content-type')?.startsWith('image/')) return NextResponse.json({ error: '이미지를 선택해주세요.' }, { status: 415 });
  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({ error: '사진이 없습니다.' }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_AVATAR_BYTES) {
        await reader.cancel();
        return NextResponse.json({ error: '변환된 사진은 1MB 이하여야 합니다.' }, { status: 413 });
      }
      chunks.push(value);
    }
    let image: Buffer;
    try { image = await normalizeAvatar(Buffer.concat(chunks)); }
    catch { return NextResponse.json({ error: '읽을 수 없는 사진입니다. JPG, PNG, WebP 사진을 다시 선택해주세요.' }, { status: 400 }); }
    const admin = createAdminClient();
    const ensured = await ensureProfile(admin, user);
    if (!ensured.persisted) throw new Error('Profile unavailable');
    // A fixed, server-selected path: users cannot overwrite another member's image.
    const { error } = await admin.storage.from('works').upload('avatars/' + user.id + '/avatar.webp', image, { contentType: 'image/webp', upsert: true, cacheControl: '60' });
    if (error) throw error;
    return NextResponse.json({ ok: true, version: Date.now() }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: '사진을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.' }, { status: 503 });
  } finally { reader.releaseLock(); }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  try {
    const { data, error } = await createAdminClient().storage.from('works').download('avatars/' + user.id + '/avatar.webp');
    if (error || !data) return new Response(null, { status: 404 });
    return new Response(data, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new Response(null, { status: 503 }); }
}
