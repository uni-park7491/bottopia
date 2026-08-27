'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';
import { isSupabaseConfigured } from '../../lib/supabase/config';
import type { Locale } from '../i18n';

const authCopy = {
  ko: { setup: 'GOOGLE 로그인 · 설정 필요', connecting: '연결 중…', logout: '로그아웃', login: 'GOOGLE로 로그인' },
  en: { setup: 'GOOGLE LOGIN · SETUP REQUIRED', connecting: 'CONNECTING…', logout: 'LOGOUT', login: 'CONTINUE WITH GOOGLE' },
  zh: { setup: 'GOOGLE 登录 · 需要设置', connecting: '连接中…', logout: '退出', login: '使用 GOOGLE 登录' },
  ja: { setup: 'GOOGLEログイン · 設定が必要', connecting: '接続中…', logout: 'ログアウト', login: 'GOOGLEでログイン' },
} as const;

export default function MemberLogin({ compact = false, locale = 'ko' }: { compact?: boolean; locale?: Locale }) {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const t = authCopy[locale];

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

  if (!isSupabaseConfigured) return compact ? null : <p className="auth-note">{t.setup}</p>;
  return (
    <button className={`member-auth ${compact ? 'compact' : ''}`} type="button" onClick={user ? signOut : signIn} disabled={busy}>
      {busy ? t.connecting : user ? `${user.email?.split('@')[0]} · ${t.logout}` : t.login}
    </button>
  );
}
