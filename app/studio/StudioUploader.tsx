'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';

type StudioWork = { id: string; title: string; category: string; filename: string; fileSize: number; published: boolean; createdAt: string };
type UploadTicket = { workId: string; path: string; token: string; error?: string };

export default function StudioUploader() {
  const [works, setWorks] = useState<StudioWork[]>([]);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function refresh() {
    const response = await fetch('/api/works?scope=all');
    if (response.ok) setWorks((await response.json()).works ?? []);
  }
  useEffect(() => {
    let active = true;
    fetch('/api/works?scope=all')
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { if (active) setWorks(data.works ?? []); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

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
    setStatus('uploading'); setMessage('영상 전송을 준비하고 있습니다…');
    const form = event.currentTarget;
    const data = new FormData(form);
    const video = data.get('video');
    const poster = data.get('poster');
    try {
      if (!(video instanceof File) || !video.size) throw new Error('영상 파일을 선택해주세요.');
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
          durationSeconds: data.get('durationSeconds'), published: data.get('published') === 'true',
          videoKey: videoTicket.path, posterKey, originalFilename: video.name, contentType: video.type, fileSize: video.size,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '작품 등록에 실패했습니다.');
      form.reset(); setStatus('done'); setMessage('새로운 전송이 아카이브에 도착했습니다.'); await refresh();
    } catch (error) {
      setStatus('error'); setMessage(error instanceof Error ? error.message : '업로드에 실패했습니다.');
    }
  }

  async function remove(work: StudioWork) {
    if (!window.confirm(`“${work.title}” 영상과 데이터를 삭제할까요?`)) return;
    const response = await fetch(`/api/works/${work.id}`, { method: 'DELETE' });
    if (response.ok) await refresh();
  }

  return (
    <div className="studio-grid">
      <form className="upload-form" onSubmit={submit}>
        <div className="upload-drop"><span>01 / VIDEO FILE</span><input required type="file" name="video" accept="video/mp4,video/webm,video/quicktime" /><p>MP4 · WEBM · MOV / MAX 500MB</p></div>
        <div className="form-grid">
          <label>TITLE<input required name="title" placeholder="작품 제목" maxLength={100} /></label>
          <label>CATEGORY<select name="category" defaultValue="STORY"><option>STORY</option><option>CHARACTER</option><option>KNOWLEDGE</option><option>EXPERIMENT</option><option>BRAND FILM</option></select></label>
          <label>AI TOOL<input name="tool" placeholder="예: Hailuo AI" maxLength={80} /></label>
          <label>MODEL / VERSION<input name="model" placeholder="예: MiniMax H3" maxLength={80} /></label>
          <label className="wide">SHORT DESCRIPTION<textarea required name="summary" rows={3} placeholder="이 영상에서 무엇을 볼 수 있나요?" maxLength={500} /></label>
          <label className="wide">PROMPT<textarea required name="prompt" rows={8} placeholder="사람들이 따라 할 수 있도록 전체 프롬프트를 입력하세요." maxLength={16000} /></label>
          <label className="wide">NEGATIVE PROMPT · OPTIONAL<textarea name="negativePrompt" rows={4} placeholder="네거티브 프롬프트가 있다면 입력하세요." maxLength={8000} /></label>
          <label>VIDEO LENGTH · SEC<input name="durationSeconds" inputMode="numeric" placeholder="15" /></label>
          <label>COVER IMAGE · OPTIONAL<input type="file" name="poster" accept="image/jpeg,image/png,image/webp,image/avif" /></label>
          <label className="publish-check"><input type="checkbox" name="published" value="true" defaultChecked /> 바로 공개하기</label>
        </div>
        <button className="upload-submit" type="submit" disabled={status === 'uploading'}>{status === 'uploading' ? 'TRANSMITTING...' : 'PUBLISH TRANSMISSION ↗'}</button>
        {message && <p className={`upload-message ${status}`}>{message}</p>}
      </form>
      <aside className="studio-library"><div className="studio-library-head"><p>TRANSMISSION LIBRARY</p><span>{works.length} WORKS</span></div>
        {works.length === 0 ? <p className="studio-empty">아직 업로드된 영상이 없습니다.</p> : works.map((work) => (
          <article key={work.id}><div><b>{work.title}</b><span>{work.category} · {(work.fileSize / 1024 / 1024).toFixed(1)}MB</span></div><i className={work.published ? 'published' : ''}>{work.published ? 'LIVE' : 'DRAFT'}</i><button onClick={() => remove(work)}>DELETE</button></article>
        ))}
      </aside>
    </div>
  );
}
