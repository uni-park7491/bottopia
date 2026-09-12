'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import CommunityPanel from '../../components/CommunityPanel';
import { copyText } from '../../../lib/clipboard';
import { creatorInitials } from '../../../lib/profile-policy';
import type { PublicCreator } from '../../../lib/profiles';

type Work = {
  id: string; title: string; summary: string; category: string; tool: string; model: string;
  prompt: string; negativePrompt: string; videoUrl: string; posterUrl: string | null;
  durationSeconds: number | null; copies: number; createdAt: string;
  creator: PublicCreator | null; workType: string; remixOf: string | null; processNotes: string; aspectRatio: string; seed: string;
  remixes: Array<{ id: string; title: string; posterUrl: string | null; creator: PublicCreator | null }>;
};

export default function WorkDetail({ id }: { id: string }) {
  const [work, setWork] = useState<Work | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/works/${encodeURIComponent(id)}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { if (live) setWork(data.work); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [id]);

  async function copyPrompt() {
    if (!work) return;
    const prompt = [work.prompt, work.negativePrompt && `\nNEGATIVE PROMPT\n${work.negativePrompt}`].filter(Boolean).join('\n');
    if (await copyText(prompt)) {
      setCopied(true);
      fetch(`/api/works/${work.id}/copy`, { method: 'POST' }).catch(() => undefined);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  if (failed) return <main className="work-detail-state"><p>404 / LOST TRANSMISSION</p><h1>PROJECT<br />NOT FOUND.</h1><Link href="/">RETURN TO WORK ↗</Link></main>;
  if (!work) return <main className="work-detail-state"><p>BOTTOPIA / RECEIVING PROJECT</p><h1>LOADING<br />WORLD...</h1></main>;

  const year = new Date(work.createdAt).getFullYear();
  return <main className="work-detail-shell">

    <section className="case-hero">
      <div className="case-index"><span>{work.workType} / {year}</span><b>{work.category}</b></div>
      <h1>{work.title}</h1>
      <p>{work.summary}</p>
      {work.creator && <Link className="case-creator-chip" href={`/creators/${work.creator.handle}`}><span>{creatorInitials(work.creator.displayName)}</span><b>{work.creator.displayName}<small>@{work.creator.handle} · OPEN PROFILE ↗</small></b></Link>}
    </section>
    <section className="case-film">
      <video src={work.videoUrl} poster={work.posterUrl ?? undefined} controls playsInline preload="metadata" />
    </section>
    <section className="case-notes">
      <aside>
        <p>PROJECT DATA</p>
        <dl>
          <div><dt>CREATOR</dt><dd>{work.creator?.displayName || 'BOT.TOPIA'}</dd></div>
          <div><dt>TYPE</dt><dd>{work.category}</dd></div>
          <div><dt>TOOL</dt><dd>{work.tool || '—'}</dd></div>
          <div><dt>MODEL</dt><dd>{work.model || '—'}</dd></div>
          <div><dt>DURATION</dt><dd>{work.durationSeconds ? `${work.durationSeconds} SEC` : '—'}</dd></div>
          <div><dt>RATIO</dt><dd>{work.aspectRatio || '—'}</dd></div>
          <div><dt>SEED</dt><dd>{work.seed || '—'}</dd></div>
          <div><dt>YEAR</dt><dd>{year}</dd></div>
        </dl>
      </aside>
      <article>
        <div className="case-prompt-heading"><div><span>OPEN PROCESS</span><h2>FULL PROMPT</h2></div><button onClick={copyPrompt}>{copied ? 'COPIED ✓' : 'COPY PROMPT ↗'}</button></div>
        <pre>{work.prompt}</pre>
        {work.negativePrompt && <div className="case-negative"><span>NEGATIVE PROMPT</span><pre>{work.negativePrompt}</pre></div>}
        {work.processNotes && <div className="case-process-notes"><span>PROCESS NOTES</span><p>{work.processNotes}</p></div>}
        {work.remixOf && <div className="case-remix-source"><span>REMIX SOURCE</span><Link href={`/works/${work.remixOf}`}>VIEW ORIGINAL WORK ↗</Link></div>}
        <div className="case-remix-action"><div><span>MAKE YOUR VERSION</span><p>프롬프트를 복사해 새로운 결과를 만들고, 이후 원작과 연결해 공개할 수 있습니다.</p></div><button onClick={copyPrompt}>{copied ? 'PROMPT COPIED ✓' : 'COPY TO REMIX ↗'}</button></div>
        {work.creator && <section className="case-creator-profile"><div className="creator-avatar" aria-hidden="true">{creatorInitials(work.creator.displayName)}</div><div><span>CREATOR PROFILE</span><h2>{work.creator.displayName}</h2><p>{work.creator.bio || `@${work.creator.handle}`}</p><div className="case-creator-links"><Link href={`/creators/${work.creator.handle}`}>ALL WORKS ↗</Link>{work.creator.instagramUrl && <a href={work.creator.instagramUrl} target="_blank" rel="noopener noreferrer">INSTAGRAM ↗</a>}{work.creator.xUrl && <a href={work.creator.xUrl} target="_blank" rel="noopener noreferrer">X ↗</a>}{work.creator.youtubeUrl && <a href={work.creator.youtubeUrl} target="_blank" rel="noopener noreferrer">YOUTUBE ↗</a>}{work.creator.websiteUrl && <a href={work.creator.websiteUrl} target="_blank" rel="noopener noreferrer">WEBSITE ↗</a>}</div></div></section>}
        {work.remixes.length > 0 && <section className="case-remix-grid"><header><span>REMIX LINEAGE</span><b>{work.remixes.length} VERSIONS</b></header><div>{work.remixes.map((remix) => <Link href={`/works/${remix.id}`} key={remix.id}>{remix.posterUrl ? <span className="case-remix-poster"><Image src={remix.posterUrl} alt="" fill sizes="(max-width: 700px) 100vw, 33vw" unoptimized /></span> : <span className="media-placeholder" />}<b>{remix.title}<small>{remix.creator ? `@${remix.creator.handle}` : 'BOTTOPIA CREATOR'}</small></b></Link>)}</div></section>}
        <CommunityPanel workId={work.id} locale="ko" isDemo={false} />
      </article>
    </section>
    <footer className="case-footer"><Link href="/">← ALL WORK</Link><Link href="/about#contact">START A PROJECT ↗</Link></footer>
  </main>;
}
