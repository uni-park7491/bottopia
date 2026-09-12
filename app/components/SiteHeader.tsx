'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MemberLogin from './MemberLogin';
import { localeOptions } from '../i18n';
import { useSiteLocale, saveLocale } from '../useSiteLocale';

const labels = {
  ko: ['작품', '크리에이터', '랩', '커뮤니티', '소개', '프로젝트 문의'],
  en: ['Work', 'Creators', 'Lab', 'Community', 'About', 'Start a project'],
  zh: ['作品', '创作者', '实验室', '社区', '关于', '项目咨询'],
  ja: ['作品', 'クリエイター', 'ラボ', 'コミュニティ', '紹介', '制作の相談'],
};
const paths = ['/', '/creators', '/ecosystem', '/community', '/about'];
export default function SiteHeader() {
  const pathname = usePathname();
  const locale = useSiteLocale();
  useEffect(() => { document.documentElement.lang = localeOptions.find(x => x.code === locale)?.htmlLang || locale; }, [locale]);
  return <header className="site-header unified-header">
    <Link className="brand" href="/" aria-label="BOTTOPIA">BOT<span>•</span>TOPIA</Link>
    <nav className="primary-navigation" aria-label={locale === 'ko' ? '주 메뉴' : 'Main navigation'}>
      {paths.map((path, i) => <Link key={path} href={path} aria-current={(path === '/' ? pathname === '/' || pathname.startsWith('/works/') : pathname === path || pathname.startsWith(path + '/')) ? 'page' : undefined}>{labels[locale][i]}</Link>)}
    </nav>
    <div className="header-actions"><Link className="header-inquiry" href="/about#contact">{labels[locale][5]}</Link><MemberLogin compact locale={locale} />
      <label className="locale-select"><span className="globe-icon" aria-hidden="true" /><span className="sr-only">언어 / Language</span><select value={locale} onChange={e => saveLocale(e.target.value as typeof locale)}>{localeOptions.map(x => <option key={x.code} value={x.code}>{x.label}</option>)}</select></label>
    </div>
  </header>;
}
