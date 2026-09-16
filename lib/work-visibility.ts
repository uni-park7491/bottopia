import type { SupabaseClient } from '@supabase/supabase-js';
import { readJsonObject } from './request-policy.ts';

type Access = { user: { id: string }; isOwner: boolean; canUpload: boolean };
type Dependencies = {
  access: () => Promise<Access | null>;
  guard: (request: Request, action: string, limit: number, userId: string) => Promise<Response | null>;
  admin: () => SupabaseClient;
};
const headers = { 'Cache-Control': 'private, no-store' };
const failure = (error: string, status: number) => Response.json({ error }, { status, headers });

// The route supplies only server-side dependencies. No client-provided identity or owner flag.
export async function patchWorkVisibility(request: Request, params: Promise<{ id: string }>, deps: Dependencies): Promise<Response> {
  try {
    const access = await deps.access();
    if (!access?.user.id) return failure('Unauthorized', 401);
    const blocked = await deps.guard(request, 'work-visibility', 30, access.user.id);
    if (blocked) return blocked;
    const body = await readJsonObject(request, 1024);
    if (!body || typeof body.published !== 'boolean' || Object.keys(body).some(key => key !== 'published')) return failure('공개 여부만 변경할 수 있습니다.', 400);
    // Suspension blocks publication, but must not trap an author's work in public.
    if (body.published && !access.canUpload) return failure('크리에이터 승인 후 공개할 수 있습니다.', 403);
    const { id } = await params;
    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id)) return failure('Not found', 404);
    let query = deps.admin().from('works').update({ published: body.published }).eq('id', id);
    if (!access.isOwner) query = query.eq('creator_id', access.user.id);
    const { data, error } = await query.select('id,published').maybeSingle();
    if (error) return failure('공개 설정을 변경하지 못했습니다.', 503);
    if (!data) return failure('Not found', 404);
    return Response.json({ ok: true, published: data.published }, { headers });
  } catch {
    // Configuration/network failures must neither expose internals nor imply success.
    return failure('공개 설정을 확인할 수 없습니다. 잠시 후 다시 시도해주세요.', 503);
  }
}
