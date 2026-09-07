'use client';

import { useEffect, useState } from 'react';

type Inquiry = {
  id: string; name: string; contact: string; projectType: string; timelineBudget: string;
  brief: string; locale: string; status: string; createdAt: string;
};

export default function InquiryInbox() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetch('/api/inquiries')
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { if (live) setItems(data.inquiries ?? []); })
      .catch(() => { if (live) setFailed(true); })
      .finally(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, []);

  return <section className="inquiry-inbox">
    <header><div><p>PROJECT INBOX</p><h2>NEW<br />WORLDS.</h2></div><span>{items.length} INQUIRIES</span></header>
    {!ready ? <p className="studio-empty">문의함을 불러오는 중입니다…</p> : failed ? <p className="studio-empty">Supabase에 최신 스키마를 적용하면 문의가 이곳에 표시됩니다.</p> : items.length === 0 ? <p className="studio-empty">아직 도착한 프로젝트 문의가 없습니다.</p> : <div className="inquiry-list">
      {items.map((item) => <article key={item.id}>
        <div className="inquiry-list-meta"><span>{item.status} · {item.projectType}</span><time dateTime={item.createdAt}>{new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(item.createdAt))}</time></div>
        <h3>{item.name}</h3>
        <a href={item.contact.includes('@') ? `mailto:${item.contact}` : undefined}>{item.contact}</a>
        {item.timelineBudget && <p className="inquiry-range">{item.timelineBudget}</p>}
        <p>{item.brief}</p>
      </article>)}
    </div>}
  </section>;
}
