'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MemberLogin from '../../components/MemberLogin';
import { creatorInitials } from '../../../lib/profile-policy';
import type { ArchiveWork } from '../../components/CreatorArchive';
import type { PublicCreator } from '../../../lib/profiles';

type CreatorWork = ArchiveWork & { workType: string; remixOf: string | null };

const socialLinks = (profile: PublicCreator) => [
  ['INSTAGRAM', profile.instagramUrl], ['X', profile.xUrl], ['YOUTUBE', profile.youtubeUrl],
  ['TIKTOK', profile.tiktokUrl], ['WEBSITE', profile.websiteUrl],
] as const;

export default function CreatorProfile({ handle }: { handle: string }) {
  const [profile, setProfile] = useState<PublicCreator | null>(null);
  const [works, setWorks] = useState<CreatorWork[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(`/api/creators/${encodeURIComponent(handle)}`).then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { if (active) { setProfile(data.profile); setWorks(data.works ?? []); } })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [handle]);

  function play(target: HTMLElement) { const video = target.querySelector('video'); if (video) void video.play().catch(() => undefined); }
  function stop(target: HTMLElement) { const video = target.querySelector('video'); if (video) { video.pause(); video.currentTime = 0; } }

  if (failed) return <main className="work-detail-state"><p>404 / CREATOR SIGNAL LOST</p><h1>CREATOR<br />NOT FOUND.</h1><Link href="/creators">RETURN TO CREATORS ↗</Link></main>;
  if (!profile) return <main className="work-detail-state"><p>BOTTOPIA / RECEIVING PROFILE</p><h1>LOADING<br />CREATOR...</h1></main>;

  const links = socialLinks(profile).flatMap(([label, url]) => url ? [[label, url] as const] : []);
  return <main className="creator-profile-shell">
    <header className="creator-page-header"><Link className="brand" href="/">BOT<span>•</span>TOPIA</Link><nav><Link href="/">EXPLORE</Link><Link href="/creators">CREATORS</Link><MemberLogin compact /></nav></header>
    <section className="creator-profile-hero">
      <div className="creator-profile-avatar" aria-hidden="true">{creatorInitials(profile.displayName)}</div>
      <div className="creator-profile-title"><p>{profile.role.replaceAll('_', ' ')}{profile.availableForWork ? ' · OPEN FOR PROJECTS' : ''}</p><h1>{profile.displayName}</h1><span>@{profile.handle}</span></div>
      <div className="creator-profile-bio"><p>{profile.bio || '작품과 제작 과정을 공개하는 BOTTOPIA 크리에이터입니다.'}</p><dl><div><dt>BASE</dt><dd>{profile.location || '—'}</dd></div><div><dt>TOOLS</dt><dd>{profile.tools || '—'}</dd></div><div><dt>WORKS</dt><dd>{works.length}</dd></div></dl>{links.length > 0 && <nav className="creator-social-links" aria-label="Creator social links">{links.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noopener noreferrer">{label} ↗</a>)}</nav>}</div>
    </section>
    <section className="creator-work-index"><header><p>PUBLIC WORK ARCHIVE</p><span>{works.length} WORKS</span></header>{works.length === 0 ? <div className="creator-empty"><span>00 / WAITING FOR WORK</span><h2>아직 공개된 작품이 없습니다.</h2></div> : <div className="creator-work-grid">{works.map((work) => <article key={work.id}><Link className="creator-work-media" href={`/works/${work.id}`} onMouseEnter={(event) => play(event.currentTarget)} onMouseLeave={(event) => stop(event.currentTarget)} onFocus={(event) => play(event.currentTarget)} onBlur={(event) => stop(event.currentTarget)}>{work.videoUrl ? <video src={work.videoUrl} poster={work.posterUrl ?? undefined} muted loop playsInline preload="metadata" /> : <span className="media-placeholder" />}<i>{work.workType}</i><b>OPEN PROCESS ↗</b></Link><div><span>{work.category}</span><h2>{work.title}</h2><p>{work.summary}</p></div></article>)}</div>}</section>
  </main>;
}
