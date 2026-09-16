'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MemberLogin from './MemberLogin';
import { localeOptions } from '../i18n';
import { useSiteLocale, saveLocale } from '../useSiteLocale';

const labels = {
  ko: ['탐색', '창작 도구', '크리에이터', '커뮤니티', '소개', '작품 올리기'],
  en: ['Explore', 'Tools', 'Creators', 'Community', 'About', 'Upload work'],
  zh: ['探索', '创作工具', '创作者', '社区', '关于', '上传作品'],
  ja: ['探索', '創作ツール', 'クリエイター', 'コミュニティ', '紹介', '作品を投稿'],
};
const paths = ['/', '/tools', '/creators', '/community', '/about'];
export default function SiteHeader() {
  const pathname = usePathname();
  const locale = useSiteLocale();
  useEffect(() => { document.documentElement.lang = localeOptions.find(x => x.code === locale)?.htmlLang || locale; }, [locale]);
  return <header className="site-header unified-header">
    <Link className="brand" href="/" aria-label="BOTTOPIA">BOT<span>•</span>TOPIA</Link>
    <nav className="primary-navigation" aria-label={locale === 'ko' ? '주 메뉴' : 'Main navigation'}>
      {paths.map((path, i) => <Link key={path} href={path} aria-current={(path === '/' ? pathname === '/' || pathname.startsWith('/works/') : pathname === path || pathname.startsWith(path + '/')) ? 'page' : undefined}>{labels[locale][i]}</Link>)}
    </nav>
    <div className="header-actions"><Link className="header-inquiry" href="/studio">{labels[locale][5]}</Link><MemberLogin compact locale={locale} />
      <label className="locale-select"><span className="globe-icon" aria-hidden="true" /><span className="sr-only">언어 / Language</span><select value={locale} onChange={e => saveLocale(e.target.value as typeof locale)}>{localeOptions.map(x => <option key={x.code} value={x.code}>{x.label}</option>)}</select></label>
    </div>
  </header>;
}
