'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '../i18n';
import CommunityPanel from './CommunityPanel';
import { copyText, clipboardError } from '../../lib/clipboard';
import type { PublicCreator } from '../../lib/profiles';

export type ArchiveWork = {
  id: string; slug: string; title: string; summary: string; category: string; tool: string; model: string; prompt: string;
  negativePrompt: string; videoUrl: string | null; posterUrl: string | null; durationSeconds: number | null;
  copies: number; createdAt: string;
  creator?: PublicCreator | null; workType?: string; remixOf?: string | null; processNotes?: string; aspectRatio?: string; seed?: string;
};

const categoryInfo = [
  { key: 'ALL', marker: '00' },
  { key: 'STORY', marker: '01' },
  { key: 'CHARACTER', marker: '02' },
  { key: 'EXPERIMENT', marker: '03' },
  { key: 'BRAND FILM', marker: '04' },
] as const;

const archiveCopy = {
  ko: { eyebrow: 'SELECTED WORK / 2026', title: '선택된 세계들.', intro: 'BOTTOPIA의 실제 작품과 그 장면을 만든 프롬프트를 함께 공개합니다.', filter: '작품 분류', works: '개', latest: '최신순', popular: '많이 복사된 순', syncing: '작품 불러오는 중…', ready: '다음 작품을 기다리는 중', emptyTitle: '아직 공개된 작품이 없습니다.', emptyBody: '실제 BOTTOPIA 작품이 완성되면 이곳에 직접 업로드됩니다.', ownerLink: '운영자 스튜디오에서 업로드하기 ↗', promptAria: '작품과 프롬프트 보기', viewCase: '프로젝트 전체 보기 ↗', open: '작품 열기 ↗', close: '닫기', copied: '복사 완료 ✓', copy: '전체 프롬프트 복사 ↗', prompt: 'FULL PROMPT', negative: 'NEGATIVE PROMPT', categories: { ALL: '전체 작품', STORY: '스토리', CHARACTER: '캐릭터', EXPERIMENT: '실험', 'BRAND FILM': '브랜드 필름' } },
  en: { eyebrow: 'SELECTED WORK / 2026', title: 'SELECTED WORLDS.', intro: 'Real BOTTOPIA work, published together with the prompts that built each scene.', filter: 'WORK FILTERS', works: 'WORKS', latest: 'LATEST', popular: 'MOST COPIED', syncing: 'RECEIVING WORKS…', ready: 'WAITING FOR THE NEXT WORK', emptyTitle: 'NO WORKS PUBLISHED YET.', emptyBody: 'Completed BOTTOPIA projects will be uploaded here directly.', ownerLink: 'UPLOAD FROM CREATOR STUDIO ↗', promptAria: 'View work and prompt', viewCase: 'VIEW FULL PROJECT ↗', open: 'OPEN WORK ↗', close: 'Close', copied: 'COPIED ✓', copy: 'COPY FULL PROMPT ↗', prompt: 'FULL PROMPT', negative: 'NEGATIVE PROMPT', categories: { ALL: 'ALL WORK', STORY: 'STORY', CHARACTER: 'CHARACTER', EXPERIMENT: 'EXPERIMENT', 'BRAND FILM': 'BRAND FILM' } },
  zh: { eyebrow: '精选作品 / 2026', title: '精选世界。', intro: '公开 BOTTOPIA 的真实作品，以及构建每个场景的完整提示词。', filter: '作品筛选', works: '件', latest: '最新', popular: '最多复制', syncing: '正在加载作品…', ready: '等待下一件作品', emptyTitle: '尚未发布作品。', emptyBody: 'BOTTOPIA 的实际项目完成后将直接上传至此。', ownerLink: '前往创作者工作室上传 ↗', promptAria: '查看作品与提示词', viewCase: '查看完整项目 ↗', open: '打开作品 ↗', close: '关闭', copied: '已复制 ✓', copy: '复制完整提示词 ↗', prompt: '完整提示词', negative: '排除提示词', categories: { ALL: '全部作品', STORY: '故事', CHARACTER: '角色', EXPERIMENT: '实验', 'BRAND FILM': '品牌影片' } },
  ja: { eyebrow: 'SELECTED WORK / 2026', title: '選ばれた世界。', intro: 'BOTTOPIAの実際の作品と、各シーンを構築したプロンプトを一緒に公開します。', filter: '作品フィルター', works: '作品', latest: '新着', popular: 'コピー順', syncing: '作品を読み込み中…', ready: '次の作品を待っています', emptyTitle: 'まだ公開作品はありません。', emptyBody: 'BOTTOPIAの実際のプロジェクトが完成したら、ここに直接アップロードされます。', ownerLink: 'クリエイタースタジオからアップロード ↗', promptAria: '作品とプロンプトを見る', viewCase: 'プロジェクト全体を見る ↗', open: '作品を開く ↗', close: '閉じる', copied: 'コピー完了 ✓', copy: '全プロンプトをコピー ↗', prompt: 'FULL PROMPT', negative: 'NEGATIVE PROMPT', categories: { ALL: '全作品', STORY: 'ストーリー', CHARACTER: 'キャラクター', EXPERIMENT: '実験', 'BRAND FILM': 'ブランドフィルム' } },
} as const;

export default function CreatorArchive({ locale }: { locale: Locale }) {
  const [works, setWorks] = useState<ArchiveWork[]>([]);
  const [active, setActive] = useState<ArchiveWork | null>(null);
  const [category, setCategory] = useState('ALL');
  const [sort, setSort] = useState<'LATEST' | 'POPULAR'>('LATEST');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyFailedId, setCopyFailedId] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const t = archiveCopy[locale];

  useEffect(() => {
    let live = true;
    fetch('/api/works').then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        if (!live) return;
        const published: ArchiveWork[] = data.works ?? [];
        setWorks(published);
        const requested = new URLSearchParams(window.location.search).get('work');
        if (requested) setActive(published.find((work) => work.id === requested) ?? null);
      })
      .catch(() => { if (live) setLoadFailed(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setActive(null);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const visible = useMemo(() => {
    const filtered = category === 'ALL' ? works : works.filter((work) => work.category === category);
    return [...filtered].sort((a, b) => sort === 'POPULAR' ? b.copies - a.copies : +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [category, sort, works]);

  async function copyPrompt(work: ArchiveWork) {
    const text = [work.prompt, work.negativePrompt && `\nNEGATIVE PROMPT\n${work.negativePrompt}`].filter(Boolean).join('\n');
    setCopyFailedId(null);
    if (!(await copyText(text))) { setCopiedId(null); setCopyFailedId(work.id); return; }
    setCopiedId(work.id);
    window.setTimeout(() => setCopiedId((current) => current === work.id ? null : current), 1800);
    fetch(`/api/works/${work.id}/copy`, { method: 'POST' }).catch(() => undefined);
  }

  function playPreview(target: HTMLElement) {
    const video = target.querySelector('video');
    if (video) void video.play().catch(() => undefined);
  }

  function stopPreview(target: HTMLElement) {
    const video = target.querySelector('video');
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  }

  const featured = visible[0] ?? null;
  const gridWorks = visible.slice(1);

  return <section className="archive portfolio-archive">
    <header className="portfolio-archive-head">
      <div><p className="eyebrow">{t.eyebrow}</p><h2>{t.title}</h2></div>
      <p>{t.intro}</p>
    </header>

    {loading ? <div className="archive-empty" role="status">{t.syncing}</div> : loadFailed ? <div className="archive-empty" role="alert">ARCHIVE CONNECTION LOST. PLEASE REFRESH.</div> : !featured ? <div className="archive-empty"><span>00 / BOTTOPIA ARCHIVE</span><h3>{t.emptyTitle}</h3><p>{t.emptyBody}</p><Link href="/studio">{t.ownerLink}</Link></div> : <>
      <article className="featured-work" onMouseEnter={(event) => playPreview(event.currentTarget)} onMouseLeave={(event) => stopPreview(event.currentTarget)}>
        <button className="featured-media" onClick={() => setActive(featured)} aria-label={`${featured.title} · ${t.promptAria}`}>
          {featured.videoUrl ? <video src={featured.videoUrl} poster={featured.posterUrl ?? undefined} muted loop playsInline preload="metadata" /> : <span className="media-placeholder" />}
          <span>FEATURED / 01</span><i>PLAY + PROCESS ↗</i>
        </button>
        <div className="featured-copy"><div className="featured-kicker"><span>{featured.workType || 'ORIGINAL'} · {featured.category}</span><span>{new Date(featured.createdAt).getFullYear()}</span></div>{featured.creator ? <Link className="work-creator-link" href={`/creators/${featured.creator.handle}`}><span>{featured.creator.displayName}</span><small>@{featured.creator.handle} · VIEW CREATOR ↗</small></Link> : <div className="work-creator-link static"><span>BOT.TOPIA</span><small>FOUNDING CREATOR</small></div>}<h3>{featured.title}</h3><p>{featured.summary}</p><dl><div><dt>ROLE</dt><dd>AI DIRECTOR</dd></div><div><dt>TOOL</dt><dd>{featured.tool || '—'}</dd></div><div><dt>MODEL</dt><dd>{featured.model || '—'}</dd></div><div><dt>LENGTH</dt><dd>{featured.durationSeconds ? `${featured.durationSeconds} SEC` : '—'}</dd></div></dl><div className="featured-actions"><button onClick={() => copyPrompt(featured)}>{copiedId === featured.id ? t.copied : t.copy}</button><Link href={`/works/${featured.id}`}>{t.viewCase}</Link></div>{copyFailedId === featured.id && <p className="prompt-copy-error" role="alert">{clipboardError[locale]}</p>}</div>
      </article>

      <section className="archive-index">
        <div className="archive-index-title"><p className="eyebrow">{t.filter}</p><span>{visible.length} {t.works}</span></div>
        <div className="archive-category-grid" aria-label={t.filter}>{categoryInfo.map((item) => {
          const count = item.key === 'ALL' ? works.length : works.filter((work) => work.category === item.key).length;
          return <button key={item.key} className={category === item.key ? 'active' : ''} onClick={() => setCategory(item.key)}><i>{item.marker}</i><span>{t.categories[item.key]}<small>{count} {t.works}</small></span></button>;
        })}</div>
        <div className="archive-toolbar"><div><button className={sort === 'LATEST' ? 'active' : ''} onClick={() => setSort('LATEST')}>{t.latest}</button><button className={sort === 'POPULAR' ? 'active' : ''} onClick={() => setSort('POPULAR')}>{t.popular}</button></div><span>{t.ready}</span></div>
      </section>

      {gridWorks.length > 0 && <div className="archive-grid">{gridWorks.map((work, index) => <article className="transmission-card" key={work.id}>
        <button className="video-frame" onMouseEnter={(event) => playPreview(event.currentTarget)} onMouseLeave={(event) => stopPreview(event.currentTarget)} onFocus={(event) => playPreview(event.currentTarget)} onBlur={(event) => stopPreview(event.currentTarget)} onClick={() => setActive(work)} aria-label={`${work.title} · ${t.promptAria}`}>
          {work.videoUrl ? <video src={work.videoUrl} poster={work.posterUrl ?? undefined} muted loop playsInline preload="metadata" /> : <span className="media-placeholder" />}<span className="tool-badge">{work.tool || 'AI TOOL'}</span><span className="media-badge">0{index + 2}</span><span className="open-transmission">{t.open}</span>
        </button>
        <div className="transmission-meta"><div>{work.creator && <Link className="transmission-creator" href={`/creators/${work.creator.handle}`}>@{work.creator.handle} ↗</Link>}<h3>{work.title}</h3><p>{work.summary}</p></div><span>{work.workType || 'ORIGINAL'}<br />{work.category}<br />{new Date(work.createdAt).getFullYear()}</span></div>
        <div className="transmission-prompt"><div><span>{t.prompt}</span><p>{work.prompt}</p></div><button className={copiedId === work.id ? 'copied' : ''} onClick={() => copyPrompt(work)}>{copiedId === work.id ? t.copied : t.copy}</button></div>
      </article>)}</div>}
    </>}

    {active && <div className="modal-backdrop archive-modal-backdrop" role="presentation" onMouseDown={() => setActive(null)}>
      <article className="archive-modal" role="dialog" aria-modal="true" aria-labelledby="archive-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={() => setActive(null)} aria-label={t.close}>×</button>
        <div className="archive-modal-video">{active.videoUrl ? <video src={active.videoUrl} poster={active.posterUrl ?? undefined} controls autoPlay playsInline /> : <span className="media-placeholder" />}</div>
        <div className="archive-modal-copy"><p className="eyebrow">{active.workType || 'ORIGINAL'} · {active.category} · {new Date(active.createdAt).getFullYear()}</p>{active.creator && <Link className="work-creator-link" href={`/creators/${active.creator.handle}`}><span>{active.creator.displayName}</span><small>@{active.creator.handle} · VIEW CREATOR ↗</small></Link>}<h2 id="archive-title">{active.title}</h2><p>{active.summary}</p>
          <dl className="modal-project-data"><div><dt>TOOL</dt><dd>{active.tool || '—'}</dd></div><div><dt>MODEL</dt><dd>{active.model || '—'}</dd></div><div><dt>DURATION</dt><dd>{active.durationSeconds ? `${active.durationSeconds} SEC` : '—'}</dd></div></dl>
          <div className="prompt-block"><span>{t.prompt}</span><pre>{active.prompt}</pre></div>{active.negativePrompt && <div className="prompt-block negative"><span>{t.negative}</span><pre>{active.negativePrompt}</pre></div>}
          <div className="modal-actions"><button className="copy-prompt" onClick={() => copyPrompt(active)}>{copiedId === active.id ? t.copied : t.copy}</button><Link href={`/works/${active.id}`}>{t.viewCase}</Link></div>
          {copyFailedId === active.id && <p className="auth-error" role="alert">{clipboardError[locale]}</p>}
          <CommunityPanel key={active.id} workId={active.id} locale={locale} isDemo={false} />
        </div>
      </article>
    </div>}
  </section>;
}
