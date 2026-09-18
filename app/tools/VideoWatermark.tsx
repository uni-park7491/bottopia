'use client';
import { useEffect, useRef, useState } from 'react';
import { downloadFile } from './download';
import { watermarkCanvasFont, type WatermarkFont } from './watermark-fonts';

export default function VideoWatermark({ text,position,size,opacity,color,fontChoice,fontReady }: {fontChoice:WatermarkFont;fontReady:boolean;text:string;position:string;size:number;opacity:number;color:string}) {
  const video=useRef<HTMLVideoElement>(null), canvas=useRef<HTMLCanvasElement>(null), url=useRef('');
  const recorder=useRef<MediaRecorder|null>(null), frame=useRef(0), cleanup=useRef<(()=>void)|null>(null), cancelled=useRef(false);
  const audio=useRef<AudioContext|null>(null), audioSource=useRef<MediaElementAudioSourceNode|null>(null);
  const running=useRef(false), failure=useRef('');
  const [ready,setReady]=useState(false), [busy,setBusy]=useState(false), [status,setStatus]=useState(''), [duration,setDuration]=useState(0);
  function draw() {
    const c=canvas.current,v=video.current,ctx=c?.getContext('2d'); if(!c||!v||!ctx||v.readyState<2) return;
    ctx.drawImage(v,0,0,c.width,c.height);
    if(!fontReady) return;
    const margin=Math.min(c.width,c.height)*.035,font=Math.max(12,c.width*size/100/Math.max(3,text.length*.6));
    ctx.save();ctx.font=watermarkCanvasFont(fontChoice,font);ctx.globalAlpha=opacity/100;ctx.fillStyle=color;ctx.textBaseline='top';ctx.shadowColor='#0008';ctx.shadowBlur=font*.12;
    const w=Math.min(ctx.measureText(text).width,c.width-2*margin),h=font*1.2;
    const x=position.includes('left')?margin:position.includes('right')?c.width-margin-w:(c.width-w)/2;
    const y=position.includes('top')?margin:position.includes('bottom')?c.height-margin-h:(c.height-h)/2;
    ctx.fillText(text,x,y,c.width-2*margin);ctx.restore();
  }
  const drawRef=useRef(draw);
  useEffect(()=>{drawRef.current=draw;if(!running.current)draw();});
  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{if(running.current){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[]);
  useEffect(()=>()=>{cancelled.current=true; if(recorder.current?.state==='recording')recorder.current.stop();cleanup.current?.();if(url.current)URL.revokeObjectURL(url.current);void audio.current?.close();},[]);
  function load(file:File|undefined) {
    if(!file||busy)return;
    if(!['video/mp4','video/webm','video/quicktime'].includes(file.type)||file.size>100*1024*1024){setStatus('MP4·WebM·MOV 파일, 최대 100 MB를 선택해주세요.');return;}
    if(url.current)URL.revokeObjectURL(url.current);
    url.current=URL.createObjectURL(file);setReady(false);setStatus('영상 정보를 확인하고 있습니다.');
    if(video.current){video.current.src=url.current;video.current.load();}
  }
  async function exportVideo() {
    const v=video.current,c=canvas.current;if(!v||!c||running.current||!ready||!fontReady||!text.trim())return;
    if(!window.MediaRecorder||!c.captureStream){setStatus('이 브라우저는 영상 저장을 지원하지 않습니다. 최신 데스크톱 Chrome·Edge에서 사용해주세요.');return;}
    const mime=['video/mp4;codecs=avc1,mp4a.40.2','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
    if(!mime){setStatus('지원하는 영상 저장 형식이 없습니다.');return;}
    running.current=true;setBusy(true);cancelled.current=false;failure.current='';
    let timeout:ReturnType<typeof setTimeout>|undefined;
    try {
      if(!audio.current){audio.current=new AudioContext();audioSource.current=audio.current.createMediaElementSource(v);}
      await audio.current.resume();
      const dest=audio.current.createMediaStreamDestination();audioSource.current!.connect(dest);
      const stream=c.captureStream(30);dest.stream.getAudioTracks().forEach(track=>stream.addTrack(track));
      cleanup.current=()=>{running.current=false;cancelAnimationFrame(frame.current);if(timeout)clearTimeout(timeout);v.pause();stream.getTracks().forEach(track=>track.stop());audioSource.current?.disconnect();v.onended=null;v.onerror=null;};
      const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6000000});recorder.current=rec;const chunks:Blob[]=[];
      rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      rec.onstop=()=>{cleanup.current?.();cleanup.current=null;setBusy(false);if(cancelled.current){setStatus(failure.current||'저장을 중단했습니다. 원본은 변경되지 않습니다.');return;}const blob=new Blob(chunks,{type:mime});if(!blob.size){setStatus('영상 저장에 실패했습니다.');return;}downloadFile(blob,`bottopia-watermark.${mime.startsWith('video/mp4')?'mp4':'webm'}`);setStatus('영상 다운로드를 요청했습니다. 원본 음성 트랙과 워터마크를 확인해주세요.');};
      const abort=()=>{failure.current='영상 처리에 실패하거나 제한 시간을 초과했습니다. 다시 시도해주세요.';cancelled.current=true;if(rec.state==='recording')rec.stop();};
      rec.onerror=abort;v.onerror=abort;v.onended=()=>{if(rec.state==='recording')rec.stop();};
      v.currentTime=0;
      await new Promise<void>((resolve,reject)=>{if(!v.seeking){resolve();return;}const fail=setTimeout(()=>reject(new Error('seek')),5000);v.addEventListener('seeked',()=>{clearTimeout(fail);resolve();},{once:true});});
      if(cancelled.current){cleanup.current?.();setBusy(false);return;}
      const render=drawRef.current;
      const tick=()=>{render();frame.current=requestAnimationFrame(tick);};tick();
      rec.start(1000);await v.play();
      setStatus(`${mime.startsWith('video/mp4')?'MP4':'WebM'} 저장 중 · 약 ${Math.ceil(duration)}초. 탭을 전면에 유지해주세요.`);
      timeout=setTimeout(abort,(duration+15)*1000);
    } catch {running.current=false;failure.current='영상 저장을 시작하지 못했습니다. 재생 가능한 MP4로 다시 시도해주세요.';cancelled.current=true;if(recorder.current?.state==='recording')recorder.current.stop();cleanup.current?.();setBusy(false);setStatus(failure.current);}
  }
  return <section className="utility-panel video-watermark"><h3>영상에 반투명 문구 넣기</h3><p>위에서 지정한 문구·글꼴·위치·크기·불투명도를 사용합니다. 영상에는 문구 워터마크를 적용합니다.</p>
    <label className="tool-drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();load(e.dataTransfer.files[0]);}}>영상 선택 또는 끌어놓기<input type="file" accept="video/mp4,video/webm,video/quicktime" disabled={busy} onChange={e=>load(e.target.files?.[0])}/><small>최대 100 MB · 2분 · 긴 변 최대 1920 px / 30 fps로 저장</small></label>
    <video ref={video} playsInline preload="auto" hidden onLoadedData={()=>{const v=video.current!,c=canvas.current!;if(!Number.isFinite(v.duration)||v.duration<=0||v.duration>120){setReady(false);setStatus('2분 이하의 영상을 선택해주세요.');return;}const scale=Math.min(1,1920/Math.max(v.videoWidth,v.videoHeight));c.width=Math.max(2,Math.round(v.videoWidth*scale/2)*2);c.height=Math.max(2,Math.round(v.videoHeight*scale/2)*2);setDuration(v.duration);setReady(true);setStatus('준비되었습니다. 아래 미리보기에서 워터마크를 확인하세요.');drawRef.current();}} onError={()=>{setReady(false);setStatus('이 브라우저에서 재생할 수 없는 영상입니다. MP4로 변환 후 시도해주세요.');}} />
    <canvas ref={canvas} hidden={!ready} aria-label="영상 워터마크 미리보기"/>
    <div className="tools-actions"><button className="tool-primary" disabled={!ready||!fontReady||busy||!text.trim()} onClick={exportVideo}>워터마크 영상 저장</button>{busy&&<button onClick={()=>{cancelled.current=true;if(recorder.current?.state==='recording')recorder.current.stop();}}>저장 중단</button>}</div><p role="status">{status}</p>
    <p className="tool-help">원본 음성을 함께 기록합니다. 브라우저에 따라 MP4 또는 WebM으로 저장하며 재인코딩으로 화질이 달라질 수 있습니다. 처리에는 영상 길이만큼 시간이 필요합니다. 저장 중에는 다른 탭으로 이동하거나 기기를 잠그지 마세요.</p>
  </section>;
}
