import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { getOwnerUser } from '../../../../lib/auth';

const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export async function POST(request: Request) {
  if (!(await getOwnerUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name, type, size, kind, workId: requestedWorkId } = await request.json();
  const isVideo = kind === 'video';
  const allowed = isVideo ? VIDEO_TYPES : IMAGE_TYPES;
  const maxBytes = isVideo ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
  if (!allowed.has(type) || !Number.isFinite(size) || size <= 0 || size > maxBytes) {
    return NextResponse.json({ error: isVideo ? '지원되는 영상은 MP4, WebM, MOV이며 최대 500MB입니다.' : '커버는 JPG, PNG, WebP, AVIF 형식으로 10MB 이하만 가능합니다.' }, { status: 400 });
  }
  const workId = requestedWorkId || crypto.randomUUID();
  const ext = String(name).split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || (isVideo ? 'mp4' : 'jpg');
  const path = `works/${workId}/${isVideo ? 'video' : 'poster'}.${ext}`;
  const { data, error } = await createAdminClient().storage.from('works').createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workId, path, token: data.token });
}
