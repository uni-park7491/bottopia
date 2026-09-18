'use client';
import {useRef,useState,type FormEvent} from 'react';
import {feedbackTools} from '../../../lib/tool-feedback';
type Item={id:string;name:string;contact:string;timeline_budget:string;brief:string;created_at:string};
export default function ToolFeedback({owner}:{owner:boolean}){
  const [tool,setTool]=useState('audio'),[title,setTitle]=useState(''),[message,setMessage]=useState('');
  const [status,setStatus]=useState(''),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
  const submitting=useRef(false);
  const [items,setItems]=useState<Item[]>([]),[page,setPage]=useState(0),[hasMore,setHasMore]=useState(false),[loaded,setLoaded]=useState(false),[loading,setLoading]=useState(false),[inboxError,setInboxError]=useState('');
  const inboxRequest=useRef(0);
  async function submit(e:FormEvent){
    e.preventDefault();if(submitting.current)return;submitting.current=true;setBusy(true);setFailed(false);setStatus('보내는 중…');
    try{
      const response=await fetch('/api/tools/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tool,title,message}),signal:AbortSignal.timeout(15000)});
      const data=await response.json();if(!response.ok)throw Error(data.error||'저장하지 못했습니다.');
      setTitle('');setMessage('');setStatus('피드백을 보냈습니다. 운영자에게만 전달됩니다.');
    }catch(e){setFailed(true);setStatus(e instanceof Error&&e.name==='TimeoutError'?'응답을 확인하지 못했습니다. 중복 제출에 주의해주세요.':e instanceof Error?e.message:'전송에 실패했습니다. 작성 내용은 유지됩니다.');}
    finally{submitting.current=false;setBusy(false);}
  }
  async function loadPage(next:number){
    const request=++inboxRequest.current;setLoading(true);setInboxError('');
    try{
      const response=await fetch(`/api/tools/feedback?page=${next}`,{cache:'no-store',signal:AbortSignal.timeout(15000)});
      const data=await response.json();if(!response.ok)throw Error(data.error||'조회 실패');
      if(request!==inboxRequest.current)return;
      setItems(data.items);setPage(next);setHasMore(data.hasMore);setLoaded(true);
    }catch(e){if(request===inboxRequest.current){setItems([]);setLoaded(false);setInboxError(e instanceof Error?e.message:'조회 실패');}}
    finally{if(request===inboxRequest.current)setLoading(false);}
  }
  return <>
    <form className="utility-panel tool-feedback-form" onSubmit={submit}>
      <fieldset disabled={busy}>
        <label className="tool-field">도구<select value={tool} onChange={e=>setTool(e.target.value)}>{Object.entries(feedbackTools).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
        <label className="tool-field">제목<input required minLength={2} maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="어떤 부분을 개선하면 좋을까요?"/></label>
        <label className="tool-field">내용<textarea required minLength={10} maxLength={3000} rows={5} value={message} onChange={e=>setMessage(e.target.value)} placeholder="사용한 모델·기기, 어떤 동작에서 문제가 생겼는지 알려주세요."/><span className="tool-help">{message.length.toLocaleString()} / 3,000자</span></label>
        <p className="tool-help">연결 코드·비밀번호·민감한 개인정보는 적지 마세요. 내용과 작성자 계정 ID를 운영자가 확인하며, 다른 회원에게는 공개되지 않습니다.</p>
        <button type="submit" className="tool-primary">{busy?'보내는 중…':'비공개로 보내기'}</button>
      </fieldset><p role={failed?'alert':'status'}>{status}</p>
    </form>
    {owner&&<section className="utility-panel feedback-inbox" aria-label="운영자 피드백 보관함"><header><h2>운영자 보관함</h2><button type="button" disabled={loading} onClick={()=>void loadPage(0)}>{loading?'불러오는 중…':loaded?'새로고침':'접수된 피드백 보기'}</button></header>
      {inboxError&&<p role="alert">{inboxError}</p>}
      {loaded&&!items.length&&<p>접수된 피드백이 없습니다.</p>}
      {items.map(item=><article key={item.id}><div className="feedback-item-meta"><span>{feedbackTools[item.timeline_budget as keyof typeof feedbackTools]||'기타'}</span><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString('ko-KR')}</time></div><h3>{item.name}</h3><p className="feedback-message">{item.brief}</p><details><summary>작성자 계정 ID</summary><code>{item.contact}</code></details></article>)}
      {loaded&&<nav className="tools-actions" aria-label="피드백 페이지"><button disabled={loading||page===0} onClick={()=>void loadPage(page-1)}>이전</button><span>{page+1}페이지</span><button disabled={loading||!hasMore} onClick={()=>void loadPage(page+1)}>다음</button></nav>}
    </section>}
  </>;
}
