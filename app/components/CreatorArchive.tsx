'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Locale } from '../i18n';
import CommunityPanel from './CommunityPanel';

type ArchiveWork = {
  id: string; title: string; summary: string; category: string; tool: string; model: string; prompt: string;
  negativePrompt: string; videoUrl: string | null; posterUrl: string | null; durationSeconds: number | null;
  copies: number; createdAt: string;
};

const categoryInfo = [
  { key: 'ALL', icon: '⊞', label: 'ALL' },
  { key: 'STORY', icon: '▶', label: 'STORY' },
  { key: 'CHARACTER', icon: '●', label: 'CHARACTER' },
  { key: 'EXPERIMENT', icon: '◇', label: 'EXPERIMENT' },
];

const archiveCopy = {
  ko: { filter: '아카이브 필터', works: '개 작품', latest: '최신', popular: '인기', syncing: '동기화 중…', live: '라이브', ready: '첫 작품 업로드 준비 완료', emptyTitle: '아직 공개된 작품이 없습니다.', emptyBody: 'BOTTOPIA가 직접 만든 영상과 프롬프트가 곧 이곳에 공개됩니다.', ownerLink: '운영자 스튜디오에서 업로드하기 ↗', promptAria: '프롬프트 보기', viewPrompt: '프롬프트 보기 ↗', close: '닫기', copied: '복사 완료 ✓', copy: '프롬프트 복사 ↗', prompt: '프롬프트', negative: '네거티브', categories: { ALL: '전체', STORY: '스토리', CHARACTER: '캐릭터', EXPERIMENT: '실험' } },
  en: { filter: 'Archive filters', works: 'works', latest: 'LATEST', popular: 'POPULAR', syncing: 'SYNCING…', live: 'LIVE', ready: 'READY FOR THE FIRST UPLOAD', emptyTitle: 'NO WORKS PUBLISHED YET.', emptyBody: 'Original BOTTOPIA films and prompts will appear here soon.', ownerLink: 'UPLOAD FROM CREATOR STUDIO ↗', promptAria: 'View prompt', viewPrompt: 'VIEW PROMPT ↗', close: 'Close', copied: 'COPIED ✓', copy: 'COPY PROMPT ↗', prompt: 'PROMPT', negative: 'NEGATIVE', categories: { ALL: 'ALL', STORY: 'STORY', CHARACTER: 'CHARACTER', EXPERIMENT: 'EXPERIMENT' } },
  zh: { filter: '档案筛选', works: '件作品', latest: '最新', popular: '热门', syncing: '同步中…', live: '在线', ready: '已准备好首次上传', emptyTitle: '尚未发布作品。', emptyBody: 'BOTTOPIA 的原创影片与提示词即将在这里公开。', ownerLink: '前往创作者工作室上传 ↗', promptAria: '查看提示词', viewPrompt: '查看提示词 ↗', close: '关闭', copied: '已复制 ✓', copy: '复制提示词 ↗', prompt: '提示词', negative: '排除提示词', categories: { ALL: '全部', STORY: '故事', CHARACTER: '角色', EXPERIMENT: '实验' } },
  ja: { filter: 'アーカイブフィルター', works: '作品', latest: '新着', popular: '人気', syncing: '同期中…', live: 'ライブ', ready: '最初のアップロード準備完了', emptyTitle: 'まだ公開作品はありません。', emptyBody: 'BOTTOPIAのオリジナル映像とプロンプトを、まもなくここで公開します。', ownerLink: 'クリエイタースタジオからアップロード ↗', promptAria: 'プロンプトを見る', viewPrompt: 'プロンプトを見る ↗', close: '閉じる', copied: 'コピー完了 ✓', copy: 'プロンプトをコピー ↗', prompt: 'プロンプト', negative: 'ネガティブ', categories: { ALL: 'すべて', STORY: 'ストーリー', CHARACTER: 'キャラクター', EXPERIMENT: '実験' } },
} as const;

export default function CreatorArchive({ locale }: { locale: Locale }) {
  const [works, setWorks] = useState<ArchiveWork[]>([]);
  const [active, setActive] = useState<ArchiveWork | null>(null);
  const [category, setCategory] = useState('ALL');
  const [sort, setSort] = useState<'LATEST' | 'POPULAR'>('LATEST');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const t = archiveCopy[locale];

  useEffect(() => {
    fetch('/api/works').then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setWorks(data.works ?? [])).catch(() => setWorks([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setActive(null);
    window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close);
  }, []);

  const source = works;
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
      {visible.length === 0 ? <div className="archive-empty"><span>00 / BOTTOPIA ARCHIVE</span><h3>{t.emptyTitle}</h3><p>{t.emptyBody}</p><a href="/studio">{t.ownerLink}</a></div> : <div className="archive-grid">
        {visible.map((work) => (
          <article className="transmission-card" key={work.id}>
            <button className="video-frame" onClick={() => setActive(work)} aria-label={`${work.title} · ${t.promptAria}`}>
              {work.videoUrl ? <video src={work.videoUrl} poster={work.posterUrl ?? undefined} muted loop autoPlay playsInline preload="metadata" /> : <span className="media-placeholder" />}
              <span className="tool-badge">{work.tool || 'AI TOOL'}</span><span className="media-badge">▶ VIDEO</span><span className="open-transmission">{t.viewPrompt}</span>
            </button>
            <div className="transmission-meta"><div><h3>{work.title}</h3><p>{work.summary}</p></div><span>↗ {work.copies}</span></div>
            <p className="archive-author">@BOT.TOPIA</p>
          </article>
        ))}
      </div>}

      {active && (
        <div className="modal-backdrop archive-modal-backdrop" role="presentation" onMouseDown={() => setActive(null)}>
          <article className="archive-modal" role="dialog" aria-modal="true" aria-labelledby="archive-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setActive(null)} aria-label={t.close}>×</button>
            <div className="archive-modal-video">{active.videoUrl ? <video src={active.videoUrl} poster={active.posterUrl ?? undefined} controls autoPlay playsInline /> : <span className="media-placeholder" />}</div>
            <div className="archive-modal-copy"><p className="eyebrow">{active.category} · {active.tool || 'AI TOOL'} {active.model && `· ${active.model}`}</p><h2 id="archive-title">{active.title}</h2><p>{active.summary}</p>
              <div className="prompt-block"><span>{t.prompt}</span><pre>{active.prompt}</pre></div>{active.negativePrompt && <div className="prompt-block negative"><span>{t.negative}</span><pre>{active.negativePrompt}</pre></div>}
              <button className="copy-prompt" onClick={() => copyPrompt(active)}>{copied ? t.copied : t.copy}</button>
              <CommunityPanel workId={active.id} locale={locale} isDemo={false} />
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
