import Image from 'next/image';
// Tools runs in an isolated workspace; cross that boundary with document navigation.
/* eslint-disable @next/next/no-html-link-for-pages */
import Link from 'next/link';
import type { Locale } from '../i18n';

const copy = {
  ko: { title: ['상상을 영상으로.', '창작을 연결하다.'], description: 'AI 영상 크리에이터들의 작품과 제작 과정', explore: '작품 둘러보기', tools: '창작 도구', community: '함께할 사람 찾기' },
  en: { title: ['Imagination in motion.', 'Creators connected.'], description: 'AI films, their creators, and the process behind them', explore: 'Explore works', tools: 'Creative tools', community: 'Find collaborators' },
  zh: { title: ['让想象成为影像。', '让创作彼此相连。'], description: 'AI 影像创作者的作品与制作过程', explore: '探索作品', tools: '创作工具', community: '寻找合作伙伴' },
  ja: { title: ['想像を映像に。', '創作をつなぐ。'], description: 'AI映像クリエイターの作品と制作プロセス', explore: '作品を見る', tools: '創作ツール', community: '仲間を探す' },
} as const;

export default function HomeHero({ locale }: { locale: Locale }) {
  const t = copy[locale];
  return <section className="bottopia-home-hero" id="top" aria-labelledby="home-hero-title">
    <div className="home-hero-copy">
      <p className="home-hero-eyebrow">AI MEETS IMAGINATION</p>
      <h1 id="home-hero-title"><span>{t.title[0]}</span><span>{t.title[1]}</span></h1>
      <p className="home-hero-description">{t.description}</p>
      <div className="home-hero-actions">
        <Link className="home-explore" href="#work">{t.explore}<span aria-hidden="true">↗</span></Link>
        <a className="home-tools" href="/tools">{t.tools}</a>
      </div>
      <p className="home-hero-signature">TOGETHER IN BOTTOPIA</p>
    </div>
    <div className="home-hero-art">
      <div className="home-orbit" aria-hidden="true" />
      <Image className="home-mascot" src="/bottopia-mascot.webp" alt="" width={900} height={900} sizes="(max-width: 700px) 85vw, 52vw" preload />
      <Link className="home-community-card" href="/community">
        <svg width="25" height="25" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="17" cy="9" r="2.5" fill="currentColor"/><path d="M2 20v-3a7 7 0 0 1 14 0v3H2Zm15-7a5 5 0 0 1 5 5v2h-4v-3a9 9 0 0 0-1-4Z" fill="currentColor"/></svg>
        <span>{t.community}</span><span aria-hidden="true">→</span>
      </Link>
    </div>
  </section>;
}
