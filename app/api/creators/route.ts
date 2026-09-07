import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase/admin';
import { isSupabaseConfigured } from '../../../lib/supabase/config';
import { publicProfileSelect, serializeProfile, toPublicCreator, type ProfileRow } from '../../../lib/profiles';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ creators: [], configured: false });
  const admin = createAdminClient();
  const result = await admin.from('profiles').select(publicProfileSelect)
    .or('creator_status.eq.APPROVED,role.eq.FOUNDING_CREATOR,role.eq.ADMIN')
    .order('created_at', { ascending: true });
  if (result.error) return NextResponse.json({ creators: [], configured: false });

  const profiles = (result.data ?? []).map((row) => serializeProfile(row as ProfileRow));
  const ids = profiles.map((profile) => profile.id);
  const counts = new Map<string, number>();
  if (ids.length) {
    const works = await admin.from('works').select('creator_id').in('creator_id', ids).eq('published', true);
    for (const row of works.data ?? []) if (row.creator_id) counts.set(row.creator_id, (counts.get(row.creator_id) ?? 0) + 1);
  }
  return NextResponse.json({ creators: profiles.map((profile) => ({ ...toPublicCreator(profile), workCount: counts.get(profile.id) ?? 0 })), configured: true }, {
    headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' },
  });
}
