'use client';
import {useEffect,useRef,useState} from 'react';
import {creatorCredit,mockupSizes,type MockupTemplate} from '../../lib/promotion-mockup';
import {drawMockup} from './mockup-canvas';
import {downloadFile} from './download';

export default function PromotionMockup(){
  const [template,setTemplate]=useState<MockupTemplate>('poster');
  const [title,setTitle]=useState(''),[creator,setCreator]=useState(''),[handle,setHandle]=useState('');
  const [image,setImage]=useState<ImageBitmap|null>(null),[message,setMessage]=useState('');
  const [loading,setLoading]=useState(false);
  const canvas=useRef<HTMLCanvasElement>(null),bitmap=useRef<ImageBitmap|null>(null),epoch=useRef(0);
  const changed=useRef(false);
  let credit='',invalid='';try{credit=creatorCredit(handle);}catch(error){invalid=error instanceof Error?error.message:'주소를 확인해주세요.';}
  useEffect(()=>{if(canvas.current)drawMockup(canvas.current,template,image,title,creator,credit);},[template,image,title,creator,credit]);
  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{if(changed.current){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',warn);
    // These refs track the latest asynchronous decode and bitmap, not DOM nodes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return()=>{epoch.current++;bitmap.current?.close();window.removeEventListener('beforeunload',warn);};
  },[]);
  async function load(file?:File){
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024){setMessage('PNG·JPEG·WebP 이미지 10MB 이하를 선택해주세요.');return;}
    const id=++epoch.current;setLoading(true);
    try{const next=await createImageBitmap(file);if(id!==epoch.current){next.close();return;}if(next.width*next.height>16000000){next.close();throw new Error('이미지는 1,600만 화소 이하로 줄여주세요.');}bitmap.current?.close();bitmap.current=next;setImage(next);changed.current=true;setMessage('이미지를 불러왔습니다. 공개 게시 없이 이 기기에서만 편집합니다.');}
    catch(error){if(id===epoch.current)setMessage(error instanceof Error?error.message:'이미지를 읽지 못했습니다.');}
    finally{if(id===epoch.current)setLoading(false);}
  }
  return <section className="story-inputs" aria-label="작품 홍보 목업">
    <h2>작품을 소개하는 한 장</h2>
    <p>봇토피아 자체 제작 레이아웃에 내 작품을 배치합니다. AI 생성·자동 게시가 아니며 이미지와 입력 내용은 서버에 보내지 않습니다. 사용할 권리가 있는 작품만 선택해주세요.</p>
    <div className="tools-columns"><div className="mockup-fields">
      <label className="tool-field">작품 이미지 · 10MB 이하<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{void load(e.target.files?.[0]);e.target.value='';}}/></label>
      <label className="tool-field">레이아웃<select value={template} onChange={e=>{setTemplate(e.target.value as MockupTemplate);changed.current=true;}}><option value="poster">전시 포스터 · 4:5</option><option value="gallery">갤러리 액자 · 16:10</option><option value="social">피드 카드 · 1:1</option></select></label>
      <label className="tool-field">작품 제목<input maxLength={60} value={title} onChange={e=>{setTitle(e.target.value);changed.current=true;}}/></label>
      <label className="tool-field">크리에이터 이름<input maxLength={40} value={creator} onChange={e=>{setCreator(e.target.value);changed.current=true;}}/></label>
      <label className="tool-field">프로필 주소 끝부분 · 선택<input maxLength={30} value={handle} placeholder="예: bottopia" aria-invalid={!!invalid} onChange={e=>{setHandle(e.target.value);changed.current=true;}}/></label>
      <p>입력한 프로필 경로를 이미지에 문자로 표시합니다. 실제 프로필이 존재하는지 직접 확인해주세요.</p>
      {invalid && <p role="status">{invalid}</p>}
      <button className="tool-primary" disabled={!image||loading||!!invalid} onClick={()=>canvas.current?.toBlob(blob=>{if(blob){downloadFile(blob,`bottopia-${template}.png`);setMessage('PNG 다운로드를 요청했습니다. 파일을 확인해주세요.');}else setMessage('이미지를 저장하지 못했습니다.');},'image/png')}>PNG 내려받기 · {mockupSizes[template].join(' × ')}</button>
      <p>레이아웃은 무료로 재사용할 수 있습니다. 선택한 작품의 권리는 원작자에게 있으며, 이 도구 사용으로 봇토피아에 양도되지 않습니다.</p>
    </div><div><canvas ref={canvas} className="mockup-canvas" aria-label="홍보 목업 미리보기"/><p>탭을 닫기 전에 PNG를 저장해주세요. 원본 편집 상태는 현재 탭에만 남습니다.</p></div></div>
    <p className="tool-status" role="status">{loading?'이미지를 준비하는 중입니다.':message}</p>
  </section>;
}
