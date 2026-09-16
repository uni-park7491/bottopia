'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { downloadFile } from './download';
import { drawSheet, emptySheet, normalizeImage, parseSheet, sheetLabels, type CharacterSheet as Sheet } from './character-canvas';
import { copyText } from '../../lib/clipboard';

export default function LegacyCharacterSheet() {
  const [sheet, setSheet] = useState<Sheet>(emptySheet);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const importing = useRef(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    // Render into an isolated canvas so a slow earlier render cannot overwrite a newer one.
    const buffer = document.createElement('canvas');
    void drawSheet(buffer, sheet).then(() => {
      if (!active || !canvas.current) return;
      canvas.current.width = buffer.width; canvas.current.height = buffer.height;
      canvas.current.getContext('2d')?.drawImage(buffer, 0, 0); setReady(true);
    }).catch(error => { if (active) { setReady(false); setMessage(error instanceof Error ? error.message : '시트를 표시하지 못했습니다.'); } });
    return () => { active = false; };
  }, [sheet]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function update(patch: Partial<Sheet>) { setReady(false); setDirty(true); setSheet(current => ({ ...current, ...patch })); }
  async function upload(index: number, files: FileList | null) {
    if (!files?.length || importing.current) return;
    if (files.length !== 1) { setMessage('한 칸에 이미지 한 장만 선택해주세요.'); return; }
    importing.current = true; setBusy(true);
    try { const src = await normalizeImage(files[0]); setReady(false); setDirty(true); setSheet(current => ({ ...current, images: current.images.map((old, i) => i === index ? src : old) })); setMessage('이미지를 배치했습니다. 서버에는 전송하지 않았습니다.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : '이미지를 확인해주세요.'); }
    finally { importing.current = false; setBusy(false); }
  }
  async function restore(file?: File) {
    if (!file || importing.current) return;
    importing.current = true; setBusy(true);
    try {
      if (file.size > 24000000) throw new Error('작업 파일은 24MB 이하여야 합니다.');
      const parsed = parseSheet(JSON.parse(await file.text()));
      await drawSheet(document.createElement('canvas'), parsed);
      if (dirty && !window.confirm('현재 캐릭터 시트를 파일 내용으로 바꿀까요?')) return;
      setReady(false); setSheet(parsed); setDirty(false); setMessage('시트 작업을 불러왔습니다.');
    } catch (error) { setMessage(error instanceof Error ? error.message : '작업 파일을 확인해주세요.'); }
    finally { importing.current = false; setBusy(false); }
  }
  function png() {
    if (!ready || !canvas.current) return;
    canvas.current.toBlob(blob => {
      if (!blob) { setMessage('PNG 파일을 만들지 못했습니다.'); return; }
      downloadFile(blob, 'bottopia-character-sheet.png'); setMessage('PNG 다운로드를 요청했습니다. 저장된 파일을 확인해주세요.');
    }, 'image/png');
  }
  return <section className="tool-workspace" aria-label="캐릭터 시트">
    <header className="tool-section-head"><div><h2>캐릭터 시트 메이커</h2><p>직접 준비한 이미지와 설정을 한 장의 시트로 정리합니다. 새로운 포즈나 이미지를 AI로 생성하지 않습니다.</p></div></header>
    <div className="tools-actions"><button disabled={busy} onClick={() => { downloadFile(new Blob([JSON.stringify({ format: 'bottopia-character-v1', ...sheet })], { type: 'application/json' }), 'bottopia-character.json'); setMessage('이미지를 포함한 작업 파일 다운로드를 요청했습니다.'); }}>작업 파일 저장</button><label className="tool-file-button">작업 파일 열기<input disabled={busy} type="file" accept=".json,application/json" onChange={event => { void restore(event.target.files?.[0]); event.target.value = ''; }} /></label></div>
    <div className="tools-columns"><div className="character-fields">
      <label className="tool-field">캐릭터 이름<input value={sheet.name} maxLength={40} onChange={event => update({ name: event.target.value })} placeholder="캐릭터 이름을 정해주세요" /></label>
      <div className="character-slots">{sheetLabels.map((label, index) => <div className="character-slot" key={label} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void upload(index, event.dataTransfer.files); }}>
        <label className="character-image-input"><span>{label}</span>{sheet.images[index] ? <Image src={sheet.images[index]} alt={`${sheet.name || '캐릭터'} ${label}`} width={200} height={150} unoptimized /> : <span className="character-drop-hint">이미지 선택 또는 드래그</span>}<input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" aria-label={`${label} 이미지 선택`} onChange={event => { void upload(index, event.target.files); event.target.value = ''; }} /></label>
        {sheet.images[index] && <button disabled={busy} onClick={() => update({ images: sheet.images.map((src, i) => i === index ? '' : src) })}>{label} 이미지 제거</button>}
      </div>)}</div>
      <p className="tool-help">JPG · PNG · WebP / 장당 5MB, 최대 4장. 원본 비율을 유지하며 최대 1,000px로 줄입니다. 직접 제작했거나 사용 권한이 있는 이미지를 넣어주세요.</p>
      <label className="tool-field">외형 / 유지할 특징<textarea rows={4} maxLength={240} value={sheet.appearance} onChange={event => update({ appearance: event.target.value })} placeholder="머리, 눈, 의상, 체형 등 바뀌면 안 되는 특징" /></label>
      <label className="tool-field">성격 / 설정<textarea rows={3} maxLength={160} value={sheet.personality} onChange={event => update({ personality: event.target.value })} /></label>
      <div className="character-colors">{sheet.colors.map((color, index) => <label className="tool-field" key={index}>색상 {index + 1}<input type="color" value={color} onChange={event => update({ colors: sheet.colors.map((old, i) => i === index ? event.target.value : old) })} /></label>)}</div>
      <button onClick={async () => setMessage(await copyText([sheet.name, `외형: ${sheet.appearance}`, `성격: ${sheet.personality}`, `색상: ${sheet.colors.join(', ')}`].join('\n')) ? '캐릭터 설정을 복사했습니다.' : '복사하지 못했습니다. 입력한 텍스트를 직접 선택해 복사해주세요.')}>캐릭터 설정 복사</button>
    </div><aside className="tool-preview"><header><h3>시트 미리보기</h3><span>1600 × 1400 PNG</span></header><canvas className="character-canvas" ref={canvas} role="img" aria-label={`${sheet.name || '이름 없는 캐릭터'}의 정면·측면·후면·표정 시트. 아래 설정과 업로드한 이미지로 구성됩니다.`} /><div className="tools-actions"><button className="tool-primary" disabled={!ready || busy || !sheet.images.some(Boolean)} onClick={png}>PNG 시트 내려받기</button></div><p>이미지 한 장 이상을 넣으면 내려받을 수 있습니다. 비어 있는 칸은 ‘이미지 없음’으로 표시됩니다. 나중에 수정하려면 PNG와 별도로 작업 파일도 저장해주세요.</p></aside></div>
    <p className="tool-status" role="status">{message}</p>
  </section>;
}
