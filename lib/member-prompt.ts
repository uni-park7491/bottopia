export const memberPromptNotice = {
  ko: '프롬프트 열람·복사는 로그인 후 이용할 수 있습니다. 처음 로그인하면 자동 가입됩니다.',
  en: 'Sign in to view and copy prompts. Your first sign-in creates an account.',
  zh: '登录后可查看和复制提示词。首次登录会自动注册。',
  ja: 'ログイン後にプロンプトを閲覧・コピーできます。初回ログインで登録されます。',
};

export async function loadMemberPrompt(url: string, locale: string) {
  const response = await fetch(url, { cache: 'no-store' });
  if (response.status === 401) {
    const next = window.location.pathname + window.location.search;
    window.location.assign(`/login?${new URLSearchParams({ next, lang: locale, reason: 'prompt' })}`);
    return null;
  }
  if (!response.ok) throw new Error('Prompt unavailable');
  return await response.json() as { prompt: string; negativePrompt: string };
}
