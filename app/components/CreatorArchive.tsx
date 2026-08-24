'use client';

import { useEffect, useMemo, useState } from 'react';

type ArchiveWork = {
  id: string;
  title: string;
  summary: string;
  category: string;
  tool: string;
  model: string;
  prompt: string;
  negativePrompt: string;
  videoUrl: string;
  posterUrl: string | null;
  durationSeconds: number | null;
  copies: number;
  createdAt: string;
};

export default function CreatorArchive() {
  const [works, setWorks] = useState<ArchiveWork[]>([]);
  const [active, setActive] = useState<ArchiveWork | null>(null);
  const [category, setCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/works')
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setWorks(data.works ?? []))
      .catch(() => setWorks([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setActive(null);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const categories = useMemo(() => ['ALL', ...Array.from(new Set(works.map((work) => work.category)))], [works]);
  const visible = category === 'ALL' ? works : works.filter((work) => work.category === category);

  async function copyPrompt(work: ArchiveWork) {
    const text = [work.prompt, work.negativePrompt && `\nNEGATIVE PROMPT\n${work.negativePrompt}`].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    fetch(`/api/works/${work.id}/copy`, { method: 'POST' }).catch(() => undefined);
  }

  return (
    <section className="archive">
      <div className="archive-heading">
        <div>
          <p className="eyebrow">BOT.TOPIA CREATOR ARCHIVE</p>
          <h2>WATCH.<br />COPY.<br /><em>REMIX.</em></h2>
        </div>
        <p>영상과 함께 사용한 프롬프트와 제작 도구를 공개합니다. 마음에 드는 세계를 복사하고, 당신만의 방식으로 다시 만들어보세요.</p>
      </div>

      {works.length > 0 && (
        <div className="archive-filters" aria-label="아카이브 필터">
          {categories.map((item) => (
            <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>
          ))}
          <span>LIVE · {works.length} TRANSMISSIONS</span>
        </div>
      )}

      {loading ? (
        <div className="archive-loading"><i /><span>RECEIVING TRANSMISSIONS...</span></div>
      ) : works.length === 0 ? (
        <div className="archive-empty">
          <div className="empty-signal"><i /><i /><i /></div>
          <p>FIRST TRANSMISSION<br />COMING SOON.</p>
          <span>새로운 영상과 프롬프트가 이곳에 착륙합니다.</span>
          <a href="https://www.instagram.com/bot.topia/" target="_blank" rel="noreferrer">FOLLOW @BOT.TOPIA ↗</a>
        </div>
      ) : (
        <div className="archive-grid">
          {visible.map((work, index) => (
            <article className="transmission-card" key={work.id}>
              <button className="video-frame" onClick={() => setActive(work)} aria-label={`${work.title} 프롬프트 보기`}>
                <video src={work.videoUrl} poster={work.posterUrl ?? undefined} muted loop autoPlay playsInline preload="metadata" />
                <span className="transmission-index">T-{String(index + 1).padStart(3, '0')}</span>
                <span className="signal-live"><i /> LIVE</span>
                <span className="open-transmission">OPEN PROMPT ↗</span>
              </button>
              <div className="transmission-meta">
                <div><h3>{work.title}</h3><p>{work.summary}</p></div>
                <span>{work.category}<br />{work.tool || 'AI TOOL'}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {active && (
        <div className="modal-backdrop archive-modal-backdrop" role="presentation" onMouseDown={() => setActive(null)}>
          <article className="archive-modal" role="dialog" aria-modal="true" aria-labelledby="archive-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setActive(null)} aria-label="닫기">×</button>
            <div className="archive-modal-video"><video src={active.videoUrl} poster={active.posterUrl ?? undefined} controls autoPlay playsInline /></div>
            <div className="archive-modal-copy">
              <p className="eyebrow">{active.category} · {active.tool || 'AI TOOL'} {active.model && `· ${active.model}`}</p>
              <h2 id="archive-title">{active.title}</h2>
              <p>{active.summary}</p>
              <div className="prompt-block"><span>PROMPT</span><pre>{active.prompt}</pre></div>
              {active.negativePrompt && <div className="prompt-block negative"><span>NEGATIVE</span><pre>{active.negativePrompt}</pre></div>}
              <button className="copy-prompt" onClick={() => copyPrompt(active)}>{copied ? 'COPIED ✓' : 'COPY PROMPT ↗'}</button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
