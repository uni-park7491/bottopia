'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSiteLocale } from '../../useSiteLocale';
import styles from '../../components/Library.module.css';

export const sajuAppUrl = 'https://saju-app-blush-three.vercel.app/';
const copy = {
  ko: { fun:'재미', title:'사주', intro:'태어난 날에서 시작하는, 나를 돌아보는 시간.', heading:'먹빛 사주', features:['내 사주: 생년월일과 태어난 시간으로 확인', '오늘의 카드·궁합: 내 사주 입력 후 이용'], privacy:'시작하면 연결된 먹빛 사주 서비스가 열립니다. 입력 정보는 해당 서비스에서 처리하며, 이 페이지는 생년월일을 봇토피아 서버로 전송하거나 저장하지 않습니다.', open:'사주 시작하기', external:'새 창에서 열기', close:'닫기', reload:'다시 연결', loading:'먹빛 사주를 불러오는 중입니다.', timeout:'연결이 오래 걸리면 새 창에서 열거나 다시 연결해 주세요.', note:'사주·카드는 재미와 자기 돌아보기용입니다. 의료·투자·법률 판단을 대신하지 않습니다. 결과는 서비스의 음력·시각 보정 설정에 따라 달라질 수 있습니다.' },
  en: { fun:'Fun', title:'Saju', intro:'A moment of reflection, starting with your birthday.', heading:'Meokbit Saju', features:['Birth chart: enter your birth date and time.', 'Daily card and compatibility: available after entering your chart.'], privacy:'Starting opens the connected Meokbit Saju service. Your inputs are handled by that service; this page does not send or store birth dates on BOTTOPIA servers. The app is in Korean.', open:'Start Saju', external:'Open in a new tab', close:'Close', reload:'Reconnect', loading:'Loading Meokbit Saju.', timeout:'If loading takes too long, open a new tab or reconnect.', note:'For entertainment and reflection only, not medical, investment or legal advice. Calendar and time-correction settings can change results.' },
  zh: { fun:'趣味', title:'四柱八字', intro:'从出生之日开始，了解自己。', heading:'墨色四柱', features:['输入出生日期与时间查看命盘。', '每日卡牌与配对：输入命盘后可用。'], privacy:'开始后会打开墨色四柱服务。输入由该服务处理，本页面不会将出生日期发送或保存至 BOTTOPIA 服务器。应用为韩语。', open:'开始体验', external:'在新窗口打开', close:'关闭', reload:'重新连接', loading:'正在载入墨色四柱。', timeout:'若载入时间过长，请在新窗口打开或重新连接。', note:'仅供娱乐与自我反思，不替代医疗、投资或法律判断。历法与时间修正设置可能影响结果。' },
  ja: { fun:'楽しみ', title:'四柱推命', intro:'生まれた日から、自分を見つめる時間。', heading:'墨色四柱', features:['生年月日と出生時刻から命式を確認。', '今日のカード・相性：命式の入力後に利用できます。'], privacy:'開始すると墨色四柱サービスを開きます。入力は接続先で処理され、このページは生年月日をBOTTOPIAサーバーに送信・保存しません。アプリは韓国語です。', open:'はじめる', external:'新しいタブで開く', close:'閉じる', reload:'再接続', loading:'読み込み中です。', timeout:'時間がかかる場合は新しいタブで開くか再接続してください。', note:'娯楽・自己理解のためのもので、医療・投資・法律判断の代わりにはなりません。暦や時刻補正で結果が変わる場合があります。' },
};

export default function SajuExperience() {
  const t = copy[useSiteLocale()];
  const [started, setStarted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!started || loaded) return;
    const timeout = window.setTimeout(() => setSlow(true), 15000);
    return () => window.clearTimeout(timeout);
  }, [started, loaded, attempt]);
  const reconnect = () => { setLoaded(false); setSlow(false); setAttempt(current => current + 1); };
  return <main className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/fun">{t.fun}</Link><span aria-hidden="true">/</span><span aria-current="page">{t.title}</span></nav>
    <header className={started ? styles.compactHero : styles.hero}><div><p className={styles.eyebrow}>BOTTOPIA PLAY / SAJU</p><h1>{t.title}</h1><p className={styles.intro}>{t.intro}</p></div></header>
    {!started ? <section className={styles.embedIntro}><h2>{t.heading}</h2><ul>{t.features.map(feature => <li key={feature}>{feature}</li>)}</ul><p className={styles.privacy}>{t.privacy}</p><div className={styles.embedActions}><button className={styles.action} type="button" onClick={() => setStarted(true)}>{t.open}<span aria-hidden="true">↗</span></button><a className={styles.external} href={sajuAppUrl} target="_blank" rel="noopener noreferrer">{t.external} ↗</a></div></section>
      : <section className={styles.embed} aria-label={t.heading}><div className={styles.embedBar}><strong>{t.heading}</strong><div><a href={sajuAppUrl} target="_blank" rel="noopener noreferrer">{t.external} ↗</a><button type="button" onClick={reconnect}>{t.reload}</button><button type="button" onClick={() => { setStarted(false); setLoaded(false); setSlow(false); }}>{t.close}</button></div></div>
        {!loaded && <p className={styles.loading} role="status">{slow ? t.timeout : t.loading}</p>}
        <iframe key={attempt} title={t.heading} src={sajuAppUrl} sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads" referrerPolicy="no-referrer" onLoad={() => { setLoaded(true); setSlow(false); }} onError={() => setSlow(true)} />
      </section>}
    <p className={styles.embedNote}>{t.note}</p>
  </main>;
}
