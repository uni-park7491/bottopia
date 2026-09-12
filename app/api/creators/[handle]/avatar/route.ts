import { createAdminClient } from '../../../../../lib/supabase/admin';
import { validHandle } from '../../../../../lib/profile-policy';
export const dynamic = 'force-dynamic';
export async function GET(_: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  if (!validHandle(handle)) return new Response(null, { status: 404 });
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('id,role,creator_status').eq('handle', handle).maybeSingle();
    if (!profile || profile.creator_status === 'SUSPENDED' || !(profile.creator_status === 'APPROVED' || profile.role === 'FOUNDING_CREATOR' || profile.role === 'ADMIN')) return new Response(null, { status: 404 });
    const { data, error } = await admin.storage.from('works').download('avatars/' + profile.id + '/avatar.webp');
    if (error || !data) return new Response(null, { status: 404 });
    return new Response(data, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=60', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new Response(null, { status: 503 }); }
}
