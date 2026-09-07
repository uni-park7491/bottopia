'use client';

import { FormEvent, useCallback, useEffect, useId, useState } from 'react';
import type { Locale } from '../i18n';
import MemberLogin from './MemberLogin';

type Comment = { id: string; body: string; displayName: string; createdAt: string; mine: boolean; canDelete?: boolean };
type CommunityState = { configured: boolean; signedIn: boolean; likes: number; liked: boolean; comments: Comment[] };

const panelCopy = {
  ko: { title: '커뮤니티 노트', intro: '이 장면에서 발견한 것, 직접 만들어본 결과를 남겨주세요.', demo: '첫 라이브 작품이 올라오면 좋아요와 댓글이 열립니다.', like: '좋아요', unlike: '좋아요 취소', placeholder: '무엇을 만들어보고 싶나요?', submit: '노트 남기기 ↗', signIn: 'Google·네이버·카카오로 가입하면 좋아요와 댓글을 남길 수 있어요.', empty: '아직 노트가 없습니다. 첫 번째 흔적을 남겨보세요.', remove: '삭제', error: '잠시 연결이 불안정합니다. 다시 시도해주세요.' },
  en: { title: 'COMMUNITY NOTES', intro: 'Share what you noticed or what you made from this prompt.', demo: 'Likes and comments open when the first live work is published.', like: 'LIKE', unlike: 'UNLIKE', placeholder: 'What would you make from this?', submit: 'LEAVE A NOTE ↗', signIn: 'Join with Google, NAVER, or Kakao to like and leave a note.', empty: 'No notes yet. Leave the first trace.', remove: 'DELETE', error: 'The connection is unstable. Please try again.' },
  zh: { title: '社区笔记', intro: '分享你在这个画面中的发现，或使用提示词创作的成果。', demo: '首个正式作品发布后将开放点赞与评论。', like: '点赞', unlike: '取消点赞', placeholder: '你想用它创作什么？', submit: '留下笔记 ↗', signIn: '使用 Google、NAVER 或 Kakao 加入后即可点赞和评论。', empty: '还没有笔记，留下第一条痕迹吧。', remove: '删除', error: '连接暂时不稳定，请重试。' },
  ja: { title: 'コミュニティノート', intro: 'この映像で気づいたことや、プロンプトから作ったものを共有してください。', demo: '最初の公開作品が投稿されると、いいねとコメントが使えます。', like: 'いいね', unlike: 'いいねを解除', placeholder: 'ここから何を作りたいですか？', submit: 'ノートを残す ↗', signIn: 'Google・NAVER・Kakaoで参加すると、いいねとコメントができます。', empty: 'まだノートはありません。最初の足跡を残しましょう。', remove: '削除', error: '接続が不安定です。もう一度お試しください。' },
} as const;

const initialState: CommunityState = { configured: false, signedIn: false, likes: 0, liked: false, comments: [] };

export default function CommunityPanel({ workId, locale, isDemo }: { workId: string; locale: Locale; isDemo: boolean }) {
  const [state, setState] = useState<CommunityState>(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [loginRequested, setLoginRequested] = useState(false);
  const loginPanelId = useId();
  const t = panelCopy[locale];

  const load = useCallback(async () => {
    if (isDemo) return;
    try {
      const response = await fetch(`/api/works/${workId}/community`);
      if (!response.ok) throw new Error();
      setState(await response.json());
    } catch { setError(t.error); }
  }, [isDemo, t.error, workId]);

  useEffect(() => {
    if (isDemo) return;
    let active = true;
    fetch(`/api/works/${workId}/community`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { if (active) setState(data); })
      .catch(() => { if (active) setError(t.error); });
    return () => { active = false; };
  }, [isDemo, t.error, workId]);

  async function action(body: Record<string, unknown>) {
    // Browsing never opens authentication. Only a deliberate write action does.
    if (!state.signedIn) { setLoginRequested(true); return false; }
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/works/${workId}/community`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      });
      if (response.status === 401) { await load(); setLoginRequested(true); setError(t.signIn); return false; }
      if (!response.ok) throw new Error();
      await load();
      return true;
    } catch { setError(t.error); return false; }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    if (await action({ action: 'comment', body })) setDraft('');
  }

  async function remove(commentId: string) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/works/${workId}/community?commentId=${encodeURIComponent(commentId)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      await load();
    } catch { setError(t.error); } finally { setBusy(false); }
  }

  if (isDemo || !state.configured) return (
    <section className="community-panel is-preview">
      <div><span>OPEN BETA</span><h3>{t.title}</h3><p>{isDemo ? t.demo : t.signIn}</p></div>
      {error && <p className="community-error" role="alert">{error}</p>}
    </section>
  );

  return (
    <section className="community-panel">
      <div className="community-heading"><div><span>OPEN BETA</span><h3>{t.title}</h3><p>{t.intro}</p></div>
        <button className={state.liked ? 'liked' : ''} onClick={() => action({ action: 'toggle_like' })} disabled={busy} aria-label={state.liked ? t.unlike : t.like} aria-controls={!state.signedIn ? loginPanelId : undefined} aria-expanded={!state.signedIn ? loginRequested : undefined}>♥ <b>{state.likes}</b></button>
      </div>
      {!state.signedIn ? <div className="community-participation">
        <button className="community-write" type="button" onClick={() => setLoginRequested(true)} aria-expanded={loginRequested} aria-controls={loginPanelId}>{t.submit}</button>
        {loginRequested && <div className="community-signin" id={loginPanelId}>
          <p role="status">{t.signIn}</p><MemberLogin locale={locale} returnTo={`/?work=${encodeURIComponent(workId)}#work`} />
          <button type="button" className="community-browse" onClick={() => setLoginRequested(false)}>{({ ko: '로그인 없이 계속 둘러보기', en: 'Keep browsing without signing in', zh: '无需登录，继续浏览', ja: 'ログインせずに閲覧を続ける' })[locale]}</button>
        </div>}
      </div> : (
        <form className="community-form" onSubmit={submit}><label><span className="sr-only">{t.placeholder}</span><textarea name="body" value={draft} onChange={(event) => setDraft(event.target.value)} disabled={busy} required maxLength={300} rows={3} placeholder={t.placeholder} /></label><button disabled={busy}>{t.submit}</button></form>
      )}
      {error && <p className="community-error" role="status">{error}</p>}
      <div className="community-comments">
        {state.comments.length === 0 ? <p className="community-empty">{t.empty}</p> : state.comments.map((comment) => (
          <article key={comment.id}><div className="comment-avatar">{comment.displayName.slice(0, 1).toUpperCase()}</div><div><header><b>{comment.displayName}</b><time dateTime={comment.createdAt}>{new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : locale, { month: 'short', day: 'numeric' }).format(new Date(comment.createdAt))}</time></header><p>{comment.body}</p>{(comment.canDelete ?? comment.mine) && <button onClick={() => remove(comment.id)} disabled={busy}>{t.remove}</button>}</div></article>
        ))}
      </div>
    </section>
  );
}
