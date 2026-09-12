import type { Provider } from '@supabase/supabase-js';

export const authProviders = [
  { id: 'google', provider: 'google', name: 'Google', enabled: process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === 'true' },
  { id: 'naver', provider: 'custom:naver', name: 'NAVER', enabled: process.env.NEXT_PUBLIC_AUTH_NAVER_ENABLED === 'true' },
  // Explicitly enabled by the site owner. Supabase still enforces the actual OAuth configuration.
  // Do not let the stale deployment-only flag hide this configured provider again.
  { id: 'kakao', provider: 'kakao', name: 'Kakao', enabled: true },
] as const satisfies readonly { id: string; provider: Provider; name: string; enabled: boolean }[];

export type AuthProvider = (typeof authProviders)[number];

export function oauthOptions(provider: AuthProvider, origin: string, next: string, locale: string) {
  const callback = new URL('/auth/callback', origin);
  callback.searchParams.set('next', next);
  callback.searchParams.set('lang', locale);
  return {
    provider: provider.provider,
    options: {
      redirectTo: callback.toString(),
      // Naver discovers openid/profile from the custom OIDC provider settings.
      ...(provider.id === 'google' ? { queryParams: { prompt: 'select_account' } } : {}),
    },
  };
}
