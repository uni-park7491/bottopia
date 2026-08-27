export type Locale = 'ko' | 'en' | 'zh' | 'ja';

export const localeOptions: { code: Locale; label: string; shortLabel: string; htmlLang: string }[] = [
  { code: 'ko', label: '한국어', shortLabel: 'KO', htmlLang: 'ko' },
  { code: 'en', label: 'English', shortLabel: 'EN', htmlLang: 'en' },
  { code: 'zh', label: '中文', shortLabel: 'ZH', htmlLang: 'zh-CN' },
  { code: 'ja', label: '日本語', shortLabel: 'JA', htmlLang: 'ja' },
];

export const isLocale = (value: string | null): value is Locale =>
  localeOptions.some((option) => option.code === value);
