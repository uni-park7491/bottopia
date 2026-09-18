'use client';
import { useEffect, useRef, useState } from 'react';
import { audioHistory, type SavedAudio } from './audio-history';
import { downloadFile } from './download';
import { ttsModels } from './tts-models';
type Audio = Omit<SavedAudio,'id'|'owner'|'at'> & {url:string};
export default function AudioHistory({owner,result,onSelect}:{owner:string;result:Audio|null;onSelect:(audio:SavedAudio)=>void}) {
  const [rows,setRows]=useState<SavedAudio[]>([]), [message,setMessage]=useState('기록을 불러오는 중…');
  const saved=useRef(new WeakMap<Blob,string>());
  useEffect(()=>{
    let active=true;
    let record:SavedAudio|undefined;
    if(result) {
      let id=saved.current.get(result.blob);
      if(!id) {id=crypto.randomUUID(); saved.current.set(result.blob,id);}
      record={id,owner,at:Date.now(),blob:result.blob,seconds:result.seconds,text:result.text,voice:result.voice,engine:result.engine,language:result.language};
    }
    audioHistory(owner,record?'save':'list',record).then(items=>{if(active){setRows(items);setMessage(record?'이 브라우저에 저장했습니다.':'');}}).catch(()=>{if(active)setMessage('기록 저장소를 사용할 수 없거나 용량이 찼습니다. 현재 음성을 직접 내려받아 보관하세요.');});
    return()=>{active=false;};
  },[owner,result]);
  async function remove(id:string) {
    if(!window.confirm('이 음성 기록을 삭제할까요? 내려받은 파일은 유지됩니다.'))return;
    try {setRows(await audioHistory(owner,'delete',id));setMessage('기록을 삭제했습니다.');} catch {setMessage('삭제하지 못했습니다. 다시 시도해주세요.');}
  }
  function select(row:SavedAudio) { saved.current.set(row.blob,row.id); onSelect(row); }
  return <section className="tts-history" aria-label="음성 생성 기록">
    <h3>생성 기록 <small>{rows.length}/50</small></h3>
    <p className="tool-help">이 계정의 기록을 현재 브라우저에 최대 50개·100MB 보관합니다. 서버 동기화는 없으며, 브라우저 데이터 삭제·비공개 모드 종료·저장 공간 정리 시 사라질 수 있습니다. 공용 기기에서는 사용 후 기록을 삭제하세요.</p>
    <p role="status">{message}</p>
    {!rows.length && <p>생성한 음성이 이곳에 쌓입니다.</p>}
    <div className="tts-history-list">{rows.map(row=><article key={row.id}>
      <p className="tts-history-title">{row.text}</p>
      <small>{new Date(row.at).toLocaleString('ko-KR')} · {ttsModels.find(model=>model.id===row.engine)?.name||row.engine} · {row.seconds.toFixed(1)}초</small>
      <div className="tools-actions"><button type="button" onClick={()=>select(row)}>재생·MP3 저장</button><button type="button" onClick={()=>downloadFile(row.blob,`bottopia-${row.at}.wav`)}>WAV 저장</button><button type="button" onClick={()=>remove(row.id)}>삭제</button></div>
    </article>)}</div>
  </section>;
}
