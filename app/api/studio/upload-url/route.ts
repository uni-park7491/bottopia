import { guardMutation } from '../../../../lib/request-guard';
import { readJsonObject } from '../../../../lib/request-policy';
import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { getCreatorAccess } from '../../../../lib/creator-access';
import { uploadError, MEMBER_UPLOADS_PER_HOUR } from '../../../../lib/upload-policy';

export async function POST(request: Request) {
  const access = await getCreatorAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!access.canUpload) return NextResponse.json({ error: '크리에이터 승인 후 업로드할 수 있습니다.' }, { status: 403 });
  const blocked = await guardMutation(request, 'upload-ticket', 30, access.user.id);
  if (blocked) return blocked;
  const body = await readJsonObject(request);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  const { type, size, kind, workId: requestedWorkId } = body;
  const isVideo = kind === 'video';
  const validationError = uploadError(kind, type, size);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  if (isVideo && !access.isOwner) {
    const limited = await guardMutation(request, 'member-video-ticket', MEMBER_UPLOADS_PER_HOUR, access.user.id);
    if (limited) return limited;
  }
  if (requestedWorkId && !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(String(requestedWorkId)))
    return NextResponse.json({ error: '올바른 작품 ID가 필요합니다.' }, { status: 400 });
  if (!isVideo && !requestedWorkId) return NextResponse.json({ error: '영상을 먼저 업로드해주세요.' }, { status: 400 });
  const workId = isVideo ? crypto.randomUUID() : requestedWorkId;
  const extensions: Record<string, string> = { 'video/mp4':'mp4', 'video/webm':'webm', 'video/quicktime':'mov', 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'image/avif':'avif' };
  const ext = extensions[String(type)];
  const prefix = access.isOwner ? 'works' : `members/${access.user.id}`;
  const path = `${prefix}/${workId}/${isVideo ? 'video' : 'poster'}.${ext}`;
  const admin = createAdminClient();
  if (!isVideo) {
    const { data: files, error: readError } = await admin.storage.from('works').list(`${prefix}/${workId}`, { limit: 10 });
    if (readError || !files?.some(file => /^video\.(mp4|webm|mov)$/.test(file.name))) return NextResponse.json({ error: '내가 업로드한 영상을 먼저 확인해주세요.' }, { status: 400 });
    const existing = await admin.from('works').select('id').eq('id', workId).maybeSingle();
    if (existing.error || existing.data) return NextResponse.json({ error: '이미 등록된 작품에는 파일을 추가할 수 없습니다.' }, { status: 409 });
  }
  const { data, error } = await admin.storage.from('works').createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: '업로드를 준비하지 못했습니다.' }, { status: 503 });
  return NextResponse.json({ workId, path, token: data.token }, { headers: { 'Cache-Control': 'private, no-store' } });
}
