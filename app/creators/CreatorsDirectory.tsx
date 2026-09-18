'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CreatorAvatar from '../components/CreatorAvatar';
import CreatorBadge from '../components/CreatorBadge';
import type { PublicCreator } from '../../lib/profiles';

type Creator = PublicCreator & { workCount: number };

export default function CreatorsDirectory() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    fetch('/api/creators', { signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => {
      if (active) { setCreators(data.creators ?? []); setConfigured(Boolean(data.configured)); }
    }).catch(() => { if (active) setFailed(true); }).finally(() => { window.clearTimeout(timeout); if (active) setLoading(false); });
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [retry]);

  return <main className="creators-shell">

    <section className="creators-hero"><div><p className="eyebrow">BOTTOPIA / OPEN CREATOR NETWORK</p><h1>함께 만드는<br /><em>크리에이터들.</em></h1></div><div><p>작품뿐 아니라 그 작품을 만든 사람과 과정까지 발견하세요.</p><Link href="/profile">내 프로필 만들기 ↗</Link></div></section>
    <section className="creator-directory" aria-live="polite">
      <header><p>CREATOR DIRECTORY</p><span>{loading ? 'SYNCING…' : `${creators.length} CREATORS`}</span></header>
      {loading ? <div className="archive-loading" role="status"><p>크리에이터를 불러오는 중…</p><div className="creator-directory-grid" aria-hidden="true">{[0,1,2].map(i => <div className="archive-skeleton" key={i} />)}</div></div> : failed ? <div className="creator-loading" role="alert"><p>목록을 불러오지 못했습니다.</p><button onClick={() => { setFailed(false); setLoading(true); setRetry(value => value + 1); }}>다시 불러오기</button></div> : !configured ? <div className="creator-loading">크리에이터 공간을 준비 중입니다.</div> : creators.length === 0 ? <div className="creator-empty"><span>00 / FIRST SIGNAL</span><h2>아직 공개된 창작자 프로필이 없습니다.</h2><p>첫 번째 프로필이 완성되면 이곳에서 작품과 외부 채널을 함께 볼 수 있습니다.</p><Link href="/profile">내 프로필 만들기 ↗</Link></div> : <div className="creator-directory-grid">{creators.map((creator, index) => <article className="creator-directory-card" key={creator.handle}><div className="creator-card-index">{String(index + 1).padStart(2, '0')}</div><div className="creator-avatar-badged"><CreatorAvatar handle={creator.handle} name={creator.displayName} /><CreatorBadge role={creator.role} /></div><div className="creator-directory-copy"><h2>{creator.displayName}</h2><p>@{creator.handle}</p><p>{creator.bio || 'OPEN PROCESS CREATOR'}</p><dl><div><dt>WORKS</dt><dd>{creator.workCount}</dd></div><div><dt>BASE</dt><dd>{creator.location || '—'}</dd></div><div><dt>TOOLS</dt><dd>{creator.tools || '—'}</dd></div></dl><div className="creator-card-actions"><Link prefetch={false} href={`/creators/${creator.handle}`}>프로필 보기 ↗</Link>{creator.availableForWork && <span className="creator-availability">의뢰 가능</span>}</div></div></article>)}</div>}
    </section>
  </main>;
}
