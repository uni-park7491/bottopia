import { getCurrentUser } from '../../../../lib/auth';
import { characterEngineAvailable, getCharacterJob, startCharacterJob } from '../../../../lib/local-character-engine';
import { localCharacterRequestAllowed } from '../../../../lib/character-generation';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers });
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ error: '로그인이 필요합니다.' }, 401);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ available: await characterEngineAvailable(), message: '이미지 모델을 준비 중이거나 로컬 엔진이 연결되지 않았습니다. 준비 상태는 자동으로 다시 확인합니다.' });
  const job = getCharacterJob(id, user.id);
  if (!job) return json({ error: '작업이 없거나 만료되었습니다.' }, 404);
  if (new URL(request.url).searchParams.get('image') === '1' && job.state === 'done' && job.image) return new Response(new Uint8Array(job.image), { headers: { ...headers, 'Content-Type': 'image/png' } });
  return json({ state: job.state });
}
export async function POST(request: Request) {
  if (!localCharacterRequestAllowed(request.url, request.headers.get('origin'), process.env.NODE_ENV === 'development', request.headers.get('host'))) return json({ error: '현재 이 생성 엔진은 로컬 개발 화면에서만 연결됩니다.' }, 403);
  const user = await getCurrentUser();
  if (!user) return json({ error: '로그인이 필요합니다.' }, 401);
  // Bound streamed bodies too; Content-Length alone is not trusted.
  const reader = request.body?.getReader();
  if (!reader) return json({ error: '입력을 확인해주세요.' }, 400);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > 8000000) { await reader.cancel(); return json({ error: '사진 용량이 너무 큽니다.' }, 413); } chunks.push(value); }
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (typeof data.description !== 'string' || data.description.length > 1500) return json({ error: '설명을 1,500자 이내로 입력해주세요.' }, 400);
    let image: Buffer | undefined;
    if (data.image) { if (typeof data.image !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data.image)) return json({ error: '사진 형식을 확인해주세요.' }, 400); image = Buffer.from(data.image.split(',')[1], 'base64'); }
    if (!image && !data.description.trim()) return json({ error: '사진 또는 설명을 넣어주세요.' }, 400);
    return json({ id: await startCharacterJob(user.id, data.description, image) }, 202);
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'ENGINE_BUSY') return json({ error: '다른 이미지를 생성 중입니다. 완료 후 다시 시도해주세요.' }, 409);
    if (code === 'ENGINE_UNAVAILABLE') return json({ error: '이미지 모델 준비가 아직 끝나지 않았거나 로컬 엔진이 연결되지 않았습니다.' }, 503);
    return json({ error: '입력 이미지를 읽거나 생성 작업을 시작하지 못했습니다.' }, 400);
  }
}
