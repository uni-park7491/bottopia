import { getCurrentUser, getOwnerUser } from '../../../../lib/auth';
import { guardMutation } from '../../../../lib/request-guard';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { createCanvasHandlers } from '../../../../lib/canvas/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function handlers() {
  return createCanvasHandlers({
    env: process.env, owner: getOwnerUser, currentUser: getCurrentUser, guard: guardMutation,
    storage: () => createAdminClient().storage.from('works'),
  });
}

export async function POST(request: Request) { return handlers().createAsset(request); }

export async function DELETE(request: Request) { return handlers().deleteAssets(request); }
