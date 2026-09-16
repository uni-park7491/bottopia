'use client';
import { useEffect, useRef, useState } from 'react';
import { downloadFile } from './download';

export default function LocalNarration() {
  const [text, setText] = useState(''), [voice, setVoice] = useState('F1'), [speed, setSpeed] = useState(1);
  const [allowed, setAllowed] = useState(false), [busy, setBusy] = useState(false), [status, setStatus] = useState('');
  const [result, setResult] = useState<{ url: string; blob: Blob; seconds: number; text: string } | null>(null);
  const worker = useRef<Worker | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = useRef(false), currentUrl = useRef('');
  function dispose() { worker.current?.terminate(); worker.current = null; if (timer.current) clearTimeout(timer.current); timer.current = null; running.current = false; }
  useEffect(() => () => { worker.current?.terminate(); if (timer.current) clearTimeout(timer.current); if (currentUrl.current) URL.revokeObjectURL(currentUrl.current); }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (text.trim() || result || running.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [text, result]);
  function generate() {
    if (running.current || !allowed) return;
    if (!text.trim() || text.length > 500 || !/[\p{L}\p{N}]/u.test(text)) { setStatus('읽을 대사를 1~500자로 입력해주세요.'); return; }
    running.current = true; setBusy(true); setStatus('음성 엔진을 준비하고 있습니다.');
    const submitted = text;
    const fail = (message: string) => { dispose(); setBusy(false); setStatus(message); };
    try {
      worker.current = new Worker('/vendor/supertonic/worker.mjs', { type: 'module' });
      worker.current.onerror = () => fail('음성 엔진을 실행하지 못했습니다. 브라우저를 확인한 뒤 다시 시도해주세요.');
      worker.current.onmessage = ({ data }) => {
        if (data.type === 'progress') setStatus(data.message);
        else if (data.type === 'error') fail(data.message);
        else if (data.type === 'result') {
          if (!(data.wav instanceof ArrayBuffer) || data.wav.byteLength < 44 || !Number.isFinite(data.seconds) || data.seconds <= 0) { fail('음성 파일이 올바르지 않습니다.'); return; }
          const blob = new Blob([data.wav], { type: 'audio/wav' }), url = URL.createObjectURL(blob);
          if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
          currentUrl.current = url; setResult({ url, blob, seconds: data.seconds, text: submitted });
          dispose(); setBusy(false); setStatus('음성이 완성되었습니다. 재생하거나 WAV 파일을 내려받으세요.');
        }
      };
      timer.current = setTimeout(() => fail('5분 내 완료하지 못해 중단했습니다. 기존 결과는 유지됩니다. 대사를 줄이거나 네트워크를 확인해주세요.'), 300000);
      worker.current.postMessage({ text: submitted, voice, speed });
    } catch { fail('이 브라우저에서 음성 엔진을 시작하지 못했습니다.'); }
  }
  return <section className="tool-workspace local-narration" aria-label="음성 내레이션">
    <header className="tool-section-head"><div><p className="story-beta">VOICE WORKSPACE · BETA</p><h2>문장에 목소리를 더하세요.</h2><p>대사를 입력하고 음성을 만드세요. 여기서 듣고 WAV 파일로 저장할 수 있습니다.</p></div></header>
    <div className="tools-columns"><div>
      <label className="tool-field">읽을 대사 · {text.length}/500자<textarea rows={7} maxLength={500} disabled={busy} value={text} onChange={e => setText(e.target.value)} placeholder="안녕하세요. 봇토피아에서 새로운 이야기를 시작합니다." /></label>
      <div className="scene-fields"><label className="tool-field">목소리<select disabled={busy} value={voice} onChange={e => setVoice(e.target.value)}><option value="F1">여성 목소리 · F1</option><option value="M1">남성 목소리 · M1</option></select></label><label className="tool-field">속도 · {speed.toFixed(1)}배<input type="range" min="0.8" max="1.3" step="0.1" disabled={busy} value={speed} onChange={e => setSpeed(Number(e.target.value))} /></label></div>
      <label className="story-consent"><input type="checkbox" checked={allowed} disabled={busy} onChange={e => setAllowed(e.target.checked)} />음성 모델 다운로드 허용 · 최초 약 400MB. Wi-Fi 사용 권장.</label>
      <p className="tool-help">Hugging Face에서 모델을 받으며 IP 등 일반 접속 정보가 해당 서비스에 전달됩니다. 대사와 음성은 이 기기에서 처리하고 서버에 업로드하지 않습니다. 기기에 따라 수 분 걸릴 수 있습니다.</p>
      <div className="tools-actions"><button className="tool-primary" disabled={busy || !allowed || !text.trim()} onClick={generate}>{busy ? '음성 생성 중…' : '음성 만들기'}</button>{busy && <button onClick={() => { dispose(); setBusy(false); setStatus('중단했습니다. 기존 음성은 유지됩니다.'); }}>중단</button>}</div>
      <p role="status">{status}</p>
      <details><summary>모델 및 사용 조건</summary><p>Supertonic 3의 <a href="/vendor/supertonic/MODEL-LICENSE.txt" target="_blank" rel="noopener noreferrer">Open RAIL-M 라이선스 전문</a>과 부속서 A의 이용 제한이 적용됩니다. 불법 이용, 사칭, 괴롭힘, 타인에게 해를 끼치는 허위정보 생성 등 제한된 용도로 사용할 수 없습니다. 결과를 공개할 때 AI 생성 음성임을 명확히 표시해야 합니다. 타인의 대사·저작물 권리도 확인해주세요. 음성 복제 기능은 제공하지 않습니다.</p><a href="/vendor/supertonic/NOTICE.md" target="_blank" rel="noopener noreferrer">오픈소스 출처</a></details>
    </div><aside className="tool-preview"><span className="preview-label">AUDIO PREVIEW</span><h3>들어보고, 저장하세요.</h3>{result ? <>
      <p>{result.seconds.toFixed(1)}초 · WAV · AI 생성 음성</p>
      <audio key={result.url} controls preload="metadata" src={result.url} aria-label="생성된 내레이션 재생" style={{ width: '100%' }} onError={() => setStatus('음성 재생에 실패했습니다. 다시 생성해주세요.')} />
      <div className="tools-actions"><button onClick={() => { downloadFile(result.blob, 'bottopia-ai-narration.wav'); setStatus('WAV 다운로드를 요청했습니다. 저장된 파일을 확인해주세요.'); }}>음성 WAV 내려받기</button></div>
      <p className="story-review-text">{result.text}</p>
    </> : <div className="voice-empty"><div className="voice-wave" aria-hidden="true">{[18,32,48,26,56,38,22,42,18].map((height,i)=><i key={i} style={{height}} />)}</div><strong>첫 목소리를 기다리고 있어요</strong><p>대사를 입력하고 음성을 만들면<br/>여기서 바로 들어볼 수 있습니다.</p></div>}<p>자동 저장되지 않습니다. 페이지를 떠나기 전에 음성을 내려받으세요.</p></aside></div>
  </section>;
}
