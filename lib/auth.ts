import { isSupabaseConfigured } from './supabase/config';
import { createServerSupabaseClient } from './supabase/server';
import { isSiteOwner } from './auth-policy';

export async function getCurrentUser() {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    return error ? null : data.user;
  } catch { return null; }
}

export async function getOwnerUser() {
  const user = await getCurrentUser();
  return isSiteOwner(user, process.env.SITE_OWNER_USER_ID, process.env.SITE_OWNER_EMAIL) ? user : null;
}
