import type { SupabaseClient, User } from '@supabase/supabase-js';
import { normalizeHandle, validHandle, type CreatorStatus, type ProfileRole } from './profile-policy';

export type ProfileRow = {
  id: string;
  handle: string;
  display_name: string;
  bio: string;
  location: string;
  tools: string;
  instagram_url: string | null;
  x_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  available_for_work: boolean;
  role: ProfileRole;
  creator_status: CreatorStatus;
  created_at: string;
  updated_at: string;
};

export type PublicProfile = {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  location: string;
  tools: string;
  instagramUrl: string | null;
  xUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  availableForWork: boolean;
  role: ProfileRole;
  creatorStatus: CreatorStatus;
  createdAt: string;
};

export type PublicCreator = Omit<PublicProfile, 'id' | 'creatorStatus'>;

export function toPublicCreator(profile: PublicProfile): PublicCreator {
  return {
    handle: profile.handle,
    displayName: profile.displayName,
    bio: profile.bio,
    location: profile.location,
    tools: profile.tools,
    instagramUrl: profile.instagramUrl,
    xUrl: profile.xUrl,
    youtubeUrl: profile.youtubeUrl,
    tiktokUrl: profile.tiktokUrl,
    websiteUrl: profile.websiteUrl,
    contactEmail: profile.contactEmail,
    availableForWork: profile.availableForWork,
    role: profile.role,
    createdAt: profile.createdAt,
  };
}

export const publicProfileSelect = 'id,handle,display_name,bio,location,tools,instagram_url,x_url,youtube_url,tiktok_url,website_url,contact_email,available_for_work,role,creator_status,created_at,updated_at';
const legacyProfileSelect = 'id,handle,display_name,bio,location,tools,instagram_url,x_url,youtube_url,tiktok_url,website_url,available_for_work,role,creator_status,created_at,updated_at';

// Keep existing profile reads working during an additive schema rollout.
export async function profileColumns(admin: SupabaseClient): Promise<typeof publicProfileSelect | typeof legacyProfileSelect> {
  const check = await admin.from('profiles').select('contact_email').limit(0);
  return check.error?.code === '42703' || check.error?.code === 'PGRST204'
    ? legacyProfileSelect : publicProfileSelect;
}

export function serializeProfile(row: ProfileRow): PublicProfile {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    bio: row.bio,
    location: row.location,
    tools: row.tools,
    instagramUrl: row.instagram_url,
    xUrl: row.x_url,
    youtubeUrl: row.youtube_url,
    tiktokUrl: row.tiktok_url,
    websiteUrl: row.website_url,
    contactEmail: row.contact_email ?? null,
    availableForWork: row.available_for_work,
    role: row.role,
    creatorStatus: row.creator_status,
    createdAt: row.created_at,
  };
}

export function profileDraftFromUser(user: User): PublicProfile {
  const metadata = user.user_metadata ?? {};
  const displayName = String(metadata.full_name || metadata.name || metadata.nickname || user.email?.split('@')[0] || 'BOTTOPIAN').slice(0, 60);
  const normalized = normalizeHandle(metadata.user_name || metadata.preferred_username || user.email?.split('@')[0]);
  const seed = validHandle(normalized) ? normalized : `creator-${user.id.replaceAll('-', '').slice(0, 8)}`;
  return {
    id: user.id,
    handle: seed,
    displayName,
    bio: '',
    location: '',
    tools: '',
    instagramUrl: null,
    xUrl: null,
    youtubeUrl: null,
    tiktokUrl: null,
    websiteUrl: null,
    contactEmail: null,
    availableForWork: false,
    role: 'MEMBER',
    creatorStatus: 'PENDING',
    createdAt: user.created_at,
  };
}

export async function ensureProfile(admin: SupabaseClient, user: User): Promise<{ profile: PublicProfile; persisted: boolean }> {
  const columns = await profileColumns(admin);
  const existing = await admin.from('profiles').select(columns).eq('id', user.id).maybeSingle().returns<ProfileRow>();
  if (existing.data) return { profile: serializeProfile(existing.data as ProfileRow), persisted: true };

  const draft = profileDraftFromUser(user);
  for (const handle of [draft.handle, `${draft.handle.slice(0, 21)}-${user.id.replaceAll('-', '').slice(0, 8)}`]) {
    const created = await admin.from('profiles').insert({
      id: user.id,
      handle,
      display_name: draft.displayName,
    }).select(columns).single().returns<ProfileRow>();
    if (created.data) return { profile: serializeProfile(created.data as ProfileRow), persisted: true };
    if (created.error?.code !== '23505') break;
  }
  return { profile: draft, persisted: false };
}

export async function profilesById(admin: SupabaseClient, ids: string[]): Promise<Map<string, PublicProfile>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const result = await admin.from('profiles').select(await profileColumns(admin)).in('id', unique).returns<ProfileRow[]>();
  if (result.error) return new Map();
  return new Map((result.data ?? []).map((row) => {
    const profile = serializeProfile(row as ProfileRow);
    return [profile.id, profile];
  }));
}
