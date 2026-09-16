'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { exportStory, normalizeStoryDraft, StoryFormatError, parseShots, shotSchedule, shotSources, shotsRequest, storyRequest, type StoryShot } from '../../lib/story-builder';
import { copyText } from '../../lib/clipboard';
import { downloadFile } from './download';
import type { createStoryEngine } from './story-engine';
import ProjectShelf from './ProjectShelf';
import RevisionReview from './RevisionReview';
import type { StoryProject } from '../../lib/story-project';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';

const subscribe = () => () => {};
const gpuAvailable = () => window.isSecureContext && 'gpu' in navigator;
const serverGpu = () => null;
const toneOptions = ['따뜻한 코미디', '긴장감 있는 스릴러', '감성 드라마', '판타지 모험', '담백한 다큐멘터리'];
export default function StoryBuilder({ memberId }: { memberId:string }) {
  const supported = useSyncExternalStore(subscribe, gpuAvailable, serverGpu);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(0);
  const [loadDetail, setLoadDetail] = useState('');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('따뜻한 코미디');
  const [customTone, setCustomTone] = useState(false);
  const validTone = tone.trim().length > 0 && tone.length <= 80;
  const [runtimeInput, setRuntime] = useState('60');
  const [clipInput, setClip] = useState('15');
  const runtime = Number(runtimeInput); const clip = Number(clipInput);
  const validRuntime = Number.isInteger(runtime) && runtime >= 15 && runtime <= 120;
  const validClip = Number.isInteger(clip) && clip >= 5 && clip <= 30;
  const [story, setStory] = useState('');
  const [preview, setPreview] = useState('');
  const [candidate, setCandidate] = useState('');
  const [previousProject, setPreviousProject] = useState<StoryProject|null>(null);
  const [feedback, setFeedback] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [shots, setShots] = useState<StoryShot[]>([]);
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const engine = useRef<ReturnType<typeof createStoryEngine> | null>(null);
  const lock = useRef(false);
  const epoch = useRef(0);
  const dirty = useRef(false);
  useEffect(() => {
    const client = createBrowserSupabaseClient();
    const { data } = client.auth.onAuthStateChange((_event,session) => {
      if (session?.user.id !== memberId) {
        epoch.current++; engine.current?.stop();
        window.location.replace('/login?next=%2Ftools&lang=ko');
      }
    });
    return () => data.subscription.unsubscribe();
  },[memberId]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty.current || lock.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    // These refs are mutable task handles, not DOM refs: invalidate the latest task on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { epoch.current++; engine.current?.stop(); window.removeEventListener('beforeunload', warn); };
  }, []);
  const invalidate = () => { setCandidate(''); setConfirmed(false); setShots([]); dirty.current = true; };
  function stop() { epoch.current++; engine.current?.stop(); engine.current = null; lock.current = false; setBusy(''); setReady(false); setPreview(''); setMessage('작업을 중단했습니다. 확정된 기존 내용은 유지됩니다.'); }
  async function run(label: string, task: (active: () => boolean) => Promise<void>) {
    if (lock.current) return;
    lock.current = true; const id = ++epoch.current;
    setBusy(label); setMessage('');
    try {
      const { data, error } = await createBrowserSupabaseClient().auth.getUser();
      if (error || data.user?.id !== memberId) throw new Error('로그인을 확인할 수 없습니다. 다시 로그인한 뒤 실행해주세요.');
      if (id === epoch.current) await task(() => id === epoch.current);
    }
    catch (error) { if (id === epoch.current) { if (!(error instanceof StoryFormatError)) { engine.current?.stop(); engine.current = null; setReady(false); } setMessage(error instanceof Error ? error.message : typeof error === 'string' ? error.slice(0,500) : '실행하지 못했습니다. 다시 준비해주세요.'); } }
    finally { if (id === epoch.current) { lock.current = false; setBusy(''); } }
  }
  async function prepare() {
    await run('AI 준비 중', async active => {
      const gpu = (navigator as unknown as { gpu?: { requestAdapter: () => Promise<{ features: { has: (key: string) => boolean } } | null> } }).gpu;
      const adapter = await gpu?.requestAdapter();
      if (!active()) return;
      if (!adapter?.features.has('shader-f16')) throw new Error('이 기기는 필요한 GPU 기능을 지원하지 않습니다. 최신 데스크톱 Chrome/Edge에서 시도해주세요. 유료 서비스로 전환하지 않습니다.');
      setProgress(0);
      const { createStoryEngine } = await import('./story-engine');
      if (!active()) return;
      setLoadDetail('실행 작업자 시작 중');
      engine.current = createStoryEngine((value, text) => { if (active()) { setProgress(value); setLoadDetail(text); } });
      await engine.current.load();
      if (active()) { setReady(true); setMessage('AI 준비 완료. 이제 주제로 시나리오를 만들 수 있습니다.'); }
    });
  }
  async function draft(revise = false) {
    if (!ready || !engine.current || !validRuntime || !validTone || candidate) return;
    await run(revise ? '시나리오 수정 중' : '시나리오 작성 중', async active => {
      const request = storyRequest(topic, tone.trim(), runtime, revise ? story : '', revise ? feedback : '');
      let result = '';
      for (let attempt = 0; attempt < 2; attempt++) {
        if (!active()) return;
        const raw = await engine.current!.generate(request + (attempt ? '\n앞선 출력은 형식 검사에 실패했습니다. 제목 다음에 [기], [승], [전], [결]을 각각 새 줄에 정확히 한 번씩 쓰고 각 단계에 한국어 1–2문장만 작성하세요. 총 800자 이내. 해설 없이 완성본만 출력하세요.' : ''), false, text => { if (active()) setPreview(text); });
        if (!active()) return;
        try { result = normalizeStoryDraft(raw); break; }
        catch (error) {
          if (!(error instanceof StoryFormatError)) throw error;
          if (attempt === 1) throw new StoryFormatError(`${error.message} 자동 재시도도 완료하지 못했습니다. 생성 원문은 아래에 남겨두었습니다. AI를 다시 준비하지 않고 재시도할 수 있습니다.`);
          setBusy('시나리오 형식 자동 보정 중 · 1/1');
        }
      }
      if (active()) {
        setPreview('');
        if(story) { setCandidate(result); setMessage('수정안을 비교한 뒤 반영 여부를 선택해주세요. 기존 작업은 유지됩니다.'); }
        else { setStory(result); invalidate(); setMessage('초안이 준비됐습니다. 내용을 수정하거나 확인 후 확정해주세요.'); }
      }
    });
  }
  async function makeShots() {
    if (!confirmed || !ready || !engine.current) return;
    if (candidate) return;
    if (!validRuntime || !validClip) return;
    await run('샷리스트 구성 중', async active => {
      const slots = shotSchedule(runtime, clip); const result: StoryShot[] = [];
      for (let i = 0; i < slots.length; i++) {
        if (!active()) return;
        setBusy(`샷리스트 구성 중 · ${i}/${slots.length}`);
        // Isolate each shot's source so a small model cannot use the first
        // shot's events to fill every item in a multi-shot response.
        const batch = slots.slice(i, i + 1);
        const text = await engine.current!.generate(shotsRequest(story, batch, runtime, slots.length), true, undefined, batch.length);
        result.push(...parseShots(text, batch));
      }
      if (active()) { setShots(result); dirty.current = true; setMessage(`${result.length}개 샷 · 총 ${runtime}초 구성이 완료됐습니다. 연출과 대사 길이를 검토해주세요.`); }
    });
  }
  const output = exportStory(story, shots);
  // Derive references from the confirmed editor, never from model-generated text.
  // A reference is not evidence that the adjacent AI suggestion is correct.
  let sources: ReturnType<typeof shotSources> = [];
  let sourceError = '';
  try { if(shots.length) sources = shotSources(story, shots, shots.length); }
  catch { sourceError = '복원된 시나리오의 단계 제목을 확인해주세요. 기존 샷은 유지하며, 원문은 위 시나리오 편집기에서 확인할 수 있습니다.'; }
  const project:StoryProject = { topic,tone,runtimeInput,clipInput,story,feedback,shots };
  function restore(p:StoryProject) {
    if (lock.current) return;
    setCandidate('');
    setTopic(p.topic); setTone(p.tone); setRuntime(p.runtimeInput); setClip(p.clipInput);
    setCustomTone(!toneOptions.includes(p.tone));
    setStory(p.story); setFeedback(p.feedback); setShots(p.shots); setConfirmed(false);
    setPreview(''); dirty.current = true; setMessage('작업을 복원했습니다. 검토 후 시나리오를 다시 확정해주세요.');
  }
  return <section className="story-builder" aria-label="AI 시나리오와 샷리스트">
    <header className="tool-section-head"><div><p className="story-beta">STORY WORKSPACE · BETA</p><h2>어떤 이야기를 만들까요?</h2><p>주제를 적으면 초안을 만듭니다. 내용을 확인하고 확정하면 샷리스트로 이어집니다.</p></div></header>
    <ol className="workspace-flow" aria-label="작업 진행 상태">
      <li aria-current={!story ? 'step' : undefined} data-complete={!!story}>이야기 작성</li>
      <li aria-current={!!story && !confirmed ? 'step' : undefined} data-complete={confirmed}>검토·확정</li>
      <li aria-current={confirmed ? 'step' : undefined} data-complete={!!shots.length}>샷 구성</li>
    </ol>
    <div className="story-setup engine-setup">
      <strong>{ready ? '이 기기에서 AI 실행 중' : '처음 한 번, 이 기기에 AI 준비'}</strong>
      <p>Qwen3.5 4B 모델을 내려받아 브라우저에서 실행합니다. 최초 다운로드 약 3GB, 실행 시 약 4GB 이상의 GPU 메모리가 필요합니다. 데스크톱 권장 · 모바일은 기기에 따라 제한됩니다.</p>
      <details className="engine-details"><summary>기기 요구사항·개인정보·모델 안내</summary><p>실험용 베타입니다. 한국어 표현과 이야기의 인과관계가 어색하거나 샷 내용이 반복될 수 있습니다. 전문 감독의 완성본이 아닌 초안으로 사용하고, 결과를 검토한 뒤 활용해주세요.</p>
      <p>입력 내용은 생성 서버로 전송하지 않습니다. 모델 파일은 Hugging Face와 GitHub에서 받으며 해당 서비스에 접속 정보가 전달됩니다. 모델은 브라우저에 캐시됩니다. 작업 내용은 아래에서 기기 저장을 켜거나 파일로 보관하세요. 생성 요금·API 키·ChatGPT 로그인은 없습니다. 봇토피아 회원 로그인이 필요합니다.</p>
      </details>
      {!ready && <><label className="story-consent"><input type="checkbox" checked={consent} disabled={!!busy} onChange={e => setConsent(e.target.checked)} />다운로드 용량과 기기 사용 안내를 확인했습니다.</label><button className="tool-primary" disabled={!supported || !consent || !!busy} onClick={() => void prepare()}>이 기기에 AI 준비하기</button></>}
      {supported === false && <p role="status">현재 브라우저에서는 WebGPU를 사용할 수 없습니다. 지원하는 데스크톱 브라우저에서 열어주세요.</p>}
      {busy === 'AI 준비 중' && <label className="tool-field">모델 준비 {Math.round(progress * 100)}%<progress max={1} value={progress} /><span className="tool-help">{loadDetail}</span></label>}
      {(busy || ready) && <button onClick={stop}>{busy ? '중단하기' : 'AI 종료 · 메모리 해제'}</button>}
      <details><summary>모델·라이선스 안내</summary><p>WebLLM 및 Qwen3.5는 Apache 2.0 기반입니다. AI 초안은 부정확하거나 반복될 수 있어 공개 전 검토가 필요합니다. AI 종료는 메모리를 해제하며 다운로드 캐시는 브라우저의 사이트 데이터 설정에서 지울 수 있습니다.</p><a href="https://huggingface.co/Qwen/Qwen3.5-4B" target="_blank" rel="noreferrer">모델 안내 ↗</a> · <a href="https://github.com/mlc-ai/web-llm" target="_blank" rel="noreferrer">실행 엔진 ↗</a></details>
    </div>
    <details className="workspace-storage"><summary>내 작업 저장·불러오기 <span>이어서 작업할 때</span></summary><ProjectShelf memberId={memberId} project={project} busy={!!busy} restore={restore} /></details>
    <fieldset disabled={!!busy} className="story-inputs">
      <legend>이야기의 시작</legend>
      <label className="tool-field">주제 또는 간략한 시나리오<textarea rows={4} maxLength={1200} placeholder="예: 퇴근하려는 조선시대 노비. 집사가 자꾸 일을 시키자 기발한 방법으로 탈출하는 코미디." value={topic} onChange={e => { setTopic(e.target.value); invalidate(); }} /></label>
      <div className="scene-fields"><label className="tool-field">분위기<select value={customTone ? '__custom__' : tone} onChange={e => { const custom = e.target.value === '__custom__'; setCustomTone(custom); setTone(custom ? '' : e.target.value); invalidate(); }}>{toneOptions.map(value => <option key={value}>{value}</option>)}<option value="__custom__">직접 입력</option></select></label><label className="tool-field">전체 러닝타임 (15–120초)<input type="number" min={15} max={120} aria-invalid={!validRuntime} value={runtimeInput} onChange={e => { setRuntime(e.target.value); invalidate(); }} /></label></div>
      {customTone && <label className="tool-field">원하는 분위기<input maxLength={80} value={tone} onChange={e => { setTone(e.target.value); invalidate(); }} placeholder="예: 몽환적인 SF에 블랙코미디를 섞은 분위기" aria-describedby="custom-tone-help" /><span id="custom-tone-help" className="tool-help">원하는 장르와 감정을 자유롭게 적어주세요. 최대 80자.</span></label>}
      {!validRuntime && <p role="status">전체 러닝타임은 15–120 사이의 정수로 입력해주세요.</p>}
      {!ready && <p className="tool-help">처음이라면 위에서 AI를 준비해주세요. 준비하는 동안 주제를 적어둘 수 있습니다.</p>}
      <button className="tool-primary" disabled={!ready || !validRuntime || !validTone || topic.trim().length < 3} onClick={() => void draft()}>시나리오 초안 만들기</button>
    </fieldset>
    {busy && <p role="status">{busy} · 기기에 따라 몇 분 걸릴 수 있습니다.</p>}
    {preview && <div><p>{busy ? '생성 중인 시나리오' : '검토가 필요한 생성 원문 · 확정된 시나리오는 변경하지 않았습니다.'}</p><pre className="story-live" aria-label="생성 원문">{preview}</pre></div>}
    {candidate && <RevisionReview before={story} after={candidate} accept={()=>{setPreviousProject(structuredClone(project));setStory(candidate);invalidate();setMessage('수정안을 반영했습니다. 시나리오를 다시 확정해주세요.');}} discard={()=>{setCandidate('');setMessage('기존 시나리오와 샷리스트를 유지했습니다.');}} />}
    {previousProject && !busy && <button onClick={()=>{restore(previousProject);setPreviousProject(null);}}>마지막 AI 수정 반영 되돌리기</button>}
    {story && <fieldset disabled={!!busy} className="story-inputs"><legend>시나리오 검토</legend><label className="tool-field">시나리오 · 직접 수정 가능<textarea rows={12} maxLength={2400} value={story} onChange={e => { setStory(e.target.value); invalidate(); }} /></label><label className="tool-field">AI에게 수정 요청<input maxLength={500} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="예: 마지막에 노비가 집사도 함께 퇴근시키는 반전으로 바꿔줘." /></label><div className="tools-actions"><button disabled={!ready || !feedback.trim()} onClick={() => void draft(true)}>요청대로 수정</button><button className="tool-primary" disabled={!story.trim()} onClick={() => { try { const normalized = normalizeStoryDraft(story); setStory(normalized); setConfirmed(true); setMessage('시나리오를 확정했습니다. 클립 길이를 선택하고 샷리스트를 만들어주세요.'); } catch (error) { setConfirmed(false); setMessage(error instanceof Error ? error.message : '시나리오를 확인해주세요.'); } }}>{confirmed ? '시나리오 확정됨 ✓' : '이 시나리오로 확정'}</button></div></fieldset>}
    {confirmed && <fieldset disabled={!!busy} className="story-inputs"><legend>샷리스트 구성</legend><label className="tool-field">생성 클립 하나의 최대 길이 (5–30초)<input type="number" min={5} max={30} aria-invalid={!validClip} value={clipInput} onChange={e => { setClip(e.target.value); setShots([]); }} /></label>{!validClip ? <p role="status">클립 길이는 5–30 사이의 정수로 입력해주세요.</p> : <p className="tool-help">전체 {runtime}초를 최대 {clip}초 클립으로 묶고, 클립 안을 약 4–8초 샷으로 구성합니다. 선택한 길이는 계획값이며 특정 영상 모델의 지원 길이를 보장하지 않습니다.</p>}<button className="tool-primary" disabled={!ready || !validRuntime || !validClip} onClick={() => void makeShots()}>확정 시나리오로 샷리스트 만들기</button></fieldset>}
    {!!shots.length && <div className="story-shots"><p className="tool-help">AI 연출안과 확정 원문을 비교해주세요. 같은 단계에 속한 샷은 같은 장면의 연속 촬영안이며, AI가 인물의 행동·전달 방향을 바꾸거나 생략했는지 확인해야 합니다.</p>{sourceError && <p role="status">{sourceError}</p>}{shots.map((s,i) => <article key={s.index}><header><strong>SHOT {String(s.index).padStart(2, '0')}</strong><span>클립 {s.clip} · {s.start}–{s.start + s.duration}초</span></header>{sources[i] && <details><summary>확정 원문 · {sources[i].stage}</summary><p style={{whiteSpace:'pre-wrap'}}>{sources[i].source}</p></details>}<p><small>AI 화면 연출안</small><br/>{s.visual}</p><dl><dt>카메라</dt><dd>{s.camera}</dd><dt>소리</dt><dd>{s.audio}</dd></dl></article>)}</div>}
    {story && <div className="tools-actions"><button onClick={async () => setMessage(await copyText(output) ? '결과를 복사했습니다.' : '복사하지 못했습니다. 파일로 내려받아주세요.')}>결과 복사</button><button onClick={() => downloadFile(new Blob([output], { type: 'text/plain;charset=utf-8' }), 'bottopia-story.txt')}>결과 내려받기</button></div>}
    <p className="tool-status" role="status">{message}</p>
  </section>;
}
