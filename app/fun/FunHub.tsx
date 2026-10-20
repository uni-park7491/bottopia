'use client';
import Link from 'next/link';
import { useSiteLocale } from '../useSiteLocale';
import LibraryIcon from '../components/LibraryIcon';
import styles from '../components/Library.module.css';
const copy = {
  ko: { title:'잠깐, 다른 재미.', intro:'만드는 사이, 가볍게 쉬어가는 공간.', saju:'사주', body:'내 사주부터 오늘의 카드, 두 사람의 궁합까지. 먹빛 사주를 만나보세요.', open:'사주 보기', note:'사주와 카드는 재미와 자기 돌아보기용입니다. 중요한 결정은 실제 정보와 자신의 판단을 우선하세요.' },
  en: { title:'A little room for fun.', intro:'Take a short break between creations.', saju:'Saju', body:'Explore your birth chart, a daily card and compatibility with Meokbit Saju.', open:'Explore Saju', note:'Saju and cards are for entertainment and reflection, not a basis for important decisions. The connected app is in Korean.' },
  zh: { title:'休息一下，找点乐趣。', intro:'创作之余，轻松停留片刻。', saju:'四柱八字', body:'通过墨色四柱体验命盘、每日卡牌和双人配对。', open:'查看四柱', note:'仅供娱乐与自我反思。重要决定请依据现实信息与自己的判断。连接的应用为韩语。' },
  ja: { title:'ひと息、別の楽しみ。', intro:'創作の合間に、ちょっとひと休み。', saju:'四柱推命', body:'命式から今日のカード、二人の相性まで。墨色四柱を体験できます。', open:'四柱推命を見る', note:'占いとカードは娯楽・自己理解のためのものです。重要な判断は実際の情報を優先してください。接続先は韓国語です。' },
};
export default function FunHub() {
  const t = copy[useSiteLocale()];
  return <main className={styles.page}><header className={styles.hero}><div><p className={styles.eyebrow}>BOTTOPIA PLAY</p><h1>{t.title}</h1><p className={styles.intro}>{t.intro}</p></div><div className={styles.heroMark}><LibraryIcon name="spark" /></div></header>
    <section className={styles.funGrid} aria-label={t.saju}><article className={styles.funCard}><div className={styles.funSymbol}><LibraryIcon name="spark" /></div><div><h2>{t.saju}</h2><p>{t.body}</p><Link className={styles.action} href="/fun/saju">{t.open}<span aria-hidden="true">↗</span></Link></div></article></section><p className={styles.embedNote}>{t.note}</p>
  </main>;
}
