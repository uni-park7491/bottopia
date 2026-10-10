'use client';

import { FormEvent, useEffect, useState } from 'react';
import AboutPage from './components/AboutPage';
import HomeHero from './components/HomeHero';
import { usePathname } from 'next/navigation';
import CreatorArchive from './components/CreatorArchive';
import RecruitmentBoard from './components/RecruitmentBoard';
import { useSiteLocale } from './useSiteLocale';
import { operatorEmail, operatorMailto } from '../lib/contact';


type SiteSection = 'feed' | 'community' | 'ecosystem' | 'about';




const copy = {
  ko: {
    home: 'BOTTOPIA 홈', menu: '주요 메뉴', language: '언어 선택', currentLanguage: '현재 언어',
    nav: { prompt: '작품', lab: '오리지널', creators: '크리에이터', community: '커뮤니티', ecosystem: '랩', about: '소개', project: '프로젝트 의뢰 ↗' },
    hero: ['AI FILM DIRECTOR & VISUAL WORLD BUILDER', '영화적 상상력과 AI 제작 기술로 아직 없던 장면과 세계를 만듭니다.'],
    gallery: '홈 피드 · 누구나 보기', selectChannel: 'BOTTOPIA 채널 선택', channelIntro: '업로드한 영상 아카이브와 BOTTOPIA의 오리지널 작업을 나누어 탐색하세요.',
    promptArchive: '프롬프트 아카이브', originalLab: '오리지널 랩', workCategory: '작업 카테고리', workFilter: '작품 필터', viewProject: '프로젝트 보기 ↗', projectDetails: '프로젝트 상세 보기',
    ecosystemEyebrow: '스크롤해서 입장 · BOTTOPIA 생태계', ecosystemTitle: ['하나의 봇.', '무한한', '세계.'], ecosystemBody: '아이디어가 캐릭터가 되고, 캐릭터가 이야기를 만들고, 이야기가 다시 누군가의 새로운 창작으로 이어지는 곳.', ecosystemAria: 'BOTTOPIA 창작 생태계',
    aboutLabel: 'BOTTOPIA 소개', aboutTitle: ['좋은 아이디어는', '새로운 세계를', '만듭니다.'], aboutBody: 'BOTTOPIA는 AI를 도구로 쓰되, 결과보다 먼저 이야기를 설계합니다. 브랜드 필름부터 캐릭터와 소셜 콘텐츠까지, 짧게 보고 오래 기억되는 장면을 만듭니다.',
    whatWeMake: '우리가 만드는 것', services: ['브랜드 필름 · 뮤직비디오 · 숏폼', '캐릭터 개발 · 시트 · 세계관 설계', '키비주얼 · 소셜 패키지 · 모션', 'AI 워크플로 · 비주얼 프로토타입'],
    booking: '프로젝트 예약 중 · 2026 Q4', worldInMind: '만들고 싶은 세계가 있나요?', makeReal: ['함께', '현실로 만들어요 ↗'], creatorStudio: '크리에이터 스튜디오 ↗', backTop: '맨 위로 ↑',
    close: '닫기', similarProject: '비슷한 프로젝트 문의하기 ↗', inquiryEyebrow: '프로젝트 의뢰', inquiryTitle: ['당신의 세계를', '들려주세요.'], inquiryIntro: '아직 구체적이지 않아도 괜찮아요. 알고 있는 만큼만 남겨주세요.',
    form: { name: '이름 / 회사', namePlaceholder: '성함 또는 회사명', contact: '연락처', contactPlaceholder: '이메일 또는 연락처', type: '프로젝트 유형', range: '일정 / 예산', rangePlaceholder: '예: 10월 공개 / 500만원 내외', brief: '프로젝트 설명', briefPlaceholder: '만들고 싶은 것과 목적을 자유롭게 적어주세요.', submit: '문의 보내기 ↗' },
    copiedTitle: '프로젝트 문의가 도착했어요.', copiedBody: 'BOTTOPIA 스튜디오에 안전하게 저장했습니다. 내용을 확인한 뒤 입력한 연락처로 답장드릴게요.', sendInstagram: '인스타그램도 둘러보기 ↗',
  },
  en: {
    home: 'BOTTOPIA home', menu: 'Main navigation', language: 'Choose language', currentLanguage: 'Current language',
    nav: { prompt: 'WORK', lab: 'ORIGINALS', creators: 'CREATORS', community: 'COMMUNITY', ecosystem: 'LAB', about: 'ABOUT', project: 'START A PROJECT ↗' },
    hero: ['AI FILM DIRECTOR & VISUAL WORLD BUILDER', 'Cinematic imagination and AI craft, built into worlds that did not exist before.'],
    gallery: 'HOME FEED · OPEN TO EVERYONE', selectChannel: 'SELECT A BOTTOPIA CHANNEL', channelIntro: 'Explore uploaded video archives and BOTTOPIA original works in separate channels.',
    promptArchive: 'PROMPT ARCHIVE', originalLab: 'ORIGINAL LAB', workCategory: 'Work category', workFilter: 'Project filters', viewProject: 'VIEW PROJECT ↗', projectDetails: 'View project details',
    ecosystemEyebrow: 'SCROLL TO ENTER · BOTTOPIA ECOSYSTEM', ecosystemTitle: ['ONE BOT.', 'INFINITE', 'WORLDS.'], ecosystemBody: 'Ideas become characters, characters create stories, and stories inspire someone else to make something new.', ecosystemAria: 'BOTTOPIA creative ecosystem',
    aboutLabel: 'ABOUT BOTTOPIA', aboutTitle: ['GOOD IDEAS', 'DESERVE', 'NEW WORLDS.'], aboutBody: 'BOTTOPIA uses AI as a tool, but designs the story before the output. From brand films to characters and social content, we make scenes that are quick to watch and hard to forget.',
    whatWeMake: 'WHAT WE MAKE', services: ['Brand films · music videos · short-form', 'Character development · sheets · worldbuilding', 'Key visuals · social packages · motion', 'AI workflows · visual prototypes'],
    booking: 'NOW BOOKING · Q4 2026', worldInMind: 'HAVE A WORLD IN MIND?', makeReal: ["LET'S MAKE", 'IT REAL ↗'], creatorStudio: 'CREATOR STUDIO ↗', backTop: 'BACK TO TOP ↑',
    close: 'Close', similarProject: 'ASK ABOUT A SIMILAR PROJECT ↗', inquiryEyebrow: 'START A PROJECT', inquiryTitle: ['TELL US ABOUT', 'YOUR WORLD.'], inquiryIntro: 'It does not need to be fully defined yet. Tell us as much as you know.',
    form: { name: 'NAME / COMPANY', namePlaceholder: 'Your name or company', contact: 'CONTACT', contactPlaceholder: 'Email or phone', type: 'PROJECT TYPE', range: 'TIMELINE / BUDGET', rangePlaceholder: 'e.g. October launch / budget range', brief: 'BRIEF', briefPlaceholder: 'Tell us what you want to make and why.', submit: 'SEND INQUIRY ↗' },
    copiedTitle: 'Your project inquiry has arrived.', copiedBody: 'It is safely stored in the BOTTOPIA studio. We will review it and reply through the contact you provided.', sendInstagram: 'VISIT @BOT.TOPIA ↗',
  },
  zh: {
    home: 'BOTTOPIA 首页', menu: '主导航', language: '选择语言', currentLanguage: '当前语言',
    nav: { prompt: '作品', lab: '原创作品', creators: '创作者', community: '社区', ecosystem: '实验室', about: '关于', project: '发起项目 ↗' },
    hero: ['AI 电影导演与视觉世界构建者', '用电影想象力与 AI 制作技术，创造前所未见的场景与世界。'],
    gallery: '首页动态 · 向所有人开放', selectChannel: '选择 BOTTOPIA 频道', channelIntro: '分别探索创作者上传的视频档案与 BOTTOPIA 原创作品。',
    promptArchive: '提示词档案', originalLab: '原创实验室', workCategory: '作品分类', workFilter: '作品筛选', viewProject: '查看项目 ↗', projectDetails: '查看项目详情',
    ecosystemEyebrow: '继续滚动 · 进入 BOTTOPIA 生态系统', ecosystemTitle: ['一个机器人。', '无限', '世界。'], ecosystemBody: '创意成为角色，角色创造故事，故事又启发下一位创作者开始新的创作。', ecosystemAria: 'BOTTOPIA 创作生态系统',
    aboutLabel: '关于 BOTTOPIA', aboutTitle: ['好创意', '值得拥有', '新世界。'], aboutBody: 'BOTTOPIA 以 AI 为工具，但总是先设计故事，再创造画面。从品牌影片到角色与社交内容，我们制作短暂却令人难忘的场景。',
    whatWeMake: '我们的创作', services: ['品牌影片 · 音乐视频 · 短视频', '角色开发 · 设定图 · 世界观设计', '主视觉 · 社交媒体套装 · 动效', 'AI 工作流 · 视觉原型'],
    booking: '项目预约中 · 2026 年第四季度', worldInMind: '心里已经有一个世界了吗？', makeReal: ['让我们一起', '把它变成现实 ↗'], creatorStudio: '创作者工作室 ↗', backTop: '返回顶部 ↑',
    close: '关闭', similarProject: '咨询类似项目 ↗', inquiryEyebrow: '发起项目', inquiryTitle: ['请告诉我们', '你的世界。'], inquiryIntro: '想法还不够具体也没关系，把目前知道的告诉我们即可。',
    form: { name: '姓名 / 公司', namePlaceholder: '姓名或公司名称', contact: '联系方式', contactPlaceholder: '电子邮箱或电话', type: '项目类型', range: '周期 / 预算', rangePlaceholder: '例：10 月发布 / 预算范围', brief: '项目简介', briefPlaceholder: '请介绍想要制作的内容和目标。', submit: '发送咨询 ↗' },
    copiedTitle: '项目咨询已送达。', copiedBody: '内容已安全保存至 BOTTOPIA 工作室。我们会确认后通过您填写的联系方式回复。', sendInstagram: '访问 @BOT.TOPIA ↗',
  },
  ja: {
    home: 'BOTTOPIA ホーム', menu: 'メインナビゲーション', language: '言語を選択', currentLanguage: '現在の言語',
    nav: { prompt: '作品', lab: 'オリジナル', creators: 'クリエイター', community: 'コミュニティ', ecosystem: 'ラボ', about: '紹介', project: 'プロジェクト相談 ↗' },
    hero: ['AI フィルムディレクター & ビジュアルワールドビルダー', '映画的な想像力と AI 制作技術で、まだ存在しないシーンと世界をつくります。'],
    gallery: 'ホームフィード · 誰でも閲覧可能', selectChannel: 'BOTTOPIA チャンネルを選択', channelIntro: '投稿された映像アーカイブと BOTTOPIA のオリジナル作品を分けて探索できます。',
    promptArchive: 'プロンプトアーカイブ', originalLab: 'オリジナルラボ', workCategory: '作品カテゴリー', workFilter: '作品フィルター', viewProject: 'プロジェクトを見る ↗', projectDetails: 'プロジェクト詳細を見る',
    ecosystemEyebrow: 'スクロールして入る · BOTTOPIA エコシステム', ecosystemTitle: ['ひとつのボット。', '無限の', '世界。'], ecosystemBody: 'アイデアがキャラクターになり、キャラクターが物語をつくり、その物語が誰かの新しい創作へつながっていく場所。', ecosystemAria: 'BOTTOPIA クリエイティブエコシステム',
    aboutLabel: 'BOTTOPIA について', aboutTitle: ['良いアイデアには', '新しい世界が', 'ふさわしい。'], aboutBody: 'BOTTOPIA は AI を道具として使いながら、結果より先に物語を設計します。ブランドフィルムからキャラクター、ソーシャルコンテンツまで、短くても長く記憶に残るシーンをつくります。',
    whatWeMake: '制作できるもの', services: ['ブランドフィルム · MV · ショート動画', 'キャラクター開発 · 設定画 · 世界観設計', 'キービジュアル · SNSパッケージ · モーション', 'AIワークフロー · ビジュアルプロトタイプ'],
    booking: 'プロジェクト受付中 · 2026 Q4', worldInMind: '思い描いている世界はありますか？', makeReal: ['一緒に', '現実にしよう ↗'], creatorStudio: 'クリエイタースタジオ ↗', backTop: 'トップへ ↑',
    close: '閉じる', similarProject: '似たプロジェクトを相談する ↗', inquiryEyebrow: 'プロジェクト相談', inquiryTitle: ['あなたの世界を', '聞かせてください。'], inquiryIntro: 'まだ具体的でなくても大丈夫です。わかっている範囲で教えてください。',
    form: { name: '名前 / 会社名', namePlaceholder: 'お名前または会社名', contact: '連絡先', contactPlaceholder: 'メールまたは電話番号', type: 'プロジェクト種別', range: 'スケジュール / 予算', rangePlaceholder: '例：10月公開 / 予算の目安', brief: '概要', briefPlaceholder: '作りたいものと目的を自由にご記入ください。', submit: '相談を送信 ↗' },
    copiedTitle: 'プロジェクト相談が届きました。', copiedBody: 'BOTTOPIAスタジオに安全に保存しました。確認後、ご入力の連絡先へ返信します。', sendInstagram: '@BOT.TOPIAを見る ↗',
  },
} as const;

export default function Home() {
  const pathname = usePathname();
  const section: SiteSection = pathname === '/community' ? 'community' : pathname === '/ecosystem' ? 'ecosystem' : pathname === '/about' ? 'about' : 'feed';
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [inquirySending, setInquirySending] = useState(false);
  const locale = useSiteLocale();
  const t = copy[locale];


  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setInquiryOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function handleInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInquirySending(true);
    setCopyFailed(false);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: data.get('name'), contact: data.get('contact'), projectType: data.get('project'), timelineBudget: data.get('range'), brief: data.get('brief'), website: data.get('website'), locale }),
      });
      if (!response.ok) throw new Error();
      form.reset();
      setCopied(true);
    } catch { setCopyFailed(true); }
    finally { setInquirySending(false); }
  }

  return (
    <main>


      {section === 'feed' && <>
        <link rel="preload" href="/api/works" as="fetch" crossOrigin="anonymous" />
        <HomeHero locale={locale} />
        <section className="worlds-hub section-page" id="work"><CreatorArchive locale={locale} /></section>
      </>}

      {section === 'community' && <RecruitmentBoard />}

      {section === 'about' && <AboutPage locale={locale} onInquiry={() => { setCopied(false); setCopyFailed(false); setInquiryOpen(true); }} />}

      {inquiryOpen && (
        <div className="modal-backdrop inquiry-backdrop" role="presentation" onMouseDown={() => setInquiryOpen(false)}>
          <section className="inquiry-panel" role="dialog" aria-modal="true" aria-labelledby="inquiry-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setInquiryOpen(false)} aria-label={t.close}>×</button>
            <div>
              <p className="eyebrow">{t.inquiryEyebrow}</p>
              <h2 id="inquiry-title">{t.inquiryTitle[0]}<br />{t.inquiryTitle[1]}</h2>
              <p className="inquiry-intro">{t.inquiryIntro}</p>
              <p><a href={operatorMailto}>{operatorEmail}</a></p>
            </div>
            {!copied ? (
              <form onSubmit={handleInquiry}>
                <label className="inquiry-honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" name="website" /></label>
                <label>{t.form.name}<input required name="name" placeholder={t.form.namePlaceholder} /></label>
                <label>{t.form.contact}<input required name="contact" placeholder={t.form.contactPlaceholder} /></label>
                <label>{t.form.type}<select name="project" defaultValue="AI FILM"><option>AI FILM</option><option>CHARACTER</option><option>CAMPAIGN</option><option>OTHER</option></select></label>
                <label>{t.form.range}<input name="range" placeholder={t.form.rangePlaceholder} /></label>
                <label>{t.form.brief}<textarea required name="brief" rows={4} placeholder={t.form.briefPlaceholder} /></label>
                <button type="submit" className="submit-inquiry" disabled={inquirySending}>{inquirySending ? ({ ko: '보내는 중…', en: 'SENDING…', zh: '发送中…', ja: '送信中…' })[locale] : t.form.submit}</button>
                {copyFailed && <p className="auth-error" role="alert">{({ ko: '문의를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.', en: 'The inquiry could not be saved. Please try again.', zh: '无法保存咨询，请稍后重试。', ja: '相談を保存できませんでした。もう一度お試しください。' })[locale]}</p>}
              </form>
            ) : (
              <div className="copied-message" role="status">
                <span>✓</span>
                <h3>{t.copiedTitle}</h3>
                <p>{t.copiedBody}</p>
                <a href="https://www.instagram.com/bot.topia/" target="_blank" rel="noreferrer">{t.sendInstagram}</a>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
