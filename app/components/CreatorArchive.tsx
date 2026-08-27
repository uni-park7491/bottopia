'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Locale } from '../i18n';

type ArchiveWork = {
  id: string; title: string; summary: string; category: string; tool: string; model: string; prompt: string;
  negativePrompt: string; videoUrl: string | null; posterUrl: string | null; durationSeconds: number | null;
  copies: number; createdAt: string; visualClass?: string;
};

const demoWorks: ArchiveWork[] = [
  { id: 'demo-01', title: 'THE LAST DELIVERY', summary: '비가 내리는 미래 서울, 마지막 소포를 배달하는 작은 로봇의 밤.', category: 'STORY', tool: 'SEEDANCE', model: '2.0', prompt: 'A tiny white delivery robot walks through a rain-soaked futuristic Seoul alley at midnight. Cinematic handheld tracking, wet neon reflections, quiet emotional performance, realistic rain physics, 35mm film grain, no text, no watermark.', negativePrompt: 'cartoon, plastic texture, extra limbs, subtitles', videoUrl: null, posterUrl: null, durationSeconds: 15, copies: 248, createdAt: '2026-08-23T10:00:00Z', visualClass: 'signal-rain' },
  { id: 'demo-02', title: 'YELLOW EYES', summary: '봇토피아의 시그니처 로봇이 처음 눈을 뜨는 순간.', category: 'CHARACTER', tool: 'KLING', model: 'O1', prompt: 'Extreme close-up of a friendly white robot with a seamless black visor. Two warm yellow rectangular eyes slowly illuminate in darkness. Subtle internal mechanics, premium practical prop realism, soft volumetric haze.', negativePrompt: 'human face, logo, letters, low detail', videoUrl: null, posterUrl: null, durationSeconds: 8, copies: 514, createdAt: '2026-08-22T10:00:00Z', visualClass: 'signal-eyes' },
  { id: 'demo-03', title: 'SOFT MACHINE', summary: '기계가 꿈을 꿀 때 나타나는 부드러운 형상과 움직임.', category: 'EXPERIMENT', tool: 'HAILUO AI', model: '02', prompt: 'A soft chrome organism floats inside a lavender laboratory, continuously folding like fabric and liquid metal. Macro lens, slow orbital camera, tactile reflections, dreamy but photoreal.', negativePrompt: 'hard cuts, text, noisy background', videoUrl: null, posterUrl: null, durationSeconds: 12, copies: 175, createdAt: '2026-08-21T10:00:00Z', visualClass: 'signal-soft' },
  { id: 'demo-04', title: 'NEON FAMILIAR', summary: '낯설지만 이상하게 친근한 디지털 생명체의 초상.', category: 'CHARACTER', tool: 'MIDJOURNEY', model: 'V7', prompt: 'Portrait of an unfamiliar but lovable digital creature, luminous lime fur, deep violet void, symmetrical fashion photography, crisp editorial lighting, subtle breathing motion.', negativePrompt: 'aggressive, horror, typography', videoUrl: null, posterUrl: null, durationSeconds: 10, copies: 392, createdAt: '2026-08-20T10:00:00Z', visualClass: 'signal-neon' },
  { id: 'demo-05', title: 'NEW FOLKLORE', summary: '한국적 상징을 미래의 화면 언어로 번역한 움직이는 설화.', category: 'STORY', tool: 'VEO', model: '3.1', prompt: 'A moonlit Korean mountain shrine transforms into a futuristic signal tower. One continuous crane shot, black ink clouds meeting electric blue light, grounded cinematic realism, wind moving paper talismans.', negativePrompt: 'anime, fantasy game UI, subtitles', videoUrl: null, posterUrl: null, durationSeconds: 20, copies: 621, createdAt: '2026-08-19T10:00:00Z', visualClass: 'signal-folk' },
  { id: 'demo-06', title: 'PLASTIC HEAVEN', summary: '과감한 컬러와 촉감으로 만든 초현실 오브젝트 필름.', category: 'EXPERIMENT', tool: 'RUNWAY', model: 'GEN-4', prompt: 'Glossy translucent objects bloom like flowers on a bright orange table. Graphic commercial lighting, playful scale changes, precise material detail, stop-motion rhythm with realistic shadows.', negativePrompt: 'brand logo, labels, muddy colors', videoUrl: null, posterUrl: null, durationSeconds: 9, copies: 203, createdAt: '2026-08-18T10:00:00Z', visualClass: 'signal-plastic' },
  { id: 'demo-07', title: 'ORBITAL PET', summary: '도시 위를 유영하는 거대한 반려 로봇.', category: 'CHARACTER', tool: 'SEEDANCE', model: '2.0', prompt: 'A huge gentle white robot pet floats between Seoul apartment towers at sunrise. Residents wave from balconies, natural atmospheric perspective, slow telephoto pan, believable scale.', negativePrompt: 'destruction, panic, military, text', videoUrl: null, posterUrl: null, durationSeconds: 15, copies: 447, createdAt: '2026-08-17T10:00:00Z', visualClass: 'signal-orbit' },
  { id: 'demo-08', title: 'MEMORY MARKET', summary: '사람들이 잊고 싶은 기억을 거래하는 야시장.', category: 'STORY', tool: 'KLING', model: '2.6', prompt: 'Night market where people trade glowing memories in glass capsules, intimate documentary camera, Korean street stalls, warm tungsten against cobalt night, layered human activity.', negativePrompt: 'cyberpunk cliché, text, floating UI', videoUrl: null, posterUrl: null, durationSeconds: 18, copies: 338, createdAt: '2026-08-16T10:00:00Z', visualClass: 'signal-market' },
];

const categoryInfo = [
  { key: 'ALL', icon: '⊞', label: 'ALL' },
  { key: 'STORY', icon: '▶', label: 'STORY' },
  { key: 'CHARACTER', icon: '●', label: 'CHARACTER' },
  { key: 'EXPERIMENT', icon: '◇', label: 'EXPERIMENT' },
];

const archiveCopy = {
  ko: { filter: '아카이브 필터', works: '개 작품', latest: '최신', popular: '인기', syncing: '동기화 중…', live: '라이브', ready: '데모 아카이브 · 업로드 준비 완료', promptAria: '프롬프트 보기', viewPrompt: '프롬프트 보기 ↗', close: '닫기', copied: '복사 완료 ✓', copy: '프롬프트 복사 ↗', prompt: '프롬프트', negative: '네거티브', categories: { ALL: '전체', STORY: '스토리', CHARACTER: '캐릭터', EXPERIMENT: '실험' } },
  en: { filter: 'Archive filters', works: 'works', latest: 'LATEST', popular: 'POPULAR', syncing: 'SYNCING…', live: 'LIVE', ready: 'DEMO ARCHIVE · READY FOR YOUR UPLOADS', promptAria: 'View prompt', viewPrompt: 'VIEW PROMPT ↗', close: 'Close', copied: 'COPIED ✓', copy: 'COPY PROMPT ↗', prompt: 'PROMPT', negative: 'NEGATIVE', categories: { ALL: 'ALL', STORY: 'STORY', CHARACTER: 'CHARACTER', EXPERIMENT: 'EXPERIMENT' } },
  zh: { filter: '档案筛选', works: '件作品', latest: '最新', popular: '热门', syncing: '同步中…', live: '在线', ready: '演示档案 · 等待你的上传', promptAria: '查看提示词', viewPrompt: '查看提示词 ↗', close: '关闭', copied: '已复制 ✓', copy: '复制提示词 ↗', prompt: '提示词', negative: '排除提示词', categories: { ALL: '全部', STORY: '故事', CHARACTER: '角色', EXPERIMENT: '实验' } },
  ja: { filter: 'アーカイブフィルター', works: '作品', latest: '新着', popular: '人気', syncing: '同期中…', live: 'ライブ', ready: 'デモアーカイブ · アップロードできます', promptAria: 'プロンプトを見る', viewPrompt: 'プロンプトを見る ↗', close: '閉じる', copied: 'コピー完了 ✓', copy: 'プロンプトをコピー ↗', prompt: 'プロンプト', negative: 'ネガティブ', categories: { ALL: 'すべて', STORY: 'ストーリー', CHARACTER: 'キャラクター', EXPERIMENT: '実験' } },
} as const;

const demoSummaries: Record<Locale, Record<string, string>> = {
  ko: Object.fromEntries(demoWorks.map((work) => [work.id, work.summary])),
  en: { 'demo-01': 'A small robot makes its final delivery through a rainy, futuristic Seoul night.', 'demo-02': 'The first moment BOTTOPIA’s signature robot opens its eyes.', 'demo-03': 'Soft shapes and motion appear when a machine begins to dream.', 'demo-04': 'A portrait of digital life that feels unfamiliar yet strangely friendly.', 'demo-05': 'Korean symbols translated into a moving folklore of the future.', 'demo-06': 'A surreal object film built from bold color and tactile detail.', 'demo-07': 'A giant companion robot drifting above the city.', 'demo-08': 'A night market where people trade memories they want to forget.' },
  zh: { 'demo-01': '雨夜中的未来首尔，小机器人完成最后一次配送。', 'demo-02': 'BOTTOPIA 标志性机器人第一次睁开双眼的瞬间。', 'demo-03': '机器开始做梦时浮现的柔软形态与运动。', 'demo-04': '陌生却又莫名亲切的数字生命肖像。', 'demo-05': '把韩国文化符号翻译成未来影像语言的动态传说。', 'demo-06': '由大胆色彩与真实质感构成的超现实物体影片。', 'demo-07': '漂浮在城市上空的巨型陪伴机器人。', 'demo-08': '人们交易想要忘记的记忆的夜市。' },
  ja: { 'demo-01': '雨の降る未来のソウルで、小さなロボットが最後の荷物を届ける夜。', 'demo-02': 'BOTTOPIAのシグネチャーロボットが初めて目を開く瞬間。', 'demo-03': '機械が夢を見るときに現れる柔らかな形と動き。', 'demo-04': '見慣れないのにどこか親しみを感じるデジタル生命体の肖像。', 'demo-05': '韓国的な象徴を未来の映像言語に変換した動く説話。', 'demo-06': '大胆な色彩と触感でつくったシュールなオブジェクトフィルム。', 'demo-07': '都市の上空を泳ぐ巨大なペットロボット。', 'demo-08': '忘れたい記憶を人々が取引する夜市。' },
};

export default function CreatorArchive({ locale }: { locale: Locale }) {
  const [works, setWorks] = useState<ArchiveWork[]>([]);
  const [active, setActive] = useState<ArchiveWork | null>(null);
  const [category, setCategory] = useState('ALL');
  const [sort, setSort] = useState<'LATEST' | 'POPULAR'>('LATEST');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const t = archiveCopy[locale];
  const getSummary = (work: ArchiveWork) => demoSummaries[locale][work.id] ?? work.summary;

  useEffect(() => {
    fetch('/api/works').then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setWorks(data.works ?? [])).catch(() => setWorks([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setActive(null);
    window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close);
  }, []);

  const source = works.length ? works : demoWorks;
  const visible = useMemo(() => {
    const filtered = category === 'ALL' ? source : source.filter((work) => work.category === category);
    return [...filtered].sort((a, b) => sort === 'POPULAR' ? b.copies - a.copies : +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [category, sort, source]);

  async function copyPrompt(work: ArchiveWork) {
    const text = [work.prompt, work.negativePrompt && `\nNEGATIVE PROMPT\n${work.negativePrompt}`].filter(Boolean).join('\n');
    try { await navigator.clipboard.writeText(text); }
    catch {
      const area = document.createElement('textarea'); area.value = text; document.body.appendChild(area);
      area.select(); document.execCommand('copy'); area.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
    if (!work.id.startsWith('demo-')) fetch(`/api/works/${work.id}/copy`, { method: 'POST' }).catch(() => undefined);
  }

  return (
    <section className="archive">
      <div className="archive-category-grid" aria-label={t.filter}>
        {categoryInfo.map((item) => {
          const count = item.key === 'ALL' ? source.length : source.filter((work) => work.category === item.key).length;
          return <button key={item.key} className={category === item.key ? 'active' : ''} onClick={() => setCategory(item.key)}><i>{item.icon}</i><span>{t.categories[item.key as keyof typeof t.categories]}<small>{locale === 'ko' || locale === 'zh' ? `${count}${t.works}` : `${count} ${t.works}`}</small></span></button>;
        })}
      </div>
      <div className="archive-toolbar">
        <div><button className={sort === 'LATEST' ? 'active' : ''} onClick={() => setSort('LATEST')}>{t.latest}</button><button className={sort === 'POPULAR' ? 'active' : ''} onClick={() => setSort('POPULAR')}>{t.popular}</button></div>
        <span>{loading ? t.syncing : works.length ? `${t.live} · ${works.length} ${t.works}` : t.ready}</span>
      </div>
      <div className="archive-grid">
        {visible.map((work) => (
          <article className="transmission-card" key={work.id}>
            <button className="video-frame" onClick={() => setActive(work)} aria-label={`${work.title} · ${t.promptAria}`}>
              {work.videoUrl ? <video src={work.videoUrl} poster={work.posterUrl ?? undefined} muted loop autoPlay playsInline preload="metadata" /> : <span className={`demo-visual ${work.visualClass}`}><b /><i /></span>}
              <span className="tool-badge">{work.tool || 'AI TOOL'}</span><span className="media-badge">▶ VIDEO</span><span className="open-transmission">{t.viewPrompt}</span>
            </button>
            <div className="transmission-meta"><div><h3>{work.title}</h3><p>{getSummary(work)}</p></div><span>♡ {work.copies}</span></div>
            <p className="archive-author">@BOT.TOPIA</p>
          </article>
        ))}
      </div>

      {active && (
        <div className="modal-backdrop archive-modal-backdrop" role="presentation" onMouseDown={() => setActive(null)}>
          <article className="archive-modal" role="dialog" aria-modal="true" aria-labelledby="archive-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setActive(null)} aria-label={t.close}>×</button>
            <div className="archive-modal-video">{active.videoUrl ? <video src={active.videoUrl} poster={active.posterUrl ?? undefined} controls autoPlay playsInline /> : <span className={`demo-visual ${active.visualClass}`}><b /><i /></span>}</div>
            <div className="archive-modal-copy"><p className="eyebrow">{active.category} · {active.tool || 'AI TOOL'} {active.model && `· ${active.model}`}</p><h2 id="archive-title">{active.title}</h2><p>{getSummary(active)}</p>
              <div className="prompt-block"><span>{t.prompt}</span><pre>{active.prompt}</pre></div>{active.negativePrompt && <div className="prompt-block negative"><span>{t.negative}</span><pre>{active.negativePrompt}</pre></div>}
              <button className="copy-prompt" onClick={() => copyPrompt(active)}>{copied ? t.copied : t.copy}</button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
