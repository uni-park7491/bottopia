import { isSupabaseConfigured } from './supabase/config';
import { createServerSupabaseClient } from './supabase/server';

export async function getCurrentUser() {
  if (!isSupabaseConfigured) return null;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getOwnerUser() {
  const user = await getCurrentUser();
  const ownerEmail = process.env.SITE_OWNER_EMAIL?.trim().toLowerCase();
  return user?.email?.trim().toLowerCase() === ownerEmail ? user : null;
}
