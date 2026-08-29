'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';
import { isSupabaseConfigured } from '../../lib/supabase/config';
import type { Locale } from '../i18n';

const authCopy = {
  ko: { setup: 'GOOGLE 가입 준비 중', connecting: '연결 중…', logout: '로그아웃', login: 'GOOGLE로 가입', error: '로그인을 시작하지 못했어요. 잠시 후 다시 시도해주세요.' },
  en: { setup: 'GOOGLE SIGN-UP COMING SOON', connecting: 'CONNECTING…', logout: 'LOGOUT', login: 'JOIN WITH GOOGLE', error: 'Could not start sign-in. Please try again.' },
  zh: { setup: 'GOOGLE 注册即将开放', connecting: '连接中…', logout: '退出', login: '使用 GOOGLE 加入', error: '无法开始登录，请稍后重试。' },
  ja: { setup: 'GOOGLE登録 準備中', connecting: '接続中…', logout: 'ログアウト', login: 'GOOGLEで参加', error: 'ログインを開始できませんでした。もう一度お試しください。' },
} as const;

export default function MemberLogin({ compact = false, locale = 'ko' }: { compact?: boolean; locale?: Locale }) {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const t = authCopy[locale];

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  async function signIn() {
    if (!isSupabaseConfigured) return;
    setBusy(true); setError('');
    const { error: signInError } = await createBrowserSupabaseClient().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (signInError) { setBusy(false); setError(t.error); }
  }

  async function signOut() {
    setBusy(true);
    await createBrowserSupabaseClient().auth.signOut();
    window.location.href = '/';
  }

  if (!isSupabaseConfigured) return compact ? (
    <a className="member-auth compact pending" href="#community" aria-label={t.setup}>
      <GoogleMark /> {t.login}
    </a>
  ) : <p className="auth-note">{t.setup}</p>;
  return (
    <span className="member-auth-wrap">
      <button className={`member-auth ${compact ? 'compact' : ''}`} type="button" onClick={user ? signOut : signIn} disabled={busy}>
        {!user && <GoogleMark />}{busy ? t.connecting : user ? `${user.email?.split('@')[0]} · ${t.logout}` : t.login}
      </button>
      {error && !compact && <span className="auth-error" role="status">{error}</span>}
    </span>
  );
}

function GoogleMark() {
  return <span className="google-mark" aria-hidden="true">G</span>;
}
