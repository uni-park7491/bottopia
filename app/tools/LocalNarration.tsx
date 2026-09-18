'use client';
import { useEffect, useRef, useState } from 'react';
import { downloadFile } from './download';
import { languagesFor, speechLanguages } from '../../public/vendor/tts-languages.mjs';
import { filterTtsModels, ttsModels, ttsUses, type TtsEngine } from './tts-models';
import './tts-workspace.css';
import DesktopNarration, { type DesktopAudio } from './DesktopNarration';
import { readConnection, saveConnection } from './desktop-connection';
import { desktopReleaseReview, reviewLabel } from './tts-release';
import { estimateLabel, estimateTiming, recordTiming } from './tts-estimate';
import AudioHistory from './AudioHistory';

export default function LocalNarration({ memberId, engine: initialEngine = 'supertonic' }: { memberId:string; engine?: 'supertonic' | 'qwen' }) {
  const [engine, setEngine] = useState<TtsEngine>(initialEngine);
  const [modelId, setModelId] = useState<string>(initialEngine);
  const [languageFilter, setLanguageFilter] = useState('all'), [useFilter, setUseFilter] = useState('all');
  const [releaseFilter, setReleaseFilter] = useState('all');
  const selectedModel = ttsModels.find(model => model.id === modelId)!;
  const executionMode = selectedModel.engine ? 'browser' : 'desktop';
  const availableModels = filterTtsModels('', languageFilter, useFilter).filter(model => Boolean(model.engine) === (executionMode === 'browser')).filter(model => model.engine || releaseFilter === 'all' || desktopReleaseReview[model.id]?.status === releaseFilter);
  const lastModel = useRef({ browser: initialEngine as string, desktop: 'qwen-custom' });
  const [encoding, setEncoding] = useState(false);
  const [desktopToken, setDesktopToken] = useState('');
  useEffect(() => {
    const restore=setTimeout(()=>{
      try { setDesktopToken(readConnection(window.localStorage)); } catch { /* Storage may be blocked. */ }
    },0);
    return()=>clearTimeout(restore);
  }, []);
  function changeDesktopToken(value: string) {
    try { saveConnection(window.localStorage, ''); } catch { /* Keep manual connection available. */ }
    setDesktopToken(value);
  }
  const mp3Worker = useRef<Worker | null>(null);
  const mp3Timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isQwen = engine === 'qwen';
  const [language, setLanguage] = useState('ko');
  const [text, setText] = useState(''), [voice, setVoice] = useState('F1'), [speed, setSpeed] = useState(1);
  const [speedInput, setSpeedInput] = useState('1');
  const [allowed, setAllowed] = useState(false), [busy, setBusy] = useState(false), [status, setStatus] = useState('');
  const [result, setResult] = useState<{ url: string; blob: Blob; seconds: number; text: string; voice: string; engine: string; language: string } | null>(null);
  const worker = useRef<Worker | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = useRef(false), currentUrl = useRef('');
  const [browserProgress, setBrowserProgress] = useState<{phase:string;percent?:number;scope?:string}|null>(null);
  const [elapsed, setElapsed] = useState(0), [estimate, setEstimate] = useState<number|null>(null);
  const [generationOffset, setGenerationOffset] = useState<number|null>(null);
  const clock = useRef<ReturnType<typeof setInterval>|null>(null);
  const voices = engine === 'supertonic' ? ['F1','F2','F3','F4','F5','M1','M2','M3','M4','M5'] : ['F1','M1'];
  const minSpeed = engine === 'supertonic' ? .5 : .8, maxSpeed = engine === 'supertonic' ? 2 : 1.3;
  function receiveDesktopAudio(value: DesktopAudio) {
    if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    const url = URL.createObjectURL(value.blob); currentUrl.current = url;
    setResult({...value,url}); setStatus('PC에서 생성한 음성을 받았습니다. 아래에서 재생·저장하세요.');
  }
  function exportMp3() {
    if (!result || encoding) return;
    setEncoding(true);
    const done = (message: string) => { mp3Worker.current?.terminate(); mp3Worker.current = null; if (mp3Timer.current) clearTimeout(mp3Timer.current); setEncoding(false); setStatus(message); };
    try {
      const encoder = new Worker(new URL('./mp3.worker.ts', import.meta.url), { type: 'module' }); mp3Worker.current = encoder;
      encoder.onmessage = ({ data }) => { if (data.blob instanceof Blob && data.blob.size > 0) { downloadFile(data.blob, 'bottopia-ai-narration.mp3'); done('MP3 다운로드를 요청했습니다.'); } else done(data.error || 'MP3 변환에 실패했습니다.'); };
      encoder.onerror = () => done('MP3 변환에 실패했습니다. WAV는 계속 저장할 수 있습니다.');
      mp3Timer.current = setTimeout(() => done('MP3 변환 시간이 초과되었습니다. 다시 시도해주세요.'), 60000);
      result.blob.arrayBuffer().then(buffer => { if (mp3Worker.current === encoder) encoder.postMessage(buffer, [buffer]); }).catch(() => done('음성 파일을 읽지 못했습니다.'));
    } catch { done('이 브라우저에서 MP3 변환을 시작하지 못했습니다.'); }
  }
  function dispose() { worker.current?.terminate(); worker.current = null; if (timer.current) clearTimeout(timer.current); if (clock.current) clearInterval(clock.current); clock.current = null; timer.current = null; running.current = false; }
  function selectEngine(next: TtsEngine) {
    if (busy || next === engine) return;
    setEngine(next); setVoice('F1'); setSpeed(1); setSpeedInput('1'); setAllowed(false); setStatus('');
    if (!languagesFor(next).some(([code]) => code === language)) {
      const [code, name] = languagesFor(next)[0];
      setLanguage(code); setStatus(`선택한 모델이 이전 언어를 지원하지 않아 ${name}(으)로 변경했습니다.`);
    }
  }
  function selectModel(id: string) {
    if (busy) return;
    const model = ttsModels.find(item => item.id === id)!;
    lastModel.current[model.engine ? 'browser' : 'desktop'] = id;
    setModelId(id); setAllowed(false); setStatus(''); setBrowserProgress(null);
    if (model.engine) selectEngine(model.engine);
  }
  function commitSpeed() {
    const parsed = Number(speedInput.trim().replace(',', '.'));
    const next = speedInput.trim() && Number.isFinite(parsed)
      ? Math.round(Math.min(maxSpeed, Math.max(minSpeed, parsed)) * 100) / 100
      : speed;
    setSpeed(next); setSpeedInput(String(next));
  }
  function selectExecutionMode(mode: 'browser' | 'desktop') {
    if (busy || mode === executionMode) return;
    setLanguageFilter('all'); setUseFilter('all');
    selectModel(lastModel.current[mode]);
  }
  useEffect(() => () => { worker.current?.terminate(); mp3Worker.current?.terminate(); if (clock.current) clearInterval(clock.current); if (mp3Timer.current) clearTimeout(mp3Timer.current); if (timer.current) clearTimeout(timer.current); if (currentUrl.current) URL.revokeObjectURL(currentUrl.current); }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (text.trim() || result || running.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [text, result]);
  function generate() {
    if (running.current || !allowed || !selectedModel.engine) return;
    if (!text.trim() || text.length > 500 || !/[\p{L}\p{N}]/u.test(text)) { setStatus('읽을 대사를 1~500자로 입력해주세요.'); return; }
    running.current = true; setBusy(true); setStatus('음성 엔진을 준비하고 있습니다.');
    const submitted = text;
    const started = performance.now(), context = JSON.stringify(['browser', engine, language, voice, speed]), chars = Array.from(submitted.trim()).length;
    let generationStarted: number|null = null;
    setElapsed(0); setGenerationOffset(null); setEstimate(null); setBrowserProgress({phase:'downloading'});
    try { setEstimate(estimateTiming(window.localStorage, context, chars)); } catch { /* Optional local history. */ }
    clock.current = setInterval(()=>setElapsed(Math.floor((performance.now()-started)/1000)),1000);
    const fail = (message: string) => { dispose(); setBusy(false); setBrowserProgress(null); setStatus(message); };
    try {
      if (isQwen && !window.crossOriginIsolated) { fail('Qwen 실행 화면을 새로고침한 뒤 다시 시도해주세요.'); return; }
      worker.current = engine === 'kokoro'
        ? new Worker(new URL('./kokoro.worker.ts', import.meta.url), { type: 'module' })
        : new Worker(isQwen ? '/vendor/qwen-tts/worker.mjs' : '/vendor/supertonic/worker.mjs', { type: 'module' });
      const activeWorker = worker.current;
      worker.current.onerror = () => { if (worker.current === activeWorker) fail('음성 엔진을 실행하지 못했습니다. 브라우저를 확인한 뒤 다시 시도해주세요.'); };
      worker.current.onmessage = ({ data }) => {
        if (worker.current !== activeWorker) return;
        if (data.type === 'progress') {
          const phase = data.phase === 'generating' ? 'generating' : 'downloading';
          if (phase === 'generating' && generationStarted === null) {
            generationStarted = performance.now(); setGenerationOffset((generationStarted-started)/1000);
          }
          setBrowserProgress({phase, scope:['file','step'].includes(data.scope) ? data.scope : undefined, percent:typeof data.percent === 'number' && Number.isFinite(data.percent) ? Math.max(0,Math.min(phase === 'generating' ? 99 : 100,data.percent)) : undefined});
          setStatus(data.message);
        }
        else if (data.type === 'error') fail(data.message);
        else if (data.type === 'result') {
          if (!(data.wav instanceof ArrayBuffer) || data.wav.byteLength < 44 || !Number.isFinite(data.seconds) || data.seconds <= 0) { fail('음성 파일이 올바르지 않습니다.'); return; }
          const blob = new Blob([data.wav], { type: 'audio/wav' }), url = URL.createObjectURL(blob);
          if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
          currentUrl.current = url; setResult({ url, blob, seconds: data.seconds, text: submitted, voice, engine, language });
          if (generationStarted !== null) { try { recordTiming(window.localStorage, context, chars, (performance.now()-generationStarted)/1000); } catch { /* Optional local history. */ } }
          setElapsed(Math.floor((performance.now()-started)/1000)); setBrowserProgress({phase:'done',percent:100});
          dispose(); setBusy(false); setStatus('음성이 완성되었습니다. 아래에서 재생하거나 MP3·WAV로 저장하세요.');
        }
      };
      timer.current = setTimeout(() => fail('제한 시간 내 완료하지 못해 중단했습니다. 기존 결과는 유지됩니다. 대사를 줄이거나 네트워크를 확인해주세요.'), isQwen ? 1200000 : 300000);
      worker.current.postMessage({ text: submitted, voice, speed, language });
    } catch { fail('이 브라우저에서 음성 엔진을 시작하지 못했습니다.'); }
  }
  return <section className="tool-workspace local-narration" aria-label="TTS 텍스트 음성 변환">
    <header className="tool-section-head"><div><p className="story-beta">TEXT TO SPEECH</p><h2>문장에 목소리를 더하세요.</h2><p>모델과 목소리를 고르고, 생성한 음성을 MP3·WAV로 저장하세요.</p></div></header>
    <div className="tts-layout"><div className="tts-selector">
      <div className="tts-library">
        <div className="tts-library-heading"><h3>목적에 맞는 목소리 찾기</h3><span>17개 모델 계열</span></div>
        <div className="tts-execution-switch" role="group" aria-label="TTS 실행 방식">
          <button type="button" aria-pressed={executionMode === 'browser'} disabled={busy} onClick={() => selectExecutionMode('browser')}>브라우저 <span>{ttsModels.filter(model => model.engine).length}</span></button>
          <button type="button" aria-pressed={executionMode === 'desktop'} disabled={busy} onClick={() => selectExecutionMode('desktop')}>PC 설치 <span>{ttsModels.filter(model => !model.engine).length}</span></button>
        </div>
        <p className="tool-help">{executionMode === 'browser' ? '브라우저에서 모델을 내려받아 실행합니다. 모델별 기기 지원 조건을 확인하세요.' : '컴퓨터에 연결기와 모델을 설치해 실행합니다. 설치·실행 환경 확인이 필요합니다.'}</p>
        {executionMode === 'desktop' && <details><summary>모델 조건 필터 · 모든 항목 연결기 제공</summary><label className="tool-field">모델 조건<select value={releaseFilter} onChange={e=>setReleaseFilter(e.target.value)}><option value="all">전체 모델</option><option value="source-ready">소스 고지 준비됨</option><option value="reviewing">모델 조건 검토 중</option><option value="conditions">별도 조건 확인 필요</option></select></label></details>}
        <div className="scene-fields"><label className="tool-field">지원 언어<select value={languageFilter} onChange={e => setLanguageFilter(e.target.value)}><option value="all">모든 언어</option><option value="ko">한국어 지원</option><option value="other">외국어·언어별 모델</option></select></label><label className="tool-field">사용 목적<select value={useFilter} onChange={e => setUseFilter(e.target.value)}><option value="all">모든 기능</option>{ttsUses.map(use => <option key={use.id} value={use.id}>{use.label}</option>)}</select></label></div>
        <nav className="tts-model-list" aria-label="TTS 모델 선택">{availableModels.map(model => <button key={model.id} type="button" disabled={busy} aria-pressed={modelId === model.id} onClick={() => selectModel(model.id)}><span><strong>{model.name}</strong><small>{model.summary}</small>{!model.engine && <small className="tts-review-badge">{reviewLabel(model.id)}</small>}</span></button>)}</nav>
        {!availableModels.length && <p role="status">이 조건에 맞는 모델이 없습니다.</p>}
      </div>
      <details className="tts-selected" aria-label="선택한 모델 안내"><summary>{selectedModel.name} · 사용 안내</summary><dl><div><dt>언어</dt><dd>{selectedModel.languages}</dd></div><div><dt>사용법</dt><dd>{selectedModel.steps}</dd></div>{selectedModel.size && <div><dt>다운로드</dt><dd>{selectedModel.size} · 최초 실행 시</dd></div>}</dl><p className="tool-help">{selectedModel.note}</p><a href={selectedModel.source} target="_blank" rel="noopener noreferrer">공식 모델 문서 ↗</a></details>
      </div><div className="tts-composer">
      {!selectedModel.engine && <DesktopNarration key={modelId} modelId={modelId} token={desktopToken} onTokenChange={changeDesktopToken} onBusyChange={setBusy} onResult={receiveDesktopAudio} text={text} onTextChange={setText} />}
      <div hidden={!selectedModel.engine}>
      <fieldset className="tts-editor" disabled={busy || !selectedModel.engine}><legend>음성 만들기</legend>
      <p className="tool-help">{isQwen ? '실행 환경: 데스크톱 Chrome·Edge 권장. 모바일 실행은 지원하지 않습니다.' : '기기 메모리가 부족하면 생성이 중단될 수 있습니다.'} 모델을 바꿔도 대사와 기존 음성은 유지됩니다.</p>
      <label className="tool-field tts-language">읽을 언어<select disabled={busy} value={language} onChange={e => setLanguage(e.target.value)}>{languagesFor(engine).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
      <label className="tool-field">읽을 대사 · {text.length}/500자<textarea rows={4} maxLength={500} disabled={busy} value={text} onChange={e => setText(e.target.value)} placeholder="안녕하세요. 봇토피아에서 새로운 이야기를 시작합니다." /></label>
      {engine === 'supertonic' ? <div className="tts-expression-guide">
        <strong>표현 소리 넣기</strong>
        <p>대사 사이에 정해진 코드를 그대로 입력하세요.</p>
        <div className="tts-expression-examples"><span>입력 예시:</span><span><code>{'<laugh>'}</code> 웃음</span><span><code>{'<sigh>'}</code> 한숨</span><span><code>{'<breath>'}</code> 숨소리</span></div>
        <p>예: <span className="tts-expression-sample">{'안녕하세요. <laugh> 반가워요.'}</span></p>
        <p className="tool-help">{'코드를 <웃으며>처럼 번역하거나 임의로 만들면 지문까지 읽을 수 있습니다. 표현 결과는 목소리와 문장에 따라 달라집니다.'}</p>
        <details><summary>지원 범위 안내</summary><p>공식 문서는 표현 태그 10종 지원을 안내합니다. 현재 이 화면에는 공식 문서에 명시된 예시 3종만 안내합니다. 나머지 태그는 정확한 표기와 동작 확인 후 추가합니다.</p><a href="https://github.com/supertone-oss-archive/supertonic/blob/main/README.md" target="_blank" rel="noopener noreferrer">공식 문서 ↗</a></details>
      </div> : <p className="tool-help">{'읽을 대사만 입력하세요. (화내면서)·<angry> 같은 연기 지시는 지원하지 않으며, 지문까지 읽을 수 있습니다.'}</p>}
      <div className="tool-field">목소리<div className="voice-chips" role="group" aria-label="목소리 선택">{voices.map(id => <button key={id} type="button" aria-pressed={voice === id} onClick={() => setVoice(id)}>{id[0] === 'F' ? '여성' : '남성'} · {engine === 'kokoro' ? (id === 'F1' ? 'Heart' : 'Michael') : id}</button>)}</div></div>
      {!isQwen && <div className="tts-speed"><label htmlFor="tts-speed-slider">읽기 속도 <span>{minSpeed}–{maxSpeed}배</span></label><div><input id="tts-speed-slider" aria-label="읽기 속도 슬라이더" type="range" min={minSpeed} max={maxSpeed} step="0.01" value={speed} onChange={e => { setSpeed(Number(e.target.value)); setSpeedInput(e.target.value); }} /><label className="tts-speed-hit-area"><input className="tts-speed-value" aria-label="읽기 속도 배율" type="text" inputMode="decimal" autoComplete="off" spellCheck={false} maxLength={8} value={speedInput} onChange={e => setSpeedInput(e.target.value)} onBlur={commitSpeed} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} /></label></div><p className="tool-help">{engine === 'supertonic' ? '공식 예제 입력 범위 0.5–2.0배 · 권장 0.9–1.5배' : '이 작업실 제공 범위 0.8–1.3배'} · 직접 입력 후 Enter로 적용합니다.</p></div>}
      {engine !== 'supertonic' && <details className="tts-prompt-help"><summary>연기 지시를 넣어도 되나요?</summary><p>현재 브라우저 모델은 괄호 속 문장을 연기 명령으로 처리하지 않습니다. 한국어나 영어로 지시해도 지원되지 않으므로 읽을 대사만 입력하세요.</p></details>}
      {isQwen && <p className="tool-help">목소리는 AI 기준 샘플의 음색을 따르며 결과에 따라 차이가 있습니다. 감정·연기 지시문은 아직 지원하지 않으므로, 괄호 지문 없이 읽을 대사만 입력해주세요.</p>}
      {isQwen && <p className="tool-help">기준 음성은 Supertonic 3로 생성한 AI 샘플입니다. <a href="/vendor/supertonic/MODEL-LICENSE.txt" target="_blank" rel="noopener noreferrer">기준 음성의 이용 제한</a>을 확인해주세요. 타인 사칭·괴롭힘 등에 사용할 수 없으며 공개 시 AI 생성 음성임을 표시해야 합니다.</p>}
      <label className="story-consent"><input type="checkbox" checked={allowed} disabled={busy} onChange={e => setAllowed(e.target.checked)} />음성 모델 다운로드 허용 · 최초 {selectedModel.size}. Wi-Fi 사용 권장.</label>
      <details className="tts-download-info"><summary>다운로드·개인정보 안내</summary><p className="tool-help">Hugging Face에서 모델을 받으며 IP 등 일반 접속 정보가 해당 서비스에 전달됩니다. 대사와 음성은 이 기기에서 처리하고 서버에 업로드하지 않습니다. 실행 파일·캐시 공간이 추가로 필요하며 캐시 삭제 시 다시 다운로드합니다. 생성 중에는 탭을 닫지 마세요.</p></details>
      <div className="tools-actions tts-generation-action"><button className="tool-primary" disabled={busy || !allowed || !text.trim() || !selectedModel.engine} onClick={generate}>{busy ? '음성 생성 중…' : '음성 만들기'}</button>
      {browserProgress && <div className="tts-job-progress">
        <div className="tts-job-caption"><span>{browserProgress.phase === 'done' ? '완료' : browserProgress.phase === 'generating' ? '음성 생성' : '모델 준비·다운로드'}{browserProgress.scope === 'file' ? ' · 현재 파일' : browserProgress.scope === 'step' ? ' · 현재 합성 단계' : ''}</span><span>{browserProgress.percent !== undefined ? `${Math.floor(browserProgress.percent)}% · ` : ''}{elapsed}초 경과</span></div>
        <progress aria-label={browserProgress.scope === 'file' ? '현재 파일 다운로드 진행률' : '브라우저 음성 생성 진행률'} max={100} value={browserProgress.percent} />
        {browserProgress.phase !== 'done' && <small>{estimateLabel(estimate,generationOffset === null ? null : Math.max(0,elapsed-generationOffset),browserProgress.phase)}{browserProgress.phase === 'generating' && browserProgress.percent === undefined ? ' · 세부 진행률 계산 중' : ''}</small>}
      </div>}</div>
      </fieldset>
      {busy && <button className="tts-stop" onClick={() => { dispose(); setBusy(false); setBrowserProgress(null); setStatus('중단했습니다. 기존 음성은 유지됩니다.'); }}>생성 중단</button>}
      <p role="status">{status}</p>
      {engine === 'kokoro' && selectedModel.engine && <details><summary>모델 및 사용 조건</summary><p>Kokoro-82M·kokoro-js는 Apache-2.0 라이선스입니다. <a href="https://github.com/hexgrad/kokoro/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">공식 라이선스</a>. 공개 시 AI 생성 음성임을 안내하고, 타인의 저작물·사칭에 관한 권리를 확인해주세요.</p></details>}
      <div hidden={!selectedModel.engine || engine === 'kokoro'}>
      {isQwen ? <details><summary>모델 및 사용 조건</summary><p>Qwen3-TTS는 <a href="/vendor/qwen-tts/MODEL-LICENSE.txt" target="_blank" rel="noopener noreferrer">Apache-2.0 라이선스</a> 모델입니다. 타인의 대사·저작물 권리를 확인하고 사칭 등 해로운 용도로 사용하지 마세요. AI 생성 음성임을 표시해주세요. 기기 저장 공간 및 실행 메모리가 필요하며 캐시는 브라우저에서 삭제될 수 있습니다.</p><a href="/vendor/qwen-tts/NOTICE.md" target="_blank" rel="noopener noreferrer">오픈소스 출처</a></details> : <details><summary>모델 및 사용 조건</summary><p>Supertonic 3의 <a href="/vendor/supertonic/MODEL-LICENSE.txt" target="_blank" rel="noopener noreferrer">Open RAIL-M 라이선스 전문</a>과 부속서 A의 이용 제한이 적용됩니다. 불법 이용, 사칭, 괴롭힘, 타인에게 해를 끼치는 허위정보 생성 등 제한된 용도로 사용할 수 없습니다. 결과를 공개할 때 AI 생성 음성임을 명확히 표시해야 합니다. 타인의 대사·저작물 권리도 확인해주세요. 음성 복제 기능은 제공하지 않습니다.</p><a href="/vendor/supertonic/NOTICE.md" target="_blank" rel="noopener noreferrer">오픈소스 출처</a></details>}
      </div></div>
      {!selectedModel.engine && <p role="status">{status}</p>}
    <aside className="tool-preview"><span className="preview-label">AUDIO PREVIEW</span><h3>들어보고, 저장하세요.</h3>{result ? <>
      <p>{ttsModels.find(model => model.id === result.engine)?.name} · {speechLanguages.find(([code]) => code === result.language)?.[1]} · {result.seconds.toFixed(1)}초 · {result.voice} · AI 생성 음성</p>
      <audio key={result.url} controls preload="metadata" src={result.url} aria-label="생성된 내레이션 재생" style={{ width: '100%' }} onError={() => setStatus('음성 재생에 실패했습니다. 다시 생성해주세요.')} />
      <div className="tools-actions"><button onClick={() => { downloadFile(result.blob, 'bottopia-ai-narration.wav'); setStatus('WAV 다운로드를 요청했습니다. 저장된 파일을 확인해주세요.'); }}>음성 WAV 내려받기</button></div>
      <button disabled={encoding} onClick={exportMp3}>{encoding ? 'MP3 변환 중…' : '음성 MP3 내려받기'}</button><p className="tool-help">WAV: 원본 PCM · MP3: 128 kbps 압축</p>
      <p className="story-review-text">{result.text}</p>
    </> : <div className="voice-empty"><p>생성 후 이곳에서 듣고 MP3·WAV로 저장하세요.</p></div>}<p>생성 기록에 기기 저장됩니다. 중요한 음성은 파일로도 내려받으세요.</p><a href="https://github.com/shijinyu/lamejs" target="_blank" rel="noopener noreferrer">MP3 인코더 · lamejs LGPL-3.0 소스 및 라이선스</a>
    <AudioHistory owner={memberId} result={result} onSelect={audio=>{if(currentUrl.current)URL.revokeObjectURL(currentUrl.current);const url=URL.createObjectURL(audio.blob);currentUrl.current=url;setResult({...audio,url});setStatus('저장한 음성을 불러왔습니다. 위 플레이어에서 재생하거나 MP3로 저장하세요.');}} />
    </aside></div></div>
  </section>;
}
