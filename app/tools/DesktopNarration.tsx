'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { readConnection, saveConnection } from './desktop-connection';
import { connectorRequest, desktopSpecs } from './desktop-tts';
import { speechLanguages } from '../../public/vendor/tts-languages.mjs';
import { connectorDownload, desktopReleaseReview, reviewLabel } from './tts-release';
import downloadSize from './tts-download-size.json';
import { estimateLabel, estimateTiming, recordTiming } from './tts-estimate';

export type DesktopAudio = {blob:Blob; seconds:number; text:string; voice:string; engine:string; language:string};
type ModelStatus = {state:string;message:string};
const stages: Record<string,string> = {request:'요청 보내는 중',preparing:'모델 준비 중',downloading:'모델 파일 확인·다운로드 중',loading:'모델을 메모리에 불러오는 중',generating:'음성 생성 중',encoding:'오디오 파일 정리 중',receiving:'완성된 음성 받는 중',done:'완료'};
export default function DesktopNarration({modelId, token, onTokenChange, onBusyChange, onResult, text, onTextChange:setText}:{modelId:string;token:string;onTokenChange:(value:string)=>void;onBusyChange:(value:boolean)=>void;onResult:(value:DesktopAudio)=>void;text:string;onTextChange:(value:string)=>void}) {
  const spec=desktopSpecs[modelId];
  const downloadUrl=connectorDownload(modelId);
  const qwenDownload=modelId==='qwen-custom'||modelId==='qwen-design';
  const [models,setModels]=useState<Record<string,ModelStatus>>({});
  const [status,setStatus]=useState(''),[busy,setBusy]=useState(false),[checking,setChecking]=useState(false);
  const [phase,setPhase]=useState(''),[elapsed,setElapsed]=useState(0);
  const startedAt=useRef(0);
  const generationStartedAt=useRef(0);
  const [estimate,setEstimate]=useState<number|null>(null);
  const [generationOffset,setGenerationOffset]=useState<number|null>(null);
  useEffect(()=>{if(!busy)return;const tick=()=>setElapsed(Math.floor((Date.now()-startedAt.current)/1000));tick();const id=setInterval(tick,1000);return()=>clearInterval(id);},[busy]);
  const [language,setLanguage]=useState(spec.languages[0]),[voice,setVoice]=useState(spec.voices?.[0]||'default');
  const [instruct,setInstruct]=useState(''),[speed,setSpeed]=useState(1),[reference,setReference]=useState<File|null>(null),[referenceText,setReferenceText]=useState(''),[referenceLanguage,setReferenceLanguage]=useState(spec.languages[0]),[consent,setConsent]=useState(false);
  const job=useRef(''), timer=useRef<ReturnType<typeof setTimeout>|null>(null), mounted=useRef(true), stopped=useRef(false), active=useRef(false);
  const tokenRef=useRef(token);
  useEffect(()=>{tokenRef.current=token;},[token]);
  useEffect(()=>{onBusyChange(busy);},[busy,onBusyChange]);
  useEffect(()=>{ mounted.current=true; return ()=>{ mounted.current=false; stopped.current=true; if(timer.current)clearTimeout(timer.current); if(job.current)void connectorRequest(`/v1/jobs/${job.current}`,tokenRef.current,{method:'DELETE'}).catch(()=>{}); }; },[]);
  useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(active.current){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
  const connectionAttempt=useRef(0);
  const connect=useCallback(async (signal?:AbortSignal)=>{
    const attempt=++connectionAttempt.current;
    setChecking(true);
    try {
      const data=await(await connectorRequest('/v1/models',token,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):undefined})).json();
      if(signal?.aborted||attempt!==connectionAttempt.current||!mounted.current)return;
      if(data.protocol!==1)throw new Error('연결기 버전을 확인해주세요.');
      setModels(data.models);
      let saved=false;try{saved=saveConnection(window.localStorage,token);}catch{/* Storage blocked. */}
      setStatus(saved?'PC에 연결했습니다. 이 브라우저에서 연결 코드를 기억합니다.':'PC에 연결했습니다. 브라우저 저장이 차단되어 다음 방문에는 코드를 다시 입력해야 합니다.');
    }
    catch(e){if(!signal?.aborted&&attempt===connectionAttempt.current&&mounted.current){setModels({});setStatus(e instanceof Error?`${e.message} · PC 연결기를 실행한 뒤 다시 확인하세요. 연결기를 재시작했다면 새 코드를 입력하세요. 브라우저가 로컬 네트워크 권한을 요청하면 이 연결에만 허용하세요.`:'PC 연결 실패');}}
    finally{if(attempt===connectionAttempt.current&&mounted.current)setChecking(false);}
  },[token]);
  useEffect(()=>{
    const controller=new AbortController();
    const restore=setTimeout(()=>{
      try{if(token&&readConnection(window.localStorage)===token)void connect(controller.signal);}catch{/* Manual connection remains available. */}
    },0);
    return()=>{clearTimeout(restore);controller.abort();};
  },[token,connect]);
  async function referenceData(file:File){
    if(file.size>10*1024*1024)throw new Error('기준 음성은 10MB 이하여야 합니다.');
    const context=new AudioContext();
    try{
      const decoded=await context.decodeAudioData(await file.arrayBuffer());
      if(decoded.duration<1||decoded.duration>60)throw new Error('기준 음성 길이는 1–60초입니다.');
      const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*24000),24000);
      const source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();
      const pcm=(await offline.startRendering()).getChannelData(0);
      const bytes=new Uint8Array(44+pcm.length*2), view=new DataView(bytes.buffer);
      function tag(offset:number,s:string){for(let i=0;i<s.length;i++)bytes[offset+i]=s.charCodeAt(i);}
      tag(0,'RIFF');view.setUint32(4,bytes.length-8,true);tag(8,'WAVE');tag(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,24000,true);view.setUint32(28,48000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);tag(36,'data');view.setUint32(40,pcm.length*2,true);
      for(let i=0;i<pcm.length;i++){const n=Math.max(-1,Math.min(1,pcm[i]));view.setInt16(44+i*2,n<0?n*32768:n*32767,true);}
      let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);
    }finally{await context.close();}
  }
  async function generate(){
    if(active.current)return;
    generationStartedAt.current=0;
    setGenerationOffset(null);
    const timingContext=JSON.stringify([modelId,language,voice,speed,Boolean(reference)]);
    const chars=Array.from(text.trim()).length;
    let previousEstimate:number|null=null;
    try{previousEstimate=estimateTiming(window.localStorage,timingContext,chars);}catch{/* Storage blocked. */}
    setEstimate(previousEstimate);
    active.current=true;stopped.current=false;startedAt.current=Date.now();setElapsed(0);setPhase('request');setBusy(true);setStatus('PC에 생성 요청을 준비합니다.');
    try{
      const payload={model:modelId,text,language,voice,instruct,speed,reference:reference?await referenceData(reference):'',reference_text:referenceText,reference_language:referenceLanguage,consent};
      if(stopped.current)return;
      const data=await(await connectorRequest('/v1/jobs',token,{method:'POST',body:JSON.stringify(payload)})).json();
      if(!/^[a-f0-9]{32}$/.test(data.id))throw new Error('잘못된 작업 응답입니다.');
      job.current=data.id;
      if(stopped.current||!mounted.current){await connectorRequest(`/v1/jobs/${job.current}`,token,{method:'DELETE'});return;}
      const poll=async()=>{
        if(stopped.current||!mounted.current)return;
        try{
          const state=await(await connectorRequest(`/v1/jobs/${data.id}`,token)).json();
          if(stopped.current||!mounted.current)return;
          setStatus(state.message);
          if(state.state==='running'||state.state==='queued'){
            if(state.stage==='generating'&&!generationStartedAt.current){generationStartedAt.current=Date.now();setGenerationOffset((generationStartedAt.current-startedAt.current)/1000);}
            setPhase(stages[state.stage]?state.stage:'preparing');
          }
          if(state.state==='done'){
            setPhase('receiving');
            const blob=await(await connectorRequest(`/v1/jobs/${data.id}/audio`,token)).blob();
            if(stopped.current||!mounted.current)return;
            if(blob.size<44||blob.size>10000000||!Number.isFinite(state.seconds)||state.seconds<=0)throw new Error('잘못된 음성 결과입니다.');
            if(generationStartedAt.current){try{recordTiming(window.localStorage,timingContext,chars,(Date.now()-generationStartedAt.current)/1000);}catch{/* No text or voice data is saved. */}}
            onResult({blob,seconds:state.seconds,text,voice,engine:modelId,language});job.current='';active.current=false;setPhase('done');setBusy(false);
          }else if(state.state==='error'||state.state==='cancelled'){job.current='';active.current=false;setBusy(false);}
          else timer.current=setTimeout(poll,2000);
        }catch(e){if(job.current)void connectorRequest(`/v1/jobs/${job.current}`,token,{method:'DELETE'}).catch(()=>{});active.current=false;setBusy(false);setStatus((e instanceof Error?e.message:'연결 오류')+' · 중단 요청을 보냈습니다. PC 연결기에서도 작업 상태를 확인하세요.');}
      };
      await poll();
    }catch(e){active.current=false;setBusy(false);setStatus(e instanceof Error?e.message:'PC 생성 요청 실패');}
  }
  async function cancel(){
    stopped.current=true;if(timer.current)clearTimeout(timer.current);
    try{if(job.current)await connectorRequest(`/v1/jobs/${job.current}`,token,{method:'DELETE'});job.current='';setStatus('PC 생성 작업을 중단했습니다.');}
    catch{setStatus('PC 중단 요청을 확인하지 못했습니다. 연결기 창에서 Ctrl+C로 중단하세요.');}
    active.current=false;setBusy(false);
  }
  return <div className="desktop-narration">
    <section className="utility-panel"><h3>내 PC 실행기 연결</h3><p>이 모델은 홈페이지에서 요청하고 PC에서 생성합니다. API 결제 키는 필요 없습니다. 모바일 단독 실행은 지원하지 않습니다.</p>
      {downloadUrl && <><a className="tts-download-link" href={downloadUrl} download>PC 연결기 내려받기 <span>소스 ZIP · {qwenDownload?downloadSize.qwenSource.label:downloadSize.allSource.label}</span></a><p className="tool-help">{qwenDownload?'CustomVoice·VoiceDesign 전용입니다. 첫 생성 시 선택한 Qwen 모델 약 4.52 GB를 추가로 받습니다.':'16개 PC 설치 항목이 포함됩니다. 필요한 모델만 메뉴에서 선택하세요. 모델별 용량은 선택한 모델 안내를 확인하세요.'} ZIP에는 모델이 포함되지 않으며 실행 패키지·모델·캐시 저장 공간이 별도로 필요합니다.</p></>}
      <details className="tts-release-note"><summary>모델 조건 · 다운로드 안내</summary><strong>{reviewLabel(modelId)}</strong><p>{desktopReleaseReview[modelId]?.reason || '배포 조건 확인 필요'}</p><p>연결기 소스 제공과 모델의 사용 조건·실행 검증은 별개입니다. 모든 PC에서 생성이 검증된 설치 앱은 아닙니다. 모델마다 GPU·운영체제·접근 승인 요건이 다릅니다.</p><p>실행 패키지와 모델은 PyPI·공식 Git 저장소·Hugging Face 등 모델별 출처에서 받습니다. 이미 받은 파일은 보통 재사용하지만 업데이트·캐시 삭제 시 다시 받을 수 있습니다. 출처는 ZIP의 SOURCES.md 또는 Qwen 고지를 확인하세요.</p></details>
      <p className="tool-help">서명·공증된 설치 앱이 아닌 소스 배포입니다. Mac·Windows에서 실행 시 보안 경고로 차단될 수 있습니다.</p>
      <details><summary>Mac·Windows에서 보안 경고가 표시된다면</summary>
        <p><strong>Mac:</strong> “Apple은 악성 코드가 없음을 확인할 수 없습니다”는 개발자 확인·공증 관련 경고입니다. 악성 코드가 검출됐다는 뜻과는 다르지만, 안전하다는 보장도 아닙니다.</p>
        <p>우선 ‘완료’로 창을 닫고 다운로드 출처와 파일을 확인하세요. 신뢰할 수 있다고 판단한 경우에만 시스템 설정 → 개인정보 보호 및 보안에서 아래로 스크롤하고 해당 파일 이름 옆의 ‘그래도 실행’ 또는 ‘확인 없이 열기’(Open Anyway)를 눌러 개별 실행을 승인하세요. 터미널 메뉴가 열리면 아래 설치 순서를 따릅니다. 항목이 없거나 악성 코드 탐지·손상 경고가 나오면 중단하세요. <a href="https://support.apple.com/102445" target="_blank" rel="noopener noreferrer">Apple 공식 안내</a></p>
        <p><strong>Windows:</strong> 환경에 따라 SmartScreen의 ‘Windows의 PC 보호’ 또는 Smart App Control 차단이 표시될 수 있습니다. 파일 종류·정책에 따라 화면과 허용 여부가 다릅니다. 출처와 보안 검사 결과를 확인하고, 악성 코드 탐지나 조직 정책 차단이 있으면 실행하지 마세요. <a href="https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation" target="_blank" rel="noopener noreferrer">Microsoft 공식 안내</a></p>
        <p>Gatekeeper·SmartScreen·백신·방화벽을 끄거나 격리 속성을 일괄 제거하지 마세요. 실행 승인은 사용자가 직접 판단해야 합니다. Windows 실제 설치 검증은 아직 완료되지 않았습니다.</p>
      </details>
      <details><summary>처음 연결하는 방법</summary><ol>
        <li>다운로드한 ZIP의 압축을 풉니다. 이 ZIP은 연결기 소스이며, Python이나 음성 모델이 들어 있는 완성형 설치 프로그램은 아닙니다.</li>
        <li>시작 파일은 <a href="https://www.python.org/downloads/" target="_blank" rel="noopener noreferrer">Python 3.11</a>로 실행합니다. {spec.python!=='3.11'&&<>선택한 모델 설치에는 Python {spec.python}도 필요합니다. </>}저장소 설치형 모델에는 <a href="https://git-scm.com/downloads" target="_blank" rel="noopener noreferrer">Git</a>도 필요합니다.</li>
        <li>압축을 푼 폴더에서 <strong>Mac: <code>Start-Mac.command</code></strong> / <strong>Windows: <code>Start-Windows.cmd</code></strong>를 더블클릭합니다. 파일 이름이 두 줄로 표시될 수 있습니다.</li>
        <li>열린 터미널 메뉴에서 <code>{modelId}</code> 옆의 번호를 입력하고 Enter를 누릅니다. 설치가 끝나면 <strong>0</strong>을 입력해 홈페이지 연결을 시작합니다.</li>
        <li>터미널에 표시된 연결 코드를 아래 <strong>PC 연결 코드</strong> 칸에 붙여넣고 <strong>PC 연결 확인</strong>을 누릅니다. 사용하는 동안 터미널 창은 열어두세요.</li>
      </ol><p>최초 생성 시 모델 파일이 추가 다운로드됩니다. 설치 파일 용량·GPU 요구사항과 추가 준비는 모델별로 다르며, ZIP의 README.md에 정리되어 있습니다.</p>
      <details><summary>터미널 명령으로 직접 실행하기</summary><p>아래는 파일 이름이 아니라 터미널에 입력하는 명령어입니다. 먼저 터미널에서 압축을 푼 폴더로 이동하세요.</p><p>Mac 설치: <code>python{spec.python} connector.py install {modelId}</code><br/>Mac 연결: <code>python{spec.python} connector.py serve</code></p><p>Windows 설치: <code>py -{spec.python} connector.py install {modelId}</code><br/>Windows 연결: <code>py -{spec.python} connector.py serve</code></p></details></details>
      <details><summary>설치한 연결기·모델 삭제 방법</summary><ol>
        <li>필요한 음성을 저장하고 생성을 중단합니다. 연결기 터미널에서 <strong>Ctrl+C</strong>로 종료한 뒤 홈페이지의 <strong>연결 해제 · 저장 삭제</strong>를 누릅니다.</li>
        <li><strong>Mac:</strong> Finder → 이동 → 폴더로 이동에 <code>~/.bottopia-tts</code> 입력. <strong>Windows:</strong> 파일 탐색기 주소창에 <code>{'%USERPROFILE%\\.bottopia-tts'}</code> 입력. 그 안의 삭제할 모델 폴더만 휴지통으로 옮기세요. 모든 PC 모델 환경을 지우려면 개인 파일을 백업하고 이 폴더를 삭제합니다.</li>
        <li>Qwen 모델 파일은 별도 캐시에 남습니다. Mac <code>~/.cache/huggingface/hub</code>, Windows <code>{'%USERPROFILE%\\.cache\\huggingface\\hub'}</code> 안에서 <code>models--Qwen--Qwen3-TTS-12Hz-1.7B-CustomVoice</code> 또는 <code>models--Qwen--Qwen3-TTS-12Hz-1.7B-VoiceDesign</code> 중 삭제할 모델 폴더만 옮기세요.</li>
        <li>다운로드한 ZIP과 압축을 푼 연결기 폴더도 휴지통으로 옮깁니다. 휴지통을 비우기 전에 대상 파일을 확인하세요.</li>
      </ol><p className="tool-help">캐시는 다른 앱과 공유될 수 있습니다. 캐시 상위 폴더를 통째로 지우지 마세요. 사용자 지정 설치·캐시 경로는 기본 위치와 다릅니다. Python·Git 등 공용 도구는 삭제하지 않습니다. 저장한 음성·임시 로그·브라우저 데이터 등 자세한 정리 방법은 ZIP의 UNINSTALL.md에 있습니다.</p></details>
      <label className="tool-field">PC 연결 코드<input type="password" autoComplete="off" spellCheck={false} value={token} disabled={busy} onChange={e=>{connectionAttempt.current++;setChecking(false);onTokenChange(e.target.value.trim());setModels({});}} /></label>
      <div className="tts-generation-action"><button type="button" disabled={busy||checking||!token} onClick={()=>void connect()}>{checking?'확인 중…':'PC 연결 확인'}</button>
      {token&&<button type="button" disabled={busy} onClick={()=>{connectionAttempt.current++;onTokenChange('');setChecking(false);setModels({});setStatus('연결을 해제하고 저장된 코드를 삭제했습니다.');}}>연결 해제 · 저장 삭제</button>}</div>
      <p className="tool-help">연결에 성공하면 이 브라우저에 코드를 저장하고 다음 방문에 자동으로 연결을 확인합니다. 연결 해제 또는 사이트 데이터 삭제 시 지워집니다. 공용 PC에서는 사용 후 연결을 해제하세요. PC 연결기는 실행 중이어야 하며, 연결기를 재시작하면 새 코드를 입력해야 합니다.</p>
      <p>{models[modelId]?.message||'PC 연결을 확인해주세요.'}</p>
    </section>
    <fieldset className="tts-editor" disabled={busy}><legend>음성 만들기 · PC 실행</legend>
      <label className="tool-field tts-language">읽을 언어<select value={language} onChange={e=>setLanguage(e.target.value)}>{spec.languages.map(code=><option key={code} value={code}>{speechLanguages.find(([id])=>id===code)?.[1]||code}</option>)}</select></label>
      <label className="tool-field">읽을 대사 · {text.length}/500자<textarea rows={6} maxLength={500} value={text} onChange={e=>setText(e.target.value)}/></label>
      {spec.voices&&<div className="voice-chips" role="group" aria-label="PC 모델 목소리">{spec.voices.map(v=><button type="button" key={v} aria-pressed={v===voice} onClick={()=>setVoice(v)}>{v}</button>)}</div>}
      {spec.instruction&&<label className="tool-field">{spec.instruction}<textarea rows={2} maxLength={1000} value={instruct} onChange={e=>setInstruct(e.target.value)}/></label>}
      {spec.reference&&<><label className="tool-field">기준 음성 · {spec.reference==='required'?'필수':'선택'}<input type="file" accept="audio/wav,audio/mpeg,audio/flac,audio/mp4,audio/ogg" onChange={e=>setReference(e.target.files?.[0]||null)}/></label><p>1–60초 · 최대 10MB · 본인 또는 사용 허락을 받은 목소리만 사용하세요. 선택한 파일은 이 컴퓨터의 연결기로만 전송됩니다.</p>{reference&&<><label className="tool-field">기준 음성에 나오는 대사<textarea maxLength={1000} rows={2} value={referenceText} onChange={e=>setReferenceText(e.target.value)}/></label><label className="tool-field tts-language">기준 음성 언어<select value={referenceLanguage} onChange={e=>setReferenceLanguage(e.target.value)}>{spec.languages.map(code=><option key={code} value={code}>{speechLanguages.find(([id])=>id===code)?.[1]||code}</option>)}</select></label></>}</>}
      {spec.speed&&<label className="tool-field">속도 · {speed.toFixed(2)}배<input type="range" min="0.5" max="2" step="0.01" value={speed} onChange={e=>setSpeed(Number(e.target.value))}/><small>작업실 제공 범위 0.5–2배</small></label>}
      <p className="tool-help">{spec.help}</p>
      <label className="story-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>모델 다운로드·공식 사용 조건을 확인했으며, 기준 음성 사용 권한이 있습니다.</label>
      <div className="tts-generation-action"><button type="button" className="tool-primary" disabled={busy||!consent||!text.trim()||models[modelId]?.state!=='installed'||(spec.reference==='required'&&!reference)} onClick={generate}>{busy?'음성 만드는 중…':'PC에서 음성 만들기'}</button>
      {(busy||phase==='done')&&<div className="tts-job-progress"><div className="tts-job-caption"><span role="status">{stages[phase]||'처리 중'}</span><span>{phase==='done'?'100%':`경과 ${Math.floor(elapsed/60)}분 ${elapsed%60}초`}</span></div><progress aria-label="PC 음성 생성 진행" max={100} value={phase==='done'?100:undefined}/>{busy&&<><small>{estimateLabel(estimate,generationOffset===null?null:Math.max(0,elapsed-generationOffset),phase)}</small><small>이 브라우저의 동일 모델·설정 기록과 대사 길이 기준 추정입니다. PC 부하에 따라 달라집니다.</small></>}</div>}</div>
    </fieldset>
    {busy&&<button type="button" className="tts-cancel-compact" onClick={cancel}>생성 중단</button>}<p role="status">{status}</p>
  </div>;
}
