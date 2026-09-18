'use client';
import { useEffect, useRef, useState } from 'react';
import { downloadFile } from './download';
import VideoWatermark from './VideoWatermark';
import { watermarkFonts, watermarkCanvasFont, loadWatermarkFont, type WatermarkFont } from './watermark-fonts';

export default function WatermarkTool() {
  const canvas = useRef<HTMLCanvasElement>(null), source = useRef<HTMLImageElement | null>(null), logo = useRef<HTMLImageElement | null>(null);
  const loadId = useRef(0), logoId = useRef(0);
  const [revision,setRevision] = useState(0), [ready,setReady] = useState(false), [text,setText] = useState('© BOTTOPIA');
  const [position,setPosition] = useState('bottom-right'), [size,setSize] = useState(15), [opacity,setOpacity] = useState(60), [color,setColor] = useState('#ffffff');
  const [status,setStatus] = useState(''), [hasLogo,setHasLogo] = useState(false);
  const [fontChoice,setFontChoice] = useState<WatermarkFont>(watermarkFonts[0]);
  const [loadedFont,setLoadedFont] = useState(''), [fontError,setFontError] = useState(false), [fontRetry,setFontRetry] = useState(0);
  const fontReady = loadedFont === fontChoice.id;
  useEffect(() => {
    let active = true;
    loadWatermarkFont(fontChoice).then(() => { if (active) setLoadedFont(fontChoice.id); })
      .catch(() => { if (active) setFontError(true); });
    return () => { active = false; };
  }, [fontChoice,fontRetry]);
  async function load(file:File|undefined, isLogo=false) {
    if (!file) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 50*1024*1024) { setStatus('PNG·JPEG·WebP 이미지, 최대 50 MB를 선택해주세요.'); return; }
    const id = isLogo ? ++logoId.current : ++loadId.current;
    const url = URL.createObjectURL(file), img = new Image();
    try {
      img.src = url; await img.decode();
      if (id !== (isLogo ? logoId.current : loadId.current)) return;
      if (img.naturalWidth * img.naturalHeight > 40000000) throw new Error('large');
      if (isLogo) { logo.current=img; setHasLogo(true); } else { source.current=img; setReady(true); }
      setRevision(n=>n+1); setStatus('이미지를 불러왔습니다. 원본은 변경되지 않습니다.');
    } catch { setStatus('이미지를 열 수 없습니다. 4천만 화소 이하의 이미지를 사용해주세요.'); }
    finally { URL.revokeObjectURL(url); }
  }
  useEffect(() => {
    const c=canvas.current, img=source.current;
    if (!c || !img) return;
    const scale=Math.min(1,4096/Math.max(img.naturalWidth,img.naturalHeight));
    c.width=Math.round(img.naturalWidth*scale); c.height=Math.round(img.naturalHeight*scale);
    const ctx=c.getContext('2d'); if (!ctx) return;
    ctx.drawImage(img,0,0,c.width,c.height);
    if (!hasLogo && !fontReady) return;
    const margin=Math.min(c.width,c.height)*.035, width=c.width*size/100;
    ctx.save(); ctx.globalAlpha=opacity/100;
    const mark=hasLogo ? logo.current : null;
    const font=Math.max(10,width/Math.max(3,text.length*.6));
    ctx.font=watermarkCanvasFont(fontChoice,font);
    let w=mark ? width : ctx.measureText(text).width, h=mark ? width*mark.naturalHeight/mark.naturalWidth : font*1.2;
    const fit=Math.min(1,(c.width-2*margin)/Math.max(1,w),(c.height-2*margin)/Math.max(1,h)); w*=fit; h*=fit;
    const x=position.includes('left') ? margin : position.includes('right') ? c.width-margin-w : (c.width-w)/2;
    const y=position.includes('top') ? margin : position.includes('bottom') ? c.height-margin-h : (c.height-h)/2;
    if (mark) ctx.drawImage(mark,x,y,w,h);
    else { ctx.font=watermarkCanvasFont(fontChoice,font*fit); ctx.textBaseline='top'; ctx.fillStyle=color; ctx.shadowColor='#0008'; ctx.shadowBlur=font*.12; ctx.fillText(text,x,y); }
    ctx.restore();
  },[revision,text,position,size,opacity,color,hasLogo,fontChoice,fontReady]);
  return <section className="utility-tool"><header className="tool-section-head"><div><p className="story-beta">MARK YOUR WORK</p><h2>작품에 나만의 서명을.</h2><p>문구 또는 로고를 이미지 위에 삽입합니다. 파일은 서버에 전송하지 않습니다.</p></div></header><div className="utility-grid"><div className="utility-panel">
    <label className="tool-drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault(); void load(e.dataTransfer.files[0]);}}>이미지를 끌어놓거나 선택하세요<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void load(e.target.files?.[0])} /><small>PNG · JPEG · WebP / 최대 50 MB</small></label>
    <label className="tool-field">워터마크 문구<input maxLength={80} value={text} onChange={e=>setText(e.target.value)} /></label>
    <label className="tool-field compact-field">글꼴<select value={fontChoice.id} onChange={e=>{setLoadedFont('');setFontError(false);setFontChoice(watermarkFonts.find(f=>f.id===e.target.value)!);}}>{watermarkFonts.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select></label>
    <div className="watermark-font-sample" aria-live="polite">
      {fontReady ? <span style={{fontFamily:fontChoice.family,fontWeight:Number(fontChoice.weight)}}>{text || '나만의 서명 · My signature'}</span> : fontError ? <span>글꼴을 불러오지 못했습니다. <button onClick={()=>{setFontError(false);setFontRetry(n=>n+1);}}>다시 시도</button></span> : '글꼴 불러오는 중…'}
    </div>
    <p className="tool-help">한글·영문 지원 · 상업적 결과물 사용 가능 · <a href={`/fonts/watermark/${fontChoice.license}-OFL.txt`} target="_blank" rel="noreferrer">글꼴 라이선스</a></p>
    <label className="tool-field">로고 이미지 (선택)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void load(e.target.files?.[0],true)} /></label>
    {hasLogo && <button onClick={()=>{logo.current=null;setHasLogo(false);}}>로고 대신 문구 사용</button>}
    <label className="tool-field compact-field">삽입 위치<select value={position} onChange={e=>setPosition(e.target.value)}>{[['top-left','왼쪽 위'],['top-right','오른쪽 위'],['center','가운데'],['bottom-left','왼쪽 아래'],['bottom-right','오른쪽 아래']].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <label className="tool-field">크기 · 이미지 너비의 {size}%<input type="range" min="5" max="60" value={size} onChange={e=>setSize(Number(e.target.value))} /></label>
    <label className="tool-field">불투명도 · {opacity}%<input type="range" min="5" max="100" value={opacity} onChange={e=>setOpacity(Number(e.target.value))} /></label>
    {!hasLogo && <label className="tool-field compact-field">문구 색상<input type="color" value={color} onChange={e=>setColor(e.target.value)} /></label>}
    <button className="tool-primary" disabled={!ready || (!hasLogo && (!fontReady || !text.trim()))} onClick={()=>canvas.current?.toBlob(blob=>{if(blob) {downloadFile(blob,'bottopia-watermark.png');setStatus('PNG 다운로드를 요청했습니다.');} else setStatus('저장에 실패했습니다.');},'image/png')}>워터마크 PNG 저장</button><p role="status">{status}</p>
    <p className="tool-help">최대 긴 변 4096 px로 저장합니다. 워터마크는 복제 방지를 보장하지 않습니다.</p>
  </div><div className="utility-panel watermark-preview">{!ready && <div className="utility-empty">이미지를 넣으면 위치·크기·투명도를 바로 확인할 수 있습니다.</div>}<canvas ref={canvas} hidden={!ready} aria-label="워터마크 적용 미리보기" /></div></div><VideoWatermark fontChoice={fontChoice} fontReady={fontReady} text={text} position={position} size={size} opacity={opacity} color={color}/></section>;
}
