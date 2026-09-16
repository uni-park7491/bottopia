'use client';
import {useEffect,useRef,useState} from 'react';
import type {StoryShot} from '../../lib/story-builder';
import {activeShot,audioPosition,timelineDuration} from '../../lib/animatic';
import {downloadFile} from './download';

export default function Animatic({shots,disabled=false}:{shots:StoryShot[];disabled?:boolean}) {
  const duration=timelineDuration(shots);
  const [time,setTime]=useState(0), [playing,setPlaying]=useState(false);
  const [images,setImages]=useState<Record<number,string>>({});
  const [audioUrl,setAudioUrl]=useState(''), [audioName,setAudioName]=useState('');
  const [offset,setOffset]=useState(0),[volume,setVolume]=useState(0.7);
  const [message,setMessage]=useState('');
  const [exporting,setExporting]=useState(false),[exportProgress,setExportProgress]=useState(0);
  const exportTask=useRef<AbortController|null>(null),soundFile=useRef<File|null>(null);
  const audio=useRef<HTMLAudioElement>(null);
  const urls=useRef(new Set<string>());
  const origin=useRef({clock:0,time:0});
  const mounted=useRef(true);
  const current=activeShot(shots,time), shot=shots[current];
  function pause(){setPlaying(false);audio.current?.pause();}
  function seek(value:number){pause();setTime(Math.max(0,Math.min(duration,value)));}
  useEffect(()=>{
    mounted.current=true; const allocated=urls.current;
    return ()=>{mounted.current=false;exportTask.current?.abort();for(const url of allocated) URL.revokeObjectURL(url);allocated.clear();};
  },[]);
  useEffect(()=>{
    if(!playing) return;
    let frame=0;
    function tick(now:number){
      if(disabled){setPlaying(false);audio.current?.pause();return;}
      const next=Math.min(duration,origin.current.time+(now-origin.current.clock)/1000);
      setTime(next);
      const player=audio.current;
      if(player){
        const at=audioPosition(next,offset,player.duration);
        if(at===null) player.pause();
        else {
          if(Math.abs(player.currentTime-at)>0.2) player.currentTime=at;
          if(player.paused) void player.play().catch(()=>{setPlaying(false);setMessage('음원을 재생하지 못했습니다. 파일 형식과 브라우저 권한을 확인해주세요.');});
        }
      }
      if(next>=duration){setPlaying(false);player?.pause();return;}
      frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);return ()=>cancelAnimationFrame(frame);
  },[playing,duration,offset,disabled]);
  useEffect(()=>{const onHidden=()=>{if(document.hidden){setPlaying(false);audio.current?.pause();}};document.addEventListener('visibilitychange',onHidden);return()=>document.removeEventListener('visibilitychange',onHidden);},[]);
  async function selectImage(index:number,file?:File){
    if(!file)return;pause();
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024){setMessage('PNG·JPEG·WebP 이미지 10MB 이하를 선택해주세요.');return;}
    try {
      const bitmap=await createImageBitmap(file);
      const pixels=bitmap.width*bitmap.height;bitmap.close();
      if(pixels>16000000)throw new Error('이미지는 1,600만 화소 이하로 줄여주세요.');
      if(!mounted.current)return;
      const url=URL.createObjectURL(file);urls.current.add(url);
      setImages(old=>{if(old[index]){URL.revokeObjectURL(old[index]);urls.current.delete(old[index]);}return {...old,[index]:url};});
      setMessage('참고 이미지를 이 브라우저에 배치했습니다. 서버로 전송하지 않습니다.');
    }catch(error){setMessage(error instanceof Error?error.message:'이미지를 읽지 못했습니다.');}
  }
  return <section className="story-inputs" aria-label="시간 기반 콘티 미리보기">
    <h3>04 · 콘티 미리보기</h3>
    <p>샷별 참고 이미지와 소리를 시간순으로 확인합니다. AI 영상 생성이 아닙니다. 선택한 파일은 서버로 보내지 않으며 현재 탭에서만 사용합니다. 작업 JSON에는 이미지·음원이 포함되지 않습니다.</p>
    <fieldset disabled={exporting || disabled}>
    <div className="animatic-screen">
      {/* Local validated raster blobs; no remote URLs or executable SVG. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {images[shot.index] && <img src={images[shot.index]} alt={`샷 ${shot.index} 참고 이미지`} />}
      <div><strong>SHOT {shot.index} · {shot.start}–{shot.start+shot.duration}초</strong><p>{shot.visual}</p><small>{shot.camera}</small></div>
    </div>
    <div className="tools-actions"><button onClick={()=>{
      if(playing){pause();return;}
      const start=time>=duration?0:time;origin.current={clock:performance.now(),time:start};setTime(start);setPlaying(true);
    }}>{playing?'일시 정지':'콘티 재생'}</button><button onClick={()=>seek(0)}>처음으로</button><output aria-label="콘티 재생 시간">{time.toFixed(1)} / {duration}초</output></div>
    <label className="tool-field">재생 위치<input type="range" min={0} max={duration} step={0.1} value={time} onChange={e=>seek(Number(e.target.value))}/></label>
    <div className="animatic-strip">{shots.map(s=><button key={s.index} aria-pressed={shot.index===s.index} onClick={()=>seek(s.start)}>샷 {s.index}<br/>{s.duration}초</button>)}</div>
    <label className="tool-field">현재 샷 {shot.index} 참고 이미지<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{void selectImage(shot.index,e.target.files?.[0]);e.target.value='';}}/></label>
    <label className="tool-field">내 음원 배치 · 30MB 이하<input type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/ogg,audio/mp4,audio/webm" onChange={e=>{
      const file=e.target.files?.[0];e.target.value='';if(!file)return;pause();
      if(!['audio/mpeg','audio/wav','audio/x-wav','audio/ogg','audio/mp4','audio/webm'].includes(file.type)||file.size>30*1024*1024){setMessage('지원하는 음원 파일 30MB 이하를 선택해주세요.');return;}
      if(audioUrl){URL.revokeObjectURL(audioUrl);urls.current.delete(audioUrl);}
      const url=URL.createObjectURL(file);urls.current.add(url);soundFile.current=file;setAudioUrl(url);setAudioName(file.name);
    }}/></label>
    {audioUrl && <><p>{audioName}</p><audio ref={audio} src={audioUrl} preload="metadata" onLoadedMetadata={()=>{if(audio.current)audio.current.volume=volume;}} onError={()=>{pause();setMessage('이 음원은 브라우저에서 해독할 수 없습니다. 다른 파일을 선택해주세요.');}}/><label className="tool-field">음원 시작 시점<input type="number" min={0} max={duration} value={offset} onChange={e=>{pause();setOffset(Math.min(duration,Math.max(0,Number(e.target.value)||0)));}}/></label><label className="tool-field">음량<input type="range" min={0} max={1} step={0.05} value={volume} onChange={e=>{const v=Number(e.target.value);setVolume(v);if(audio.current)audio.current.volume=v;}}/></label></>}
    </fieldset>
    <p>영상 저장은 전체 길이만큼 걸립니다. 완료할 때까지 이 탭을 유지해주세요. 1280×720 콘티 영상에 참고 이미지·샷 설명·선택한 음원이 포함됩니다.</p>
    <button disabled={exporting || disabled} onClick={async()=>{
      pause();setExporting(true);setExportProgress(0);const task=new AbortController();exportTask.current=task;
      try{const {exportAnimatic}=await import('./animatic-export');const result=await exportAnimatic(shots,images,soundFile.current,offset,volume,task.signal,v=>{if(mounted.current)setExportProgress(v);});if(mounted.current){downloadFile(result.blob,`bottopia-animatic.${result.extension}`);setMessage('영상 다운로드를 요청했습니다. 저장된 파일을 확인해주세요.');}}
      catch(error){if(mounted.current)setMessage(error instanceof Error?error.message:'영상 저장에 실패했습니다.');}
      finally{if(mounted.current)setExporting(false);exportTask.current=null;}
    }}>콘티 영상 내려받기</button>
    {exporting && <div><progress max={1} value={exportProgress} aria-label="콘티 영상 저장 진행률"/><button onClick={()=>exportTask.current?.abort()}>영상 저장 취소</button></div>}
    <p className="tool-status" role="status">{message}</p>
  </section>;
}
