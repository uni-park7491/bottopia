export type SiteTheme = 'light' | 'dark';

export function resolveSiteTheme(saved: string | null, systemDark: boolean): SiteTheme {
  return saved === 'light' || saved === 'dark' ? saved : systemDark ? 'dark' : 'light';
}

export function applySiteTheme(document: Document, theme: SiteTheme) {
  document.documentElement.dataset.theme = theme;
  // Own both palettes: prevent Chromium's automatic recoloring from overriding light mode.
  document.documentElement.style.colorScheme = `only ${theme}`;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = theme === 'dark' ? '#111318' : '#f7f8fa';
    meta.removeAttribute('media');
  });
}
