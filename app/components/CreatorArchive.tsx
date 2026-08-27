'use client';

import { useEffect, useMemo, useState } from 'react';

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

export default function CreatorArchive() {
  const [works, setWorks] = useState<ArchiveWork[]>([]);
  const [active, setActive] = useState<ArchiveWork | null>(null);
  const [category, setCategory] = useState('ALL');
  const [sort, setSort] = useState<'LATEST' | 'POPULAR'>('LATEST');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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
      <div className="archive-category-grid" aria-label="아카이브 필터">
        {categoryInfo.map((item) => {
          const count = item.key === 'ALL' ? source.length : source.filter((work) => work.category === item.key).length;
          return <button key={item.key} className={category === item.key ? 'active' : ''} onClick={() => setCategory(item.key)}><i>{item.icon}</i><span>{item.label}<small>{count} works</small></span></button>;
        })}
      </div>
      <div className="archive-toolbar">
        <div><button className={sort === 'LATEST' ? 'active' : ''} onClick={() => setSort('LATEST')}>LATEST</button><button className={sort === 'POPULAR' ? 'active' : ''} onClick={() => setSort('POPULAR')}>POPULAR</button></div>
        <span>{loading ? 'SYNCING…' : works.length ? `LIVE · ${works.length} WORKS` : 'DEMO ARCHIVE · READY FOR YOUR UPLOADS'}</span>
      </div>
      <div className="archive-grid">
        {visible.map((work) => (
          <article className="transmission-card" key={work.id}>
            <button className="video-frame" onClick={() => setActive(work)} aria-label={`${work.title} 프롬프트 보기`}>
              {work.videoUrl ? <video src={work.videoUrl} poster={work.posterUrl ?? undefined} muted loop autoPlay playsInline preload="metadata" /> : <span className={`demo-visual ${work.visualClass}`}><b /><i /></span>}
              <span className="tool-badge">{work.tool || 'AI TOOL'}</span><span className="media-badge">▶ VIDEO</span><span className="open-transmission">VIEW PROMPT ↗</span>
            </button>
            <div className="transmission-meta"><div><h3>{work.title}</h3><p>{work.summary}</p></div><span>♡ {work.copies}</span></div>
            <p className="archive-author">@BOT.TOPIA</p>
          </article>
        ))}
      </div>

      {active && (
        <div className="modal-backdrop archive-modal-backdrop" role="presentation" onMouseDown={() => setActive(null)}>
          <article className="archive-modal" role="dialog" aria-modal="true" aria-labelledby="archive-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setActive(null)} aria-label="닫기">×</button>
            <div className="archive-modal-video">{active.videoUrl ? <video src={active.videoUrl} poster={active.posterUrl ?? undefined} controls autoPlay playsInline /> : <span className={`demo-visual ${active.visualClass}`}><b /><i /></span>}</div>
            <div className="archive-modal-copy"><p className="eyebrow">{active.category} · {active.tool || 'AI TOOL'} {active.model && `· ${active.model}`}</p><h2 id="archive-title">{active.title}</h2><p>{active.summary}</p>
              <div className="prompt-block"><span>PROMPT</span><pre>{active.prompt}</pre></div>{active.negativePrompt && <div className="prompt-block negative"><span>NEGATIVE</span><pre>{active.negativePrompt}</pre></div>}
              <button className="copy-prompt" onClick={() => copyPrompt(active)}>{copied ? 'COPIED ✓' : 'COPY PROMPT ↗'}</button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
