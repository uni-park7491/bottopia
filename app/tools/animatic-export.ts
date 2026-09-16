import type {StoryShot} from '../../lib/story-builder';
import {activeShot,timelineDuration} from '../../lib/animatic.ts';

export async function exportAnimatic(shots:StoryShot[],images:Record<number,string>,audioFile:File|null,offset:number,volume:number,signal:AbortSignal,onProgress:(value:number)=>void) {
  signal.throwIfAborted();
  const duration=timelineDuration(shots);
  if(!Number.isFinite(offset)||offset<0||offset>duration||!Number.isFinite(volume)||volume<0||volume>1)throw new Error('음원 시작 시점과 음량을 확인해주세요.');
  if(document.hidden)throw new Error('이 탭을 화면에 표시한 상태에서 영상 저장을 시작해주세요.');
  const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/mp4'].find(m=>typeof MediaRecorder!=='undefined'&&MediaRecorder.isTypeSupported(m));
  if(!mime || !HTMLCanvasElement.prototype.captureStream)throw new Error('이 브라우저는 로컬 영상 저장을 지원하지 않습니다. 데스크톱 Chrome에서 시도해주세요.');
  const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('영상 캔버스를 준비하지 못했습니다.');
  const pictures=new Map<number,HTMLImageElement>();
  for(const [id,url] of Object.entries(images)){
    if(!url.startsWith('blob:'))throw new Error('이 탭에서 선택한 이미지만 저장할 수 있습니다.');
    const img=new Image();img.src=url;await img.decode();signal.throwIfAborted();pictures.set(Number(id),img);
  }
  let audioContext:AudioContext|undefined, source:AudioBufferSourceNode|undefined;
  const stream=canvas.captureStream(30);
  try {
    if(audioFile){
      audioContext=new AudioContext();await audioContext.resume();
      const buffer=await audioContext.decodeAudioData(await audioFile.arrayBuffer());signal.throwIfAborted();
      const destination=audioContext.createMediaStreamDestination(),gain=audioContext.createGain();
      gain.gain.value=volume;source=audioContext.createBufferSource();source.buffer=buffer;source.connect(gain);gain.connect(destination);
      destination.stream.getAudioTracks().forEach(track=>stream.addTrack(track));
    }
    function draw(t:number){
      const s=shots[activeShot(shots,t)];
      ctx!.fillStyle='#211a35';ctx!.fillRect(0,0,1280,720);
      const img=pictures.get(s.index);
      if(img){const scale=Math.min(1280/img.naturalWidth,720/img.naturalHeight);const w=img.naturalWidth*scale,h=img.naturalHeight*scale;ctx!.drawImage(img,(1280-w)/2,(720-h)/2,w,h);}
      ctx!.fillStyle='rgba(0,0,0,.8)';ctx!.fillRect(0,480,1280,240);
      ctx!.fillStyle='#d8ff79';ctx!.font='bold 24px sans-serif';ctx!.fillText(`SHOT ${s.index}  ·  ${s.start}–${s.start+s.duration}s`,40,520);
      ctx!.fillStyle='#fff';ctx!.font='28px sans-serif';
      let line='',y=562;for(const letter of s.visual){if(ctx!.measureText(line+letter).width>1200){ctx!.fillText(line,40,y);line='';y+=38;if(y>650)break;}line+=letter;}if(y<=650)ctx!.fillText(line,40,y);
      ctx!.fillStyle='#c6bfd4';ctx!.font='18px sans-serif';ctx!.fillText(`BOTTOPIA · ANIMATIC  ${t.toFixed(1)} / ${duration}s`,40,696);
    }
    draw(0);signal.throwIfAborted();
    const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4000000});
    const blob=await new Promise<Blob>((resolve,reject)=>{
      const chunks:BlobPart[]=[];let frame=0,settled=false;const start=performance.now();
      const halt=(error:Error)=>{
        if(settled)return;settled=true;cleanup();
        try{if(recorder.state!=='inactive')recorder.stop();}catch{}
        reject(error);
      };
      const abort=()=>halt(new Error('영상 저장을 취소했습니다.'));
      const hidden=()=>{if(document.hidden)halt(new Error('다른 탭으로 이동해 영상 저장을 중단했습니다. 이 탭을 유지한 채 다시 시도해주세요.'));};
      signal.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',hidden);
      const cleanup=()=>{cancelAnimationFrame(frame);clearTimeout(deadline);signal.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',hidden);};
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onerror=()=>halt(new Error('영상을 인코딩하지 못했습니다.'));
      recorder.onstop=()=>{if(settled)return;settled=true;cleanup();if(!chunks.length)reject(new Error('영상 데이터가 생성되지 않았습니다. 다시 시도해주세요.'));else resolve(new Blob(chunks,{type:mime}));};
      const deadline=setTimeout(()=>halt(new Error('영상 저장 시간이 초과되었습니다.')), (duration+20)*1000);
      function tick(now:number){
        if(settled)return;
        try{const t=Math.min(duration,(now-start)/1000);draw(t);onProgress(t/duration);if(t>=duration){recorder.stop();return;}frame=requestAnimationFrame(tick);}
        catch(error){halt(error instanceof Error?error:new Error('영상 프레임을 만들지 못했습니다.'));}
      }
      try{signal.throwIfAborted();recorder.start(1000);source?.start(audioContext!.currentTime+offset);frame=requestAnimationFrame(tick);}
      catch(error){halt(error instanceof Error?error:new Error('영상 저장을 시작하지 못했습니다.'));}
    });
    return {blob,extension:mime.startsWith('video/mp4')?'mp4':'webm'};
  } finally {try{source?.stop();}catch{}stream.getTracks().forEach(t=>t.stop());try{await audioContext?.close();}catch{}}
}
