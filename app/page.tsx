'use client';

import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import CreatorArchive from './components/CreatorArchive';
import MemberLogin from './components/MemberLogin';
import { isLocale, localeOptions, type Locale } from './i18n';

type Project = {
  id: string;
  title: string;
  category: 'AI FILM' | 'CHARACTER' | 'CAMPAIGN';
  year: string;
  className: string;
  ratio: 'portrait' | 'landscape' | 'square';
  summary: string;
};

const projects: Project[] = [];

const categories = ['ALL', 'AI FILM', 'CHARACTER', 'CAMPAIGN'] as const;
const workWorlds = ['CREATOR ARCHIVE', 'ORIGINAL LAB'] as const;

const communityCopy = {
  ko: { eyebrow: 'BOTTOPIA COMMUNITY · OPEN BETA', title: ['보고.', '배우고.', '다시 만들기.'], body: '작품과 프롬프트는 누구에게나 공개됩니다. Google로 가입하면 좋아요와 커뮤니티 노트를 남기며 다른 창작자와 연결될 수 있어요.', steps: [['01 / WATCH', '영상과 제작 도구를 자유롭게 살펴봅니다.'], ['02 / COPY', '전체 프롬프트를 복사해 직접 실험합니다.'], ['03 / CONNECT', '좋아요와 노트로 결과와 발견을 나눕니다.']], cta: '가입은 간단하게, 감상은 언제나 공개로.' },
  en: { eyebrow: 'BOTTOPIA COMMUNITY · OPEN BETA', title: ['WATCH.', 'LEARN.', 'REMIX.'], body: 'Works and prompts stay open to everyone. Join with Google to like, leave community notes, and connect with other makers.', steps: [['01 / WATCH', 'Explore the film and the tools behind it.'], ['02 / COPY', 'Copy the full prompt and run your own experiment.'], ['03 / CONNECT', 'Share results and discoveries through likes and notes.']], cta: 'A simple sign-up. An always-open archive.' },
  zh: { eyebrow: 'BOTTOPIA 社区 · 公开测试', title: ['观看。', '学习。', '再创造。'], body: '作品与提示词对所有人开放。使用 Google 加入后，可以点赞、留下社区笔记，并与其他创作者交流。', steps: [['01 / 观看', '自由探索影片与制作工具。'], ['02 / 复制', '复制完整提示词，开始自己的实验。'], ['03 / 连接', '通过点赞和笔记分享成果与发现。']], cta: '注册简单，档案始终开放。' },
  ja: { eyebrow: 'BOTTOPIA COMMUNITY · OPEN BETA', title: ['見る。', '学ぶ。', '再創造する。'], body: '作品とプロンプトは誰でも見ることができます。Googleで参加すると、いいねやコミュニティノートを通して他のクリエイターとつながれます。', steps: [['01 / WATCH', '映像と制作ツールを自由に見ます。'], ['02 / COPY', 'プロンプトをコピーして自分で試します。'], ['03 / CONNECT', 'いいねとノートで成果や発見を共有します。']], cta: '参加はシンプルに。アーカイブはいつでもオープンに。' },
} as const;

const originalEmptyCopy = {
  ko: { title: '아직 공개된 오리지널 작업이 없습니다.', body: '실제 BOTTOPIA 프로젝트가 완성되면 이곳에 직접 업로드됩니다.', link: '운영자 스튜디오에서 업로드하기 ↗' },
  en: { title: 'NO ORIGINAL WORKS PUBLISHED YET.', body: 'Completed BOTTOPIA projects will be uploaded here directly.', link: 'UPLOAD FROM CREATOR STUDIO ↗' },
  zh: { title: '尚未发布原创作品。', body: 'BOTTOPIA 的实际项目完成后将直接上传至此。', link: '前往创作者工作室上传 ↗' },
  ja: { title: 'まだオリジナル作品は公開されていません。', body: 'BOTTOPIAの実際のプロジェクトが完成したら、ここに直接アップロードされます。', link: 'クリエイタースタジオからアップロード ↗' },
} as const;

const copy = {
  ko: {
    home: 'BOTTOPIA 홈', menu: '주요 메뉴', language: '언어 선택', currentLanguage: '현재 언어',
    nav: { prompt: '프롬프트', lab: '오리지널 랩', ecosystem: '생태계', about: '소개', project: '프로젝트 의뢰 ↗' },
    hero: ['AI로 만든 영상과 사용한 프롬프트를 함께 아카이브하는 갤러리.', '마음에 드는 세계를 복사하고 당신의 방식으로 다시 만들어보세요.'],
    gallery: '라이브 갤러리 · 서울', selectChannel: 'BOTTOPIA 채널 선택', channelIntro: '업로드한 영상 아카이브와 BOTTOPIA의 오리지널 작업을 나누어 탐색하세요.',
    promptArchive: '프롬프트 아카이브', originalLab: '오리지널 랩', workCategory: '작업 카테고리', workFilter: '작품 필터', viewProject: '프로젝트 보기 ↗', projectDetails: '프로젝트 상세 보기',
    ecosystemEyebrow: '스크롤해서 입장 · BOTTOPIA 생태계', ecosystemTitle: ['하나의 봇.', '무한한', '세계.'], ecosystemBody: '아이디어가 캐릭터가 되고, 캐릭터가 이야기를 만들고, 이야기가 다시 누군가의 새로운 창작으로 이어지는 곳.', ecosystemAria: 'BOTTOPIA 창작 생태계',
    aboutLabel: 'BOTTOPIA 소개', aboutTitle: ['좋은 아이디어는', '새로운 세계를', '만듭니다.'], aboutBody: 'BOTTOPIA는 AI를 도구로 쓰되, 결과보다 먼저 이야기를 설계합니다. 브랜드 필름부터 캐릭터와 소셜 콘텐츠까지, 짧게 보고 오래 기억되는 장면을 만듭니다.',
    whatWeMake: '우리가 만드는 것', services: ['브랜드 필름 · 뮤직비디오 · 숏폼', '캐릭터 개발 · 시트 · 세계관 설계', '키비주얼 · 소셜 패키지 · 모션', 'AI 워크플로 · 비주얼 프로토타입'],
    booking: '프로젝트 예약 중 · 2026 Q4', worldInMind: '만들고 싶은 세계가 있나요?', makeReal: ['함께', '현실로 만들어요 ↗'], creatorStudio: '크리에이터 스튜디오 ↗', backTop: '맨 위로 ↑',
    close: '닫기', similarProject: '비슷한 프로젝트 문의하기 ↗', inquiryEyebrow: '프로젝트 의뢰', inquiryTitle: ['당신의 세계를', '들려주세요.'], inquiryIntro: '아직 구체적이지 않아도 괜찮아요. 알고 있는 만큼만 남겨주세요.',
    form: { name: '이름 / 회사', namePlaceholder: '성함 또는 회사명', contact: '연락처', contactPlaceholder: '이메일 또는 연락처', type: '프로젝트 유형', range: '일정 / 예산', rangePlaceholder: '예: 10월 공개 / 500만원 내외', brief: '프로젝트 설명', briefPlaceholder: '만들고 싶은 것과 목적을 자유롭게 적어주세요.', submit: '문의 내용 복사하기 ↗' },
    copiedTitle: '문의 내용이 복사됐어요.', copiedBody: 'Instagram DM에 붙여넣어 보내주세요. BOTTOPIA가 확인 후 답장드릴게요.', sendInstagram: '@BOT.TOPIA로 보내기 ↗',
  },
  en: {
    home: 'BOTTOPIA home', menu: 'Main navigation', language: 'Choose language', currentLanguage: 'Current language',
    nav: { prompt: 'PROMPT', lab: 'ORIGINAL LAB', ecosystem: 'ECOSYSTEM', about: 'ABOUT', project: 'START A PROJECT ↗' },
    hero: ['A gallery archiving AI-made films alongside the prompts behind them.', 'Copy a world you love and remake it in your own way.'],
    gallery: 'LIVE GALLERY · SEOUL', selectChannel: 'SELECT A BOTTOPIA CHANNEL', channelIntro: 'Explore uploaded video archives and BOTTOPIA original works in separate channels.',
    promptArchive: 'PROMPT ARCHIVE', originalLab: 'ORIGINAL LAB', workCategory: 'Work category', workFilter: 'Project filters', viewProject: 'VIEW PROJECT ↗', projectDetails: 'View project details',
    ecosystemEyebrow: 'SCROLL TO ENTER · BOTTOPIA ECOSYSTEM', ecosystemTitle: ['ONE BOT.', 'INFINITE', 'WORLDS.'], ecosystemBody: 'Ideas become characters, characters create stories, and stories inspire someone else to make something new.', ecosystemAria: 'BOTTOPIA creative ecosystem',
    aboutLabel: 'ABOUT BOTTOPIA', aboutTitle: ['GOOD IDEAS', 'DESERVE', 'NEW WORLDS.'], aboutBody: 'BOTTOPIA uses AI as a tool, but designs the story before the output. From brand films to characters and social content, we make scenes that are quick to watch and hard to forget.',
    whatWeMake: 'WHAT WE MAKE', services: ['Brand films · music videos · short-form', 'Character development · sheets · worldbuilding', 'Key visuals · social packages · motion', 'AI workflows · visual prototypes'],
    booking: 'NOW BOOKING · Q4 2026', worldInMind: 'HAVE A WORLD IN MIND?', makeReal: ["LET'S MAKE", 'IT REAL ↗'], creatorStudio: 'CREATOR STUDIO ↗', backTop: 'BACK TO TOP ↑',
    close: 'Close', similarProject: 'ASK ABOUT A SIMILAR PROJECT ↗', inquiryEyebrow: 'START A PROJECT', inquiryTitle: ['TELL US ABOUT', 'YOUR WORLD.'], inquiryIntro: 'It does not need to be fully defined yet. Tell us as much as you know.',
    form: { name: 'NAME / COMPANY', namePlaceholder: 'Your name or company', contact: 'CONTACT', contactPlaceholder: 'Email or phone', type: 'PROJECT TYPE', range: 'TIMELINE / BUDGET', rangePlaceholder: 'e.g. October launch / budget range', brief: 'BRIEF', briefPlaceholder: 'Tell us what you want to make and why.', submit: 'COPY INQUIRY ↗' },
    copiedTitle: 'Your inquiry has been copied.', copiedBody: 'Paste it into an Instagram DM. BOTTOPIA will review it and get back to you.', sendInstagram: 'SEND TO @BOT.TOPIA ↗',
  },
  zh: {
    home: 'BOTTOPIA 首页', menu: '主导航', language: '选择语言', currentLanguage: '当前语言',
    nav: { prompt: '提示词', lab: '原创实验室', ecosystem: '生态系统', about: '关于', project: '发起项目 ↗' },
    hero: ['这里收藏 AI 创作的视频，也公开制作它们所使用的提示词。', '复制你喜欢的世界，用自己的方式重新创造。'],
    gallery: '在线画廊 · 首尔', selectChannel: '选择 BOTTOPIA 频道', channelIntro: '分别探索创作者上传的视频档案与 BOTTOPIA 原创作品。',
    promptArchive: '提示词档案', originalLab: '原创实验室', workCategory: '作品分类', workFilter: '作品筛选', viewProject: '查看项目 ↗', projectDetails: '查看项目详情',
    ecosystemEyebrow: '继续滚动 · 进入 BOTTOPIA 生态系统', ecosystemTitle: ['一个机器人。', '无限', '世界。'], ecosystemBody: '创意成为角色，角色创造故事，故事又启发下一位创作者开始新的创作。', ecosystemAria: 'BOTTOPIA 创作生态系统',
    aboutLabel: '关于 BOTTOPIA', aboutTitle: ['好创意', '值得拥有', '新世界。'], aboutBody: 'BOTTOPIA 以 AI 为工具，但总是先设计故事，再创造画面。从品牌影片到角色与社交内容，我们制作短暂却令人难忘的场景。',
    whatWeMake: '我们的创作', services: ['品牌影片 · 音乐视频 · 短视频', '角色开发 · 设定图 · 世界观设计', '主视觉 · 社交媒体套装 · 动效', 'AI 工作流 · 视觉原型'],
    booking: '项目预约中 · 2026 年第四季度', worldInMind: '心里已经有一个世界了吗？', makeReal: ['让我们一起', '把它变成现实 ↗'], creatorStudio: '创作者工作室 ↗', backTop: '返回顶部 ↑',
    close: '关闭', similarProject: '咨询类似项目 ↗', inquiryEyebrow: '发起项目', inquiryTitle: ['请告诉我们', '你的世界。'], inquiryIntro: '想法还不够具体也没关系，把目前知道的告诉我们即可。',
    form: { name: '姓名 / 公司', namePlaceholder: '姓名或公司名称', contact: '联系方式', contactPlaceholder: '电子邮箱或电话', type: '项目类型', range: '周期 / 预算', rangePlaceholder: '例：10 月发布 / 预算范围', brief: '项目简介', briefPlaceholder: '请介绍想要制作的内容和目标。', submit: '复制咨询内容 ↗' },
    copiedTitle: '咨询内容已复制。', copiedBody: '请粘贴到 Instagram 私信中发送，BOTTOPIA 查看后会尽快回复。', sendInstagram: '发送给 @BOT.TOPIA ↗',
  },
  ja: {
    home: 'BOTTOPIA ホーム', menu: 'メインナビゲーション', language: '言語を選択', currentLanguage: '現在の言語',
    nav: { prompt: 'プロンプト', lab: 'オリジナルラボ', ecosystem: 'エコシステム', about: '紹介', project: 'プロジェクト相談 ↗' },
    hero: ['AIで制作した映像と、その制作に使ったプロンプトを一緒に記録するギャラリー。', '気に入った世界をコピーして、あなたらしい方法で再創造してください。'],
    gallery: 'ライブギャラリー · ソウル', selectChannel: 'BOTTOPIA チャンネルを選択', channelIntro: '投稿された映像アーカイブと BOTTOPIA のオリジナル作品を分けて探索できます。',
    promptArchive: 'プロンプトアーカイブ', originalLab: 'オリジナルラボ', workCategory: '作品カテゴリー', workFilter: '作品フィルター', viewProject: 'プロジェクトを見る ↗', projectDetails: 'プロジェクト詳細を見る',
    ecosystemEyebrow: 'スクロールして入る · BOTTOPIA エコシステム', ecosystemTitle: ['ひとつのボット。', '無限の', '世界。'], ecosystemBody: 'アイデアがキャラクターになり、キャラクターが物語をつくり、その物語が誰かの新しい創作へつながっていく場所。', ecosystemAria: 'BOTTOPIA クリエイティブエコシステム',
    aboutLabel: 'BOTTOPIA について', aboutTitle: ['良いアイデアには', '新しい世界が', 'ふさわしい。'], aboutBody: 'BOTTOPIA は AI を道具として使いながら、結果より先に物語を設計します。ブランドフィルムからキャラクター、ソーシャルコンテンツまで、短くても長く記憶に残るシーンをつくります。',
    whatWeMake: '制作できるもの', services: ['ブランドフィルム · MV · ショート動画', 'キャラクター開発 · 設定画 · 世界観設計', 'キービジュアル · SNSパッケージ · モーション', 'AIワークフロー · ビジュアルプロトタイプ'],
    booking: 'プロジェクト受付中 · 2026 Q4', worldInMind: '思い描いている世界はありますか？', makeReal: ['一緒に', '現実にしよう ↗'], creatorStudio: 'クリエイタースタジオ ↗', backTop: 'トップへ ↑',
    close: '閉じる', similarProject: '似たプロジェクトを相談する ↗', inquiryEyebrow: 'プロジェクト相談', inquiryTitle: ['あなたの世界を', '聞かせてください。'], inquiryIntro: 'まだ具体的でなくても大丈夫です。わかっている範囲で教えてください。',
    form: { name: '名前 / 会社名', namePlaceholder: 'お名前または会社名', contact: '連絡先', contactPlaceholder: 'メールまたは電話番号', type: 'プロジェクト種別', range: 'スケジュール / 予算', rangePlaceholder: '例：10月公開 / 予算の目安', brief: '概要', briefPlaceholder: '作りたいものと目的を自由にご記入ください。', submit: '相談内容をコピー ↗' },
    copiedTitle: '相談内容をコピーしました。', copiedBody: 'InstagramのDMに貼り付けて送信してください。BOTTOPIAが確認後、ご返信します。', sendInstagram: '@BOT.TOPIAへ送る ↗',
  },
} as const;

const localeEventName = 'bottopia-locale-change';

function subscribeToLocale(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(localeEventName, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(localeEventName, onStoreChange);
  };
}

function readLocale(): Locale {
  const savedLocale = window.localStorage.getItem('bottopia-locale');
  return isLocale(savedLocale) ? savedLocale : 'ko';
}

function readServerLocale(): Locale {
  return 'ko';
}

function saveLocale(locale: Locale) {
  window.localStorage.setItem('bottopia-locale', locale);
  window.dispatchEvent(new Event(localeEventName));
}

export default function Home() {
  const [filter, setFilter] = useState<(typeof categories)[number]>('ALL');
  const [workWorld, setWorkWorld] = useState<(typeof workWorlds)[number]>('CREATOR ARCHIVE');
  const [selected, setSelected] = useState<Project | null>(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const locale = useSyncExternalStore(subscribeToLocale, readLocale, readServerLocale);
  const [languageOpen, setLanguageOpen] = useState(false);
  const languageRef = useRef<HTMLDivElement>(null);
  const t = copy[locale];
  const community = communityCopy[locale];
  const originalEmpty = originalEmptyCopy[locale];

  const visibleProjects = filter === 'ALL' ? projects : projects.filter((project) => project.category === filter);

  useEffect(() => {
    const option = localeOptions.find((item) => item.code === locale);
    document.documentElement.lang = option?.htmlLang ?? locale;
  }, [locale]);

  useEffect(() => {
    const closeLanguageMenu = (event: PointerEvent) => {
      if (!languageRef.current?.contains(event.target as Node)) setLanguageOpen(false);
    };
    window.addEventListener('pointerdown', closeLanguageMenu);
    return () => window.removeEventListener('pointerdown', closeLanguageMenu);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelected(null);
        setInquiryOpen(false);
        setLanguageOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function handleInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const brief = [
      '[BOTTOPIA PROJECT INQUIRY]',
      `Name: ${data.get('name')}`,
      `Contact: ${data.get('contact')}`,
      `Project: ${data.get('project')}`,
      `Timeline / Budget: ${data.get('range')}`,
      `Brief: ${data.get('brief')}`,
    ].join('\n');
    await navigator.clipboard?.writeText(brief);
    setCopied(true);
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label={t.home}>BOT<span>•</span>TOPIA</a>
        <nav className="nav" aria-label={t.menu}>
          <a href="#work">{t.nav.prompt}</a>
          <button className="nav-link-button" onClick={() => { setWorkWorld('ORIGINAL LAB'); document.querySelector('#work')?.scrollIntoView(); }}>{t.nav.lab}</button>
          <a href="#ecosystem">{t.nav.ecosystem}</a>
          <a href="#about">{t.nav.about}</a>
          <MemberLogin compact locale={locale} />
          <button className="nav-cta" onClick={() => setInquiryOpen(true)}>{t.nav.project}</button>
          <div className="language-switcher" ref={languageRef}>
            <button
              className="language-toggle"
              type="button"
              aria-label={`${t.language}: ${localeOptions.find((option) => option.code === locale)?.label}`}
              aria-haspopup="menu"
              aria-expanded={languageOpen}
              onClick={() => setLanguageOpen((open) => !open)}
            >
              <span className="globe-icon" aria-hidden="true" />
              <span>{localeOptions.find((option) => option.code === locale)?.shortLabel}</span>
            </button>
            {languageOpen && (
              <div className="language-menu" role="menu" aria-label={t.language}>
                <p>{t.language}</p>
                {localeOptions.map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    role="menuitemradio"
                    aria-checked={locale === option.code}
                    className={locale === option.code ? 'active' : ''}
                    onClick={() => { saveLocale(option.code); setLanguageOpen(false); }}
                  >
                    <span>{option.shortLabel}</span>
                    <b>{option.label}</b>
                    <i aria-hidden="true">{locale === option.code ? '●' : '○'}</i>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>
      </header>

      <section className="hero" id="top">
        <h1>BOTTOPIA<span>.</span></h1>
        <div className="hero-bottom">
          <p>{t.hero[0]}<br />{t.hero[1]}</p>
          <span>{t.gallery}</span>
        </div>
      </section>

      <section className="worlds-hub" id="work">
        <div className="world-switcher">
          <div>
            <p>{t.selectChannel}</p>
            <span>{t.channelIntro}</span>
          </div>
          <div className="world-tabs" role="tablist" aria-label={t.workCategory}>
            {workWorlds.map((world, index) => (
              <button
                key={world}
                type="button"
                role="tab"
                aria-selected={workWorld === world}
                aria-controls={world === 'CREATOR ARCHIVE' ? 'creator-archive-panel' : 'original-lab-panel'}
                className={workWorld === world ? 'active' : ''}
                onClick={() => setWorkWorld(world)}
              >
                <small>0{index + 1}</small>
                <span>{world === 'CREATOR ARCHIVE' ? t.promptArchive : t.originalLab}</span>
                <i aria-hidden="true">↗</i>
              </button>
            ))}
          </div>
        </div>

        {workWorld === 'CREATOR ARCHIVE' ? (
          <div id="creator-archive-panel" role="tabpanel">
            <CreatorArchive locale={locale} />
          </div>
        ) : (
          <section className="work-preview" id="original-lab-panel" role="tabpanel">
            <div className="section-head">
              <h2>{t.originalLab}</h2>
              <p>BOTTOPIA / ORIGINAL PROJECTS</p>
            </div>
            {projects.length > 0 && <div className="filters" aria-label={t.workFilter}>
              {categories.map((category) => (
                <button key={category} className={filter === category ? 'active' : ''} onClick={() => setFilter(category)}>
                  {category} <sup>{category === 'ALL' ? projects.length : projects.filter((item) => item.category === category).length}</sup>
                </button>
              ))}
            </div>}
            {projects.length === 0 ? <div className="archive-empty original-empty"><span>00 / ORIGINAL LAB</span><h3>{originalEmpty.title}</h3><p>{originalEmpty.body}</p><a href="/studio">{originalEmpty.link}</a></div> : <div className="project-grid">
              {visibleProjects.map((work) => (
                <button className={`project-card ${work.ratio}`} key={work.id} onClick={() => setSelected(work)} aria-label={`${work.title} · ${t.projectDetails}`}>
                  <div className={`artwork ${work.className}`}>
                    <span className="art-number">{work.id}</span>
                    <span className="art-orbit" />
                    <span className="art-core" />
                    <span className="view-tag">{t.viewProject}</span>
                  </div>
                  <div className="project-meta">
                    <h3>{work.title}</h3>
                    <span>{work.category} · {work.year}</span>
                  </div>
                </button>
              ))}
            </div>}
          </section>
        )}
      </section>

      <section className="community-manifesto" id="community">
        <div className="community-lead">
          <p className="eyebrow">{community.eyebrow}</p>
          <h2>{community.title[0]}<br />{community.title[1]}<br /><em>{community.title[2]}</em></h2>
          <p>{community.body}</p>
        </div>
        <div className="community-path">
          {community.steps.map(([label, description]) => <article key={label}><span>{label}</span><p>{description}</p></article>)}
          <div className="community-join"><p>{community.cta}</p><MemberLogin locale={locale} /></div>
        </div>
      </section>

      <section className="ecosystem" id="ecosystem">
        <div className="ecosystem-intro">
          <p className="eyebrow">{t.ecosystemEyebrow}</p>
          <h2>{t.ecosystemTitle[0]}<br />{t.ecosystemTitle[1]}<br /><em>{t.ecosystemTitle[2]}</em></h2>
          <p>{t.ecosystemBody}</p>
        </div>
        <div className="orbit-system" aria-label={t.ecosystemAria}>
          <span className="space-grid" /><span className="orbit-ring ring-one" /><span className="orbit-ring ring-two" /><span className="orbit-ring ring-three" />
          <div className="orbit-bot" aria-hidden="true"><i /><b /><b /></div>
          <div className="planet planet-idea"><i />IDEA<small>SEED 01</small></div><div className="planet planet-character"><i />CHARACTER<small>FORM 02</small></div>
          <div className="planet planet-story"><i />STORY<small>WORLD 03</small></div><div className="planet planet-motion"><i />MOTION<small>MOVE 04</small></div><div className="planet planet-remix"><i />REMIX<small>SHARE 05</small></div>
          <p className="orbit-caption">BOT.TOPIA / CREATIVE LOOP / ALWAYS IN MOTION</p>
        </div>
      </section>

      <section className="about" id="about">
        <div className="about-label">
          <p>( {t.aboutLabel} )</p>
          <div className="tiny-bot" aria-hidden="true"><span /></div>
        </div>
        <div className="about-copy">
          <h2>{t.aboutTitle[0]}<br />{t.aboutTitle[1]}<br /><em>{t.aboutTitle[2]}</em></h2>
          <p>{t.aboutBody}</p>
        </div>
      </section>

      <section className="services" aria-labelledby="services-title">
        <p className="eyebrow" id="services-title">{t.whatWeMake}</p>
        <div className="service-list">
          <article><span>01</span><h3>AI FILM</h3><p>{t.services[0]}</p></article>
          <article><span>02</span><h3>CHARACTER</h3><p>{t.services[1]}</p></article>
          <article><span>03</span><h3>CAMPAIGN</h3><p>{t.services[2]}</p></article>
          <article><span>04</span><h3>R&amp;D</h3><p>{t.services[3]}</p></article>
        </div>
        <div className="process-note">
          <span>BRIEF</span><i>→</i><span>WORLD</span><i>→</i><span>MAKE</span><i>→</i><span>DELIVER</span>
        </div>
      </section>

      <section className="contact" id="contact">
        <div className="availability"><i /> {t.booking}</div>
        <p>{t.worldInMind}</p>
        <button onClick={() => setInquiryOpen(true)}>{t.makeReal[0]}<br />{t.makeReal[1]}</button>
        <footer>
          <span>© 2026 BOTTOPIA</span>
          <a href="https://www.instagram.com/bot.topia/" target="_blank" rel="noreferrer">INSTAGRAM @BOT.TOPIA ↗</a>
          <a href="/studio">{t.creatorStudio}</a>
          <a href="#top">{t.backTop}</a>
        </footer>
      </section>

      {selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
          <article className="project-modal" role="dialog" aria-modal="true" aria-labelledby="project-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)} aria-label={t.close}>×</button>
            <div className={`modal-art artwork ${selected.className}`}><span className="art-orbit" /><span className="art-core" /></div>
            <div className="modal-copy">
              <p>{selected.id} / {selected.category} / {selected.year}</p>
              <h2 id="project-title">{selected.title}</h2>
              <p>{selected.summary}</p>
              <button onClick={() => { setSelected(null); setInquiryOpen(true); }}>{t.similarProject}</button>
            </div>
          </article>
        </div>
      )}

      {inquiryOpen && (
        <div className="modal-backdrop inquiry-backdrop" role="presentation" onMouseDown={() => setInquiryOpen(false)}>
          <section className="inquiry-panel" role="dialog" aria-modal="true" aria-labelledby="inquiry-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setInquiryOpen(false)} aria-label={t.close}>×</button>
            <div>
              <p className="eyebrow">{t.inquiryEyebrow}</p>
              <h2 id="inquiry-title">{t.inquiryTitle[0]}<br />{t.inquiryTitle[1]}</h2>
              <p className="inquiry-intro">{t.inquiryIntro}</p>
            </div>
            {!copied ? (
              <form onSubmit={handleInquiry}>
                <label>{t.form.name}<input required name="name" placeholder={t.form.namePlaceholder} /></label>
                <label>{t.form.contact}<input required name="contact" placeholder={t.form.contactPlaceholder} /></label>
                <label>{t.form.type}<select name="project" defaultValue="AI FILM"><option>AI FILM</option><option>CHARACTER</option><option>CAMPAIGN</option><option>OTHER</option></select></label>
                <label>{t.form.range}<input name="range" placeholder={t.form.rangePlaceholder} /></label>
                <label>{t.form.brief}<textarea required name="brief" rows={4} placeholder={t.form.briefPlaceholder} /></label>
                <button type="submit" className="submit-inquiry">{t.form.submit}</button>
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
