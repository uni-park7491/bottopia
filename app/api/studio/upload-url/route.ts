import { guardMutation } from '../../../../lib/request-guard';
import { readJsonObject } from '../../../../lib/request-policy';
import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { getOwnerUser } from '../../../../lib/auth';
import { uploadError } from '../../../../lib/upload-policy';

export async function POST(request: Request) {
  if (!(await getOwnerUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const blocked = await guardMutation(request, 'upload-ticket', 30);
  if (blocked) return blocked;
  const body = await readJsonObject(request);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  const { type, size, kind, workId: requestedWorkId } = body;
  const isVideo = kind === 'video';
  const validationError = uploadError(kind, type, size);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  if (requestedWorkId && !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(String(requestedWorkId)))
    return NextResponse.json({ error: '올바른 작품 ID가 필요합니다.' }, { status: 400 });
  const workId = requestedWorkId || crypto.randomUUID();
  const extensions: Record<string, string> = { 'video/mp4':'mp4', 'video/webm':'webm', 'video/quicktime':'mov', 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'image/avif':'avif' };
  const ext = extensions[String(type)];
  const path = `works/${workId}/${isVideo ? 'video' : 'poster'}.${ext}`;
  const { data, error } = await createAdminClient().storage.from('works').createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: '업로드를 준비하지 못했습니다.' }, { status: 503 });
  return NextResponse.json({ workId, path, token: data.token }, { headers: { 'Cache-Control': 'private, no-store' } });
}
