import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { getOwnerUser } from '../../../../lib/auth';
import { uploadError } from '../../../../lib/upload-policy';

export async function POST(request: Request) {
  if (!(await getOwnerUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name, type, size, kind, workId: requestedWorkId } = await request.json();
  const isVideo = kind === 'video';
  const validationError = uploadError(kind, type, size);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  if (requestedWorkId && !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(requestedWorkId))
    return NextResponse.json({ error: '올바른 작품 ID가 필요합니다.' }, { status: 400 });
  const workId = requestedWorkId || crypto.randomUUID();
  const ext = String(name).split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || (isVideo ? 'mp4' : 'jpg');
  const path = `works/${workId}/${isVideo ? 'video' : 'poster'}.${ext}`;
  const { data, error } = await createAdminClient().storage.from('works').createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workId, path, token: data.token });
}
