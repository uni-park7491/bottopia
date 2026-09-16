'use client';
import { useEffect, useState } from 'react';
import { archiveKey, parseArchive, type StoryProject, type StoryVersion } from '../../lib/story-project';
import { downloadFile } from './download';

export default function ProjectShelf({ memberId, project, busy, restore }: { memberId:string; project:StoryProject; busy:boolean; restore:(p:StoryProject)=>void }) {
  const [automatic,setAutomatic] = useState(false);
  const [versions,setVersions] = useState<StoryVersion[]>([]);
  const [status,setStatus] = useState('');
  const key = archiveKey(memberId);
  const encoded = JSON.stringify({ format:'bottopia-story-v1', current:project, versions });
  useEffect(() => {
    if (!automatic || busy) return;
    const timer = setTimeout(() => {
      try { parseArchive(encoded); localStorage.setItem(key,encoded); setStatus('이 기기에 저장됨 · 서버로 전송하지 않습니다.'); }
      catch { setStatus('기기 저장에 실패했습니다. 작업 파일을 내려받아주세요.'); }
    },600);
    return () => clearTimeout(timer);
  },[automatic,busy,encoded,key]);
  useEffect(() => {
    const changed = (event:StorageEvent) => { if (event.key === key || event.key === null) { setAutomatic(false); setStatus('다른 탭에서 저장 데이터가 변경됐습니다. 자동 저장을 멈췄습니다. 저장 작업을 확인해주세요.'); } };
    window.addEventListener('storage',changed); return () => window.removeEventListener('storage',changed);
  },[key]);
  function load(text:string) {
    const data = parseArchive(text);
    if (!window.confirm('현재 작업을 불러온 내용으로 바꿀까요? 필요한 내용은 먼저 작업 파일로 내려받아주세요.')) return;
    setAutomatic(false); restore(data.current); setVersions(data.versions); setStatus('작업을 복원했습니다. 시나리오를 검토한 뒤 다시 확정해주세요.');
  }
  return <section className="story-setup" aria-label="작업 저장과 버전">
    <strong>내 작업 · 저장과 버전</strong>
    <p>기기 저장은 이 브라우저에만 남으며 암호화된 금고가 아닙니다. 공용 기기에서는 켜지 마세요. 계정별로 구분하지만 같은 브라우저를 사용하는 사람은 기기 데이터에 접근할 수 있습니다. 다른 기기로 옮기려면 작업 파일을 사용하세요.</p>
    <fieldset disabled={busy}>
      <label><input type="checkbox" checked={automatic} onChange={e => {
        if (e.target.checked) {
          try { if (localStorage.getItem(key) && !window.confirm('기존 기기 저장을 현재 작업으로 덮어쓸까요? 이어 작업하려면 먼저 ‘저장 작업 불러오기’를 누르세요.')) return; }
          catch { setStatus('기기 저장을 사용할 수 없습니다. 작업 파일을 이용해주세요.'); return; }
        }
        setAutomatic(e.target.checked);
      }} /> 이 기기에 자동 저장</label>
      <div className="tools-actions">
        <button onClick={() => { try { const text = localStorage.getItem(key); if (!text) { setStatus('이 계정으로 저장한 작업이 없습니다.'); return; } load(text); } catch { setStatus('저장 데이터를 불러오지 못했습니다.'); } }}>저장 작업 불러오기</button>
        <button onClick={() => { try { parseArchive(encoded); downloadFile(new Blob([encoded],{type:'application/json'}),'bottopia-story-project.json'); setStatus('다운로드를 요청했습니다. 저장된 파일을 확인해주세요.'); } catch { setStatus('입력값을 확인한 뒤 다시 저장해주세요.'); } }}>작업 파일 내려받기</button>
        <label className="tool-file-button">작업 파일 열기<input type="file" accept=".json,application/json" onChange={async e => { const file=e.target.files?.[0]; e.target.value=''; if (!file) return; try { if(file.size>500000) throw new Error(); load(await file.text()); } catch { setStatus('올바른 500KB 이하 봇토피아 작업 파일을 선택해주세요.'); } }} /></label>
        <button disabled={!project.story.trim()} onClick={() => { setVersions(v => [{savedAt:new Date().toISOString(),project:structuredClone(project)},...v].slice(0,8)); setStatus('현재 버전을 보관했습니다. 기기 저장을 켜거나 작업 파일을 내려받아 영구 보관하세요.'); }}>현재 버전 보관</button>
      </div>
      {versions.length > 0 && <ol>{versions.map((v,i) => <li key={`${v.savedAt}-${i}`}><button onClick={() => { if(window.confirm('이 버전으로 되돌릴까요? 현재 버전이 필요하면 먼저 보관해주세요.')) restore(structuredClone(v.project)); }}>{new Date(v.savedAt).toLocaleString('ko-KR')} · {(v.project.topic || '제목 없는 작업').slice(0,40)} · 복원</button></li>)}</ol>}
      <p>버전은 최근 8개까지 보관합니다. 자동 저장은 생성이 끝난 뒤 반영됩니다.</p>
    </fieldset>
    <p role="status">{status}</p>
  </section>;
}
