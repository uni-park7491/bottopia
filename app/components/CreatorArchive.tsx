'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '../i18n';
import dynamic from 'next/dynamic';
import PreviewVideo from './PreviewVideo';
const CommunityPanel = dynamic(() => import('./CommunityPanel'));
import { filterWorks } from '../../lib/feed-policy';
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
  ko: { eyebrow: 'SELECTED WORK / 2026', title: '작품 피드', intro: '영상을 보고, 프롬프트를 가져가 나만의 장면을 만들어 보세요.', filter: '작품 분류', works: '개', latest: '최신순', popular: '많이 복사된 순', syncing: '작품 불러오는 중…', ready: '다음 작품을 기다리는 중', emptyTitle: '아직 공개된 작품이 없습니다.', emptyBody: '실제 BOTTOPIA 작품이 완성되면 이곳에 직접 업로드됩니다.', ownerLink: '운영자 스튜디오에서 업로드하기 ↗', promptAria: '작품과 프롬프트 보기', viewCase: '프로젝트 전체 보기 ↗', open: '작품 열기 ↗', close: '닫기', copied: '복사 완료 ✓', copy: '전체 프롬프트 복사 ↗', prompt: 'FULL PROMPT', negative: 'NEGATIVE PROMPT', categories: { ALL: '전체 작품', STORY: '스토리', CHARACTER: '캐릭터', EXPERIMENT: '실험', 'BRAND FILM': '브랜드 필름' } },
  en: { eyebrow: 'SELECTED WORK / 2026', title: 'SELECTED WORLDS.', intro: 'Real BOTTOPIA work, published together with the prompts that built each scene.', filter: 'WORK FILTERS', works: 'WORKS', latest: 'LATEST', popular: 'MOST COPIED', syncing: 'RECEIVING WORKS…', ready: 'WAITING FOR THE NEXT WORK', emptyTitle: 'NO WORKS PUBLISHED YET.', emptyBody: 'Completed BOTTOPIA projects will be uploaded here directly.', ownerLink: 'UPLOAD FROM CREATOR STUDIO ↗', promptAria: 'View work and prompt', viewCase: 'VIEW FULL PROJECT ↗', open: 'OPEN WORK ↗', close: 'Close', copied: 'COPIED ✓', copy: 'COPY FULL PROMPT ↗', prompt: 'FULL PROMPT', negative: 'NEGATIVE PROMPT', categories: { ALL: 'ALL WORK', STORY: 'STORY', CHARACTER: 'CHARACTER', EXPERIMENT: 'EXPERIMENT', 'BRAND FILM': 'BRAND FILM' } },
  zh: { eyebrow: '精选作品 / 2026', title: '精选世界。', intro: '公开 BOTTOPIA 的真实作品，以及构建每个场景的完整提示词。', filter: '作品筛选', works: '件', latest: '最新', popular: '最多复制', syncing: '正在加载作品…', ready: '等待下一件作品', emptyTitle: '尚未发布作品。', emptyBody: 'BOTTOPIA 的实际项目完成后将直接上传至此。', ownerLink: '前往创作者工作室上传 ↗', promptAria: '查看作品与提示词', viewCase: '查看完整项目 ↗', open: '打开作品 ↗', close: '关闭', copied: '已复制 ✓', copy: '复制完整提示词 ↗', prompt: '完整提示词', negative: '排除提示词', categories: { ALL: '全部作品', STORY: '故事', CHARACTER: '角色', EXPERIMENT: '实验', 'BRAND FILM': '品牌影片' } },
  ja: { eyebrow: 'SELECTED WORK / 2026', title: '選ばれた世界。', intro: 'BOTTOPIAの実際の作品と、各シーンを構築したプロンプトを一緒に公開します。', filter: '作品フィルター', works: '作品', latest: '新着', popular: 'コピー順', syncing: '作品を読み込み中…', ready: '次の作品を待っています', emptyTitle: 'まだ公開作品はありません。', emptyBody: 'BOTTOPIAの実際のプロジェクトが完成したら、ここに直接アップロードされます。', ownerLink: 'クリエイタースタジオからアップロード ↗', promptAria: '作品とプロンプトを見る', viewCase: 'プロジェクト全体を見る ↗', open: '作品を開く ↗', close: '閉じる', copied: 'コピー完了 ✓', copy: '全プロンプトをコピー ↗', prompt: 'FULL PROMPT', negative: 'NEGATIVE PROMPT', categories: { ALL: '全作品', STORY: 'ストーリー', CHARACTER: 'キャラクター', EXPERIMENT: '実験', 'BRAND FILM': 'ブランドフィルム' } },
} as const;

export default function CreatorArchive({ locale }: { locale: Locale }) {
  const [works, setWorks] = useState<ArchiveWork[]>([]);
  const [active, setActive] = useState<ArchiveWork | null>(null);
  const [category, setCategory] = useState('ALL');
  const [query, setQuery] = useState('');
  const [originalsOnly, setOriginalsOnly] = useState(false);
  const [limit, setLimit] = useState(24);
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
        setOriginalsOnly(new URLSearchParams(window.location.search).get('collection') === 'originals');
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

  const visible = useMemo(() => filterWorks(works, category, query, originalsOnly, sort), [category, sort, works, query, originalsOnly]);

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

  const gridWorks = visible.slice(0, limit);
  const ko = locale === 'ko';

  return <section className="archive portfolio-archive">
    <header className="portfolio-archive-head">
      <div><p className="eyebrow">{t.eyebrow}</p><h2>{t.title}</h2></div>
      <p>{t.intro}</p>
    </header>


    <div className="feed-controls">
      <div className="feed-search-row">
        <label className="feed-search"><span className="sr-only">{ko ? '작품 검색' : 'Search works'}</span><input type="search" value={query} placeholder={ko ? '작품, 크리에이터, AI 도구 검색' : 'Search works, creators and tools'} onChange={e => { setQuery(e.target.value); setLimit(24); }} /></label>
        <label className="feed-sort"><span className="sr-only">{ko ? '정렬' : 'Sort'}</span><select value={sort} onChange={e => setSort(e.target.value as typeof sort)}><option value="LATEST">{t.latest}</option><option value="POPULAR">{t.popular}</option></select></label>
      </div>
      <div className="feed-filters" aria-label={t.filter}>{categoryInfo.map(item => <button key={item.key} aria-pressed={category === item.key} onClick={() => { setCategory(item.key); setLimit(24); }}>{t.categories[item.key]}</button>)}<button className="original-filter" aria-pressed={originalsOnly} onClick={() => { setOriginalsOnly(!originalsOnly); setLimit(24); }}>{ko ? 'BOTTOPIA 오리지널' : 'BOTTOPIA Originals'}</button></div>
      <div className="feed-status"><p>{originalsOnly ? (ko ? '봇토피아가 직접 제작한 공식 작품입니다.' : 'Official work created by BOTTOPIA.') : (ko ? '작품과 제작 과정을 함께 둘러보세요.' : 'Discover the work and the process behind it.')}</p><span>{visible.length} {t.works}</span></div>
    </div>
    {loading ? <div className="archive-empty" role="status">{t.syncing}</div> : loadFailed ? <div className="archive-empty" role="alert">{ko ? '작품을 불러오지 못했습니다. 새로고침해 주세요.' : 'Unable to load works. Please refresh.'}</div> : visible.length === 0 ? <div className="archive-empty"><h3>{works.length ? (ko ? '조건에 맞는 작품이 없습니다.' : 'No matching works.') : t.emptyTitle}</h3><p>{works.length ? (ko ? '다른 검색어나 분류를 선택해 주세요.' : 'Try another search or category.') : t.emptyBody}</p>{works.length > 0 ? <button onClick={() => { setCategory('ALL'); setQuery(''); setOriginalsOnly(false); }}>{ko ? '필터 초기화' : 'Reset filters'}</button> : <Link href="/studio">{t.ownerLink}</Link>}</div> : <>
      {gridWorks.length > 0 && <div className="archive-grid">{gridWorks.map((work, index) => <article className="transmission-card" key={work.id}>
        <button className="video-frame" onMouseEnter={(event) => playPreview(event.currentTarget)} onMouseLeave={(event) => stopPreview(event.currentTarget)} onFocus={(event) => playPreview(event.currentTarget)} onBlur={(event) => stopPreview(event.currentTarget)} onClick={() => setActive(work)} aria-label={`${work.title} · ${t.promptAria}`}>
          {work.videoUrl ? <PreviewVideo src={work.videoUrl} poster={work.posterUrl ?? undefined} /> : <span className="media-placeholder" />}<span className="tool-badge">{work.tool || 'AI TOOL'}</span><span className="media-badge">{String(index + 1).padStart(2, '0')}</span><span className="open-transmission">{t.open}</span>
        </button>
        <div className="transmission-meta"><div>{work.creator && <Link className="transmission-creator" href={`/creators/${work.creator.handle}`}>@{work.creator.handle} ↗</Link>}<h3><Link href={`/works/${work.id}`}>{work.title}</Link></h3><p>{work.summary}</p></div><span>{work.workType || 'ORIGINAL'}<br />{work.category}<br />{new Date(work.createdAt).getFullYear()}</span></div>
        <div className="transmission-prompt"><div><span>{t.prompt}</span><p>{work.prompt}</p></div><button className={copiedId === work.id ? 'copied' : ''} onClick={() => copyPrompt(work)}>{copiedId === work.id ? t.copied : t.copy}</button></div>
      {copyFailedId === work.id && <p className="prompt-copy-error" role="alert">{clipboardError[locale]}</p>}
      </article>)}</div>}
      {visible.length > limit && <button className="feed-load-more" onClick={() => setLimit(n => n + 24)}>{ko ? '작품 더 보기' : 'Load more'}</button>}
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
