import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getCurrentUser } from '../../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
export async function GET() {
  if (!await getCurrentUser()) return Response.json({ error: '로그인 후 내려받을 수 있습니다.' }, { status: 401, headers });
  try {
    // Fixed source only: no caller-controlled filesystem paths or execution.
    const source = await readFile(path.join(process.cwd(), 'scripts/local-narration.mjs'), 'utf8');
    return new Response(source, { headers: { ...headers, 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="local-narration.mjs"' } });
  } catch { return Response.json({ error: '도구 파일을 준비하지 못했습니다. 잠시 후 다시 시도해주세요.' }, { status: 503, headers }); }
}
