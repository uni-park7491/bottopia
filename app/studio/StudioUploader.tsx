'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';
import { uploadError } from '../../lib/upload-policy';
import FileDropInput from '../components/FileDropInput';

type StudioWork = { id: string; title: string; category: string; filename: string; fileSize: number; published: boolean; createdAt: string };
type UploadTicket = { workId: string; path: string; token: string; error?: string };

export default function StudioUploader({ isOwner = false, initialRemix = '' }: { isOwner?: boolean; initialRemix?: string }) {
  const inFlight = useRef(false);
  const [works, setWorks] = useState<StudioWork[]>([]);
  const [sources, setSources] = useState<StudioWork[]>([]);
  const scope = isOwner ? 'all' : 'mine';
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [remixSource, setRemixSource] = useState(initialRemix);
  const [changing, setChanging] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch(`/api/works?scope=${scope}`);
    if (response.ok) setWorks((await response.json()).works ?? []);
  }
  useEffect(() => {
    let active = true;
    fetch(`/api/works?scope=${scope}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { if (active) setWorks(data.works ?? []); })
      .catch(() => { if (active) setMessage('내 작품 목록을 불러오지 못했습니다. 새로고침해주세요.'); });
    fetch('/api/works').then(response => response.ok ? response.json() : Promise.reject())
      .then(data => { if (active) setSources(data.works ?? []); })
      .catch(() => { if (active) setMessage('원작 목록을 불러오지 못했습니다. 새로고침해주세요.'); });
    return () => { active = false; };
  }, [scope]);

  async function ticket(file: File, kind: 'video' | 'poster', workId?: string): Promise<UploadTicket> {
    const response = await fetch('/api/studio/upload-url', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: file.name, type: file.type, size: file.size, kind, workId }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '업로드 URL을 만들 수 없습니다.');
    return result;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus('uploading'); setMessage('영상 전송을 준비하고 있습니다…');
    const form = event.currentTarget;
    const data = new FormData(form);
    const video = data.get('video');
    const poster = data.get('poster');
    try {
      if (!(video instanceof File) || !video.size) throw new Error('영상 파일을 선택해주세요.');
      const videoError = uploadError('video', video.type, video.size);
      if (videoError) throw new Error(videoError);
      if (poster instanceof File && poster.size) {
        const posterError = uploadError('poster', poster.type, poster.size);
        if (posterError) throw new Error(posterError);
      }
      const supabase = createBrowserSupabaseClient();
      const videoTicket = await ticket(video, 'video');
      setMessage('영상을 안전하게 업로드하고 있습니다…');
      const videoUpload = await supabase.storage.from('works').uploadToSignedUrl(videoTicket.path, videoTicket.token, video, { contentType: video.type });
      if (videoUpload.error) throw videoUpload.error;

      let posterKey: string | null = null;
      if (poster instanceof File && poster.size) {
        const posterTicket = await ticket(poster, 'poster', videoTicket.workId);
        const posterUpload = await supabase.storage.from('works').uploadToSignedUrl(posterTicket.path, posterTicket.token, poster, { contentType: poster.type });
        if (posterUpload.error) throw posterUpload.error;
        posterKey = posterTicket.path;
      }
      setMessage('아카이브 정보를 등록하고 있습니다…');
      const response = await fetch('/api/works', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: data.get('title'), category: data.get('category'), tool: data.get('tool'), model: data.get('model'),
          summary: data.get('summary'), prompt: data.get('prompt'), negativePrompt: data.get('negativePrompt'),
          workType: data.get('workType'), remixOf: data.get('remixOf'), processNotes: data.get('processNotes'),
          aspectRatio: data.get('aspectRatio'), seed: data.get('seed'),
          durationSeconds: data.get('durationSeconds'), published: data.get('published') === 'true',
          videoKey: videoTicket.path, posterKey, originalFilename: video.name, contentType: video.type, fileSize: video.size,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '작품 등록에 실패했습니다.');
      form.reset(); setRemixSource(''); setStatus('done');
      setMessage(data.get('published') === 'true' ? '작품과 프롬프트가 공개되었습니다.' : '비공개 초안으로 저장되었습니다.');
      await refresh().catch(() => setMessage('작품은 저장되었습니다. 목록을 새로고침해주세요.'));
    } catch (error) {
      setStatus('error'); setMessage(error instanceof Error ? error.message : '업로드에 실패했습니다.');
    } finally { inFlight.current = false; }
  }

  async function remove(work: StudioWork) {
    if (inFlight.current) return;
    if (!window.confirm(`“${work.title}” 영상과 데이터를 삭제할까요?`)) return;
    try {
      const response = await fetch(`/api/works/${work.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json()).error || '삭제하지 못했습니다.');
      await refresh();
    } catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : '삭제하지 못했습니다.'); }
  }

  async function changeVisibility(work: StudioWork) {
    if (inFlight.current) return;
    if (!window.confirm(work.published
      ? `“${work.title}”을 비공개로 전환할까요? 이미 복사·다운로드된 자료는 회수되지 않습니다.`
      : `“${work.title}”의 영상과 전체 프롬프트를 누구나 볼 수 있도록 공개할까요? 공유 권한을 확인해주세요.`)) return;
    inFlight.current = true;
    setChanging(work.id);
    try {
      const response = await fetch(`/api/works/${work.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ published: !work.published }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '공개 설정을 변경하지 못했습니다.');
      setWorks(previous => previous.map(item => item.id === work.id ? { ...item, published: result.published } : item));
      setStatus('done'); setMessage(result.published ? '작품과 프롬프트를 공개했습니다.' : '비공개로 전환했습니다. 기존 미디어 링크와 캐시는 즉시 회수되지 않을 수 있습니다.');
    } catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : '공개 설정을 변경하지 못했습니다.'); }
    finally { inFlight.current = false; setChanging(null); }
  }

  return (
    <div className="studio-grid">
      <form className="upload-form" onSubmit={submit}>
        <div className="studio-profile-callout"><div><span>내 크리에이터 프로필</span><p>작품에 표시될 이름과 소셜 링크를 먼저 설정할 수 있습니다.</p></div><Link href="/profile">프로필 수정</Link></div>
        {!isOwner && <p className="field-help">초기 운영 보호 기준: 영상 최대 50MB, 새 영상 업로드 준비 요청은 시간당 3회까지 가능합니다. 실패한 전송도 횟수에 포함될 수 있습니다.</p>}
        <FileDropInput label="작품 영상" required name="video" accept="video/mp4,video/webm,video/quicktime" disabled={status === 'uploading'} validate={file => uploadError('video', file.type, file.size)} hint="MP4 · WEBM · MOV / 최대 50MB" />
        <div className="form-grid">
          <label>TITLE<input required name="title" placeholder="작품 제목" maxLength={100} /></label>
          <label>CATEGORY<select name="category" defaultValue="STORY"><option>STORY</option><option>CHARACTER</option><option>KNOWLEDGE</option><option>EXPERIMENT</option><option>BRAND FILM</option></select></label>
          <label>작품 유형<select name="workType" defaultValue={remixSource ? 'REMIX' : isOwner ? 'ORIGINAL' : 'COMMUNITY'} key={remixSource}>{isOwner && <option value="ORIGINAL">BOTTOPIA 공식 작품</option>}<option value="COMMUNITY">크리에이터 작품</option><option value="REMIX">원작을 재해석한 작품</option></select></label>
          <label>연결할 원작<select name="remixOf" value={remixSource} onChange={(event) => setRemixSource(event.target.value)}><option value="">원작 연결 없음</option>{sources.map((work) => <option key={work.id} value={work.id}>{work.title}</option>)}</select></label>
          <label>AI TOOL<input name="tool" placeholder="예: Hailuo AI" maxLength={80} /></label>
          <label>MODEL / VERSION<input name="model" placeholder="예: MiniMax H3" maxLength={80} /></label>
          <label>ASPECT RATIO<input name="aspectRatio" placeholder="예: 16:9" maxLength={30} /></label>
          <label>SEED · OPTIONAL<input name="seed" placeholder="예: 492817" maxLength={120} /></label>
          <label className="wide">SHORT DESCRIPTION<textarea required name="summary" rows={3} placeholder="이 영상에서 무엇을 볼 수 있나요?" maxLength={500} /></label>
          <label className="wide">PROMPT · REQUIRED<textarea required name="prompt" rows={8} placeholder="사람들이 영상을 보고 따라 만들 수 있도록 사용한 전체 프롬프트를 입력하세요." maxLength={16000} /><small className="field-help">피드에 미리 보기가 표시되며, 방문자는 버튼 한 번으로 전체 프롬프트를 복사할 수 있습니다.</small></label>
          <label className="wide">NEGATIVE PROMPT · OPTIONAL<textarea name="negativePrompt" rows={4} placeholder="네거티브 프롬프트가 있다면 입력하세요." maxLength={8000} /></label>
          <label className="wide">PROCESS NOTES · OPTIONAL<textarea name="processNotes" rows={6} placeholder="아이디어, 레퍼런스, 제작 순서, 모델별 수정 사항처럼 다른 창작자가 재현하는 데 필요한 과정을 적어주세요." maxLength={6000} /></label>
          <label>VIDEO LENGTH · SEC<input name="durationSeconds" inputMode="numeric" placeholder="15" /></label>
          <FileDropInput label="커버 이미지 · 선택" name="poster" accept="image/jpeg,image/png,image/webp,image/avif" disabled={status === 'uploading'} validate={file => uploadError('poster', file.type, file.size)} hint="JPG · PNG · WebP · AVIF / 최대 10MB" />
          <label className="publish-check"><input type="checkbox" name="published" value="true" /> 영상과 프롬프트를 함께 공개하기 · 선택하지 않으면 비공개 저장</label>
          <p className="field-help wide">직접 만들었거나 공유 권한이 있는 자료만 올려주세요. 원작 연결은 이용 허락을 대신하지 않습니다. 비공개 초안은 본인과 운영자만 볼 수 있습니다.</p>
        </div>
        <button className="upload-submit" type="submit" disabled={status === 'uploading'}>{status === 'uploading' ? '작품을 올리고 있습니다…' : '작품 저장하기'}</button>
        {message && <p className={`upload-message ${status}`} role="status">{message}</p>}
      </form>
      <aside className="studio-library"><div className="studio-library-head"><p>{isOwner ? '운영자 작품 관리' : '내 작품 관리'}</p><span>{works.length}개</span></div>
        {works.length === 0 ? <p className="studio-empty">아직 업로드된 영상이 없습니다.</p> : works.map((work) => (
          <article key={work.id}><div><b>{work.title}</b><span>{work.category} · {(work.fileSize / 1024 / 1024).toFixed(1)}MB</span></div><i className={work.published ? 'published' : ''}>{work.published ? '공개' : '비공개'}</i><button disabled={changing !== null || status === 'uploading'} onClick={() => changeVisibility(work)}>{changing === work.id ? '변경 중…' : work.published ? '비공개 전환' : '공개하기'}</button><button disabled={changing !== null || status === 'uploading'} onClick={() => remove(work)}>DELETE</button></article>
        ))}
      </aside>
    </div>
  );
}
