'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';
import { isSupabaseConfigured } from '../../lib/supabase/config';

export default function MemberLogin({ compact = false }: { compact?: boolean }) {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  async function signIn() {
    setBusy(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}` },
    });
  }

  async function signOut() {
    setBusy(true);
    await createBrowserSupabaseClient().auth.signOut();
    window.location.href = '/';
  }

  if (!isSupabaseConfigured) return compact ? null : <p className="auth-note">GOOGLE LOGIN · SETUP REQUIRED</p>;
  return (
    <button className={`member-auth ${compact ? 'compact' : ''}`} type="button" onClick={user ? signOut : signIn} disabled={busy}>
      {busy ? 'CONNECTING…' : user ? `${user.email?.split('@')[0]} · LOGOUT` : 'CONTINUE WITH GOOGLE'}
    </button>
  );
}
