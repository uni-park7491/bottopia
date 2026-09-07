'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';
import { isSupabaseConfigured } from '../../lib/supabase/config';
import { authProviders, oauthOptions, type AuthProvider } from '../../lib/auth-providers';
import { safeReturnPath } from '../../lib/auth-policy';
import type { Locale } from '../i18n';

const authCopy = {
  ko: { setup: '설정 대기', note: '소셜 로그인 연결을 준비 중입니다. 작품은 로그인 없이 볼 수 있어요.', connecting: '연결 중…', checking: '확인 중…', logout: '로그아웃', login: '로그인 / 가입', continue: '계속하기 ↗', error: '인증 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.', buttons: ['Google로 계속하기', '네이버로 계속하기', '카카오로 계속하기'] },
  en: { setup: 'Coming soon', note: 'Social sign-in is being set up. Explore works without an account.', connecting: 'Connecting…', checking: 'Checking…', logout: 'Log out', login: 'Log in / Join', continue: 'Continue ↗', error: 'Could not connect to authentication. Please try again.', buttons: ['Continue with Google', 'Continue with NAVER', 'Continue with Kakao'] },
  zh: { setup: '准备中', note: '社交登录正在准备中，无需登录即可浏览作品。', connecting: '连接中…', checking: '确认中…', logout: '退出', login: '登录 / 注册', continue: '继续 ↗', error: '无法连接认证服务，请稍后重试。', buttons: ['使用 Google 继续', '使用 NAVER 继续', '使用 Kakao 继续'] },
  ja: { setup: '準備中', note: 'ソーシャルログインを準備中です。作品はログインなしで見られます。', connecting: '接続中…', checking: '確認中…', logout: 'ログアウト', login: 'ログイン / 登録', continue: '続ける ↗', error: '認証サービスに接続できませんでした。もう一度お試しください。', buttons: ['Googleで続ける', 'NAVERで続ける', 'Kakaoで続ける'] },
} as const;

export default function MemberLogin({ compact = false, locale = 'ko', returnTo }: { compact?: boolean; locale?: Locale; returnTo?: string }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const t = authCopy[locale];
  const next = safeReturnPath(returnTo ?? pathname);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!active) return;
      setUser(data.user);
      if (authError && authError.name !== 'AuthSessionMissingError') setError(t.error);
    }).catch(() => { if (active) setError(t.error); }).finally(() => { if (active) setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_, session) => {
      if (active) { setUser(session?.user ?? null); setLoading(false); }
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [t.error]);

  async function signIn(provider: AuthProvider) {
    if (!isSupabaseConfigured || !provider.enabled || busy) return;
    setBusy(provider.id); setError('');
    try {
      const { error: signInError } = await createBrowserSupabaseClient().auth.signInWithOAuth(oauthOptions(provider, window.location.origin, next, locale));
      if (signInError) throw signInError;
    } catch { setError(t.error); }
    finally { setBusy(null); }
  }

  async function signOut() {
    setBusy('logout'); setError('');
    try {
      const { error: signOutError } = await createBrowserSupabaseClient().auth.signOut();
      if (signOutError) throw signOutError;
      window.location.assign('/');
    } catch { setError(t.error); setBusy(null); }
  }

  if (loading) return <span className="auth-loading" role="status">{t.checking}</span>;
  if (user) return (
    <span className="member-auth-wrap">
      <button className={`member-auth ${compact ? 'compact' : ''}`} type="button" onClick={signOut} disabled={Boolean(busy)}>
        {busy ? t.connecting : `${user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'BOTTOPIAN'} · ${t.logout}`}
      </button>
      {!compact && <Link className="auth-continue" href={next}>{t.continue}</Link>}
      {error && <span className="auth-error" role="alert">{error}</span>}
    </span>
  );
  if (compact) return <Link className="member-auth compact" href={`/login?${new URLSearchParams({ next, lang: locale })}`}>{t.login}</Link>;
  const pending = !isSupabaseConfigured || authProviders.some((provider) => !provider.enabled);
  return (
    <div className="social-auth" aria-busy={Boolean(busy)}>
      <div className="social-auth-options">
        {authProviders.map((provider, index) => {
          const available = isSupabaseConfigured && provider.enabled;
          return <button key={provider.id} className={`social-auth-button provider-${provider.id}`} type="button" disabled={!available || Boolean(busy)} onClick={() => signIn(provider)}>
            <span className="provider-mark" aria-hidden="true">{provider.id === 'kakao' ? <svg viewBox="0 0 24 24"><path d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.9 5.2 4.8 6.6l-1 3.6 4.1-2.5 2.1.2c5.5 0 10-3.5 10-7.9S17.5 3 12 3Z" /></svg> : provider.id === 'naver' ? 'N' : 'G'}</span>
            <span>{busy === provider.id ? t.connecting : t.buttons[index]}</span>
            {!available && <small>{t.setup}</small>}
          </button>;
        })}
      </div>
      {pending && <p className="social-auth-note">{t.note}</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
    </div>
  );
}
