'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { normalizeImage } from './character-canvas';
import { downloadFile } from './download';

export default function CharacterSheet() {
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [available, setAvailable] = useState(false);
  const [engineMessage, setEngineMessage] = useState('엔진 준비 상태를 확인합니다.');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<{ url: string; blob: Blob }>();
  const alive = useRef(true), locked = useRef(false), objectUrl = useRef('');
  useEffect(() => {
    alive.current = true;
    const check = () => fetch('/api/tools/character').then(r => r.json()).then(data => {
      if (!alive.current) return;
      setAvailable(Boolean(data.available));
      setEngineMessage(data.available ? '이미지 모델 준비 완료' : data.error || data.message || '로컬 엔진을 준비 중입니다.');
    }).catch(() => { if (alive.current) setEngineMessage('엔진 연결을 확인하지 못했습니다. 자동으로 다시 확인합니다.'); });
    void check();
    const timer = setInterval(() => { void check(); }, 5000);
    return () => { clearInterval(timer); alive.current = false; if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); };
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (busy || result) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [busy, result]);
  async function upload(file?: File) {
    if (!file || locked.current) return;
    locked.current = true; setBusy(true);
    try { const image = await normalizeImage(file); if (alive.current) { setReference(image); setStatus('참고 사진을 준비했습니다. 생성 버튼을 누르면 로컬 엔진으로 전달합니다.'); } }
    catch (error) { if (alive.current) setStatus(error instanceof Error ? error.message : '사진을 읽지 못했습니다.'); }
    finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  async function generate() {
    if (locked.current || !available || (!reference && !description.trim())) return;
    locked.current = true; setBusy(true); setStatus('한 장의 캐릭터 시트를 생성합니다. 창을 유지해주세요.');
    try {
      const response = await fetch('/api/tools/character', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description, image: reference || undefined }) });
      const data = await response.json();
      if (!response.ok || !data.id) throw new Error(data.error || '생성을 시작하지 못했습니다.');
      const endpoint = `/api/tools/character?id=${encodeURIComponent(data.id)}`;
      const deadline = Date.now() + 16 * 60000;
      while (alive.current && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (!alive.current) return;
        const check = await fetch(endpoint), job = await check.json();
        if (!check.ok || job.state === 'error') throw new Error(job.error || '이미지 생성에 실패했습니다. 로컬 엔진과 메모리 상태를 확인해주세요.');
        if (job.state !== 'done') continue;
        const image = await fetch(`${endpoint}&image=1`);
        if (!image.ok || !image.headers.get('content-type')?.startsWith('image/png')) throw new Error('결과 이미지를 읽지 못했습니다.');
        const blob = await image.blob();
        if (!alive.current) return;
        if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
        objectUrl.current = URL.createObjectURL(blob);
        setResult({ url: objectUrl.current, blob });
        setStatus('이미지가 생성되었습니다. 인물 일관성과 디테일을 확인한 뒤 PNG로 저장하세요.');
        return;
      }
      if (alive.current) throw new Error('대기 시간이 초과되었습니다.');
    } catch (error) { if (alive.current) setStatus(error instanceof Error ? error.message : '생성에 실패했습니다.'); }
    finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  return <section className="character-generator">
    <h2>캐릭터 시트 생성 <small>로컬 검증판</small></h2>
    <p>참고 사진이나 짧은 설명으로 전신·여러 각도·표정·얼굴과 소품의 확대 디테일을 칸 구분 없는 한 장의 이미지로 생성합니다.</p>
    <div onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void upload(event.dataTransfer.files[0]); }}>
      <label className="tool-field">참고 인물 사진 (선택)<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} /></label>
      <p>사진 한 장을 끌어놓거나 선택하세요. 사진이 없으면 아래 설명을 바탕으로 생성합니다.</p>
      {reference && <><Image src={reference} alt="생성에 사용할 참고 인물" width={240} height={240} unoptimized style={{ objectFit: 'contain', maxWidth: '100%', height: 'auto' }} /><button disabled={busy} onClick={() => setReference('')}>사진 제거</button></>}
    </div>
    <label className="tool-field">캐릭터 설명<textarea value={description} maxLength={1500} rows={4} disabled={busy} placeholder="예: 보라색 스카프를 두른 작은 은색 정원사 로봇. 초록색 눈과 낡은 물뿌리개." onChange={event => setDescription(event.target.value)} /></label>
    <p aria-live="polite">{engineMessage}</p>
    <button className="tool-primary" disabled={busy || !available || (!reference && !description.trim())} onClick={() => void generate()}>{busy ? '처리 중…' : !available ? '모델 준비 중 — 생성 대기' : '캐릭터 시트 생성'}</button>
    <p role="status" aria-live="polite">{status}</p>
    {result && <div><Image src={result.url} alt="생성된 한 장의 캐릭터 시트" width={1024} height={768} unoptimized style={{ width: '100%', height: 'auto' }} /><button onClick={() => downloadFile(result.blob, 'bottopia-character-sheet.png')}>PNG 다운로드</button></div>}
    <p><small>FLUX.2 klein 4B를 이 Mac에서 실행합니다. 유료 API를 사용하지 않습니다. 현재 로컬 개발 환경 전용이며, 공개 사이트용 연결은 아직 완료되지 않았습니다. 결과는 자동 게시되지 않고 서버 메모리에서 일시 보관됩니다.</small></p>
  </section>;
}
