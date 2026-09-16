import 'server-only';
import { getCurrentUser } from './auth';
import { isSiteOwner } from './auth-policy';
import { createAdminClient } from './supabase/admin';
import { canUploadWork } from './upload-policy';

export async function getCreatorAccess() {
  const user = await getCurrentUser();
  if (!user) return null;
  const isOwner = isSiteOwner(user, process.env.SITE_OWNER_USER_ID, process.env.SITE_OWNER_EMAIL);
  if (isOwner) return { user, isOwner, canUpload: true };
  const { data, error } = await createAdminClient().from('profiles').select('creator_status').eq('id', user.id).maybeSingle();
  return { user, isOwner, canUpload: !error && canUploadWork(false, data?.creator_status) };
}
