'use client';
import {useRef,useState} from 'react';
import {getCountries,getCountryCallingCode} from 'libphonenumber-js';
import type {Contacts} from '../../lib/recruitment-private';
const countryNames=new Intl.DisplayNames(['ko'],{type:'region'});
const countries=getCountries().sort((a,b)=>a==='KR'?-1:b==='KR'?1:(countryNames.of(a)||a).localeCompare(countryNames.of(b)||b,'ko'));
export type PrivateFile={id:string;name:string;mime:string;size:number};
export type PrivateDraft={contacts:Contacts;files:PrivateFile[]};
export const emptyPrivate:PrivateDraft={contacts:{email:'',phone:'',country:'KR',kakao:''},files:[]};
export default function RecruitmentPrivateFields({value,onChange,onBusy,applicant=false}:{value:PrivateDraft;onChange:(value:PrivateDraft)=>void;onBusy:(busy:boolean)=>void;applicant?:boolean}){
 const [uploading,setUploading]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 const [stored,setStored]=useState<PrivateFile[]|null>(null);
 async function manage(){try{const r=await fetch('/api/community/files?mine=1',{cache:'no-store'});const j=await r.json();if(!r.ok)throw Error(j.error);setStored(j.files);}catch(e){setError(e instanceof Error?e.message:'파일 조회 실패');}}
 async function remove(file:PrivateFile){if(!window.confirm(`${file.name}을 저장소에서 영구 삭제할까요? 이 파일을 첨부한 모집글·지원서에서도 내려받을 수 없게 됩니다.`))return;setUploading(true);onBusy(true);try{const r=await fetch('/api/community/files?id='+file.id,{method:'DELETE'});const j=await r.json();if(!r.ok)throw Error(j.error);onChange({...value,files:value.files.filter(f=>f.id!==file.id)});await manage();}catch(e){setError(e instanceof Error?e.message:'삭제 실패');}finally{setUploading(false);onBusy(false);}}
 async function upload(files:FileList|null){
  if(!files?.length||lock.current)return;
  if(value.files.length+files.length>3){setError('최대 3개까지 첨부할 수 있습니다.');return;}
  lock.current=true;setUploading(true);onBusy(true);setError('');const added=[...value.files];
  try{for(const file of Array.from(files)){
   if(!['application/pdf','image/png'].includes(file.type)||file.size>3*1024*1024)throw Error('PDF·PNG, 파일당 최대 3MB만 가능합니다.');
   const r=await fetch('/api/community/files',{method:'POST',headers:{'Content-Type':file.type,'X-File-Name':encodeURIComponent(file.name)},body:file});const j=await r.json();if(!r.ok)throw Error(j.error);added.push(j.file);onChange({...value,files:[...added]});
  }}catch(e){setError(e instanceof Error?e.message:'업로드에 실패했습니다.');}finally{lock.current=false;setUploading(false);onBusy(false);}
 }
 return <fieldset className="guild-private-fields"><legend>비공개 자료 <span>작성자는 모든 입력칸을 볼 수 있습니다</span></legend>
  <p className="guild-help">연락처를 하나 이상 입력하세요. 여러 개를 함께 등록할 수 있습니다.</p>
  <div className="guild-contact-fields">
   <label>이메일<input type="email" maxLength={254} value={value.contacts.email} onChange={e=>onChange({...value,contacts:{...value.contacts,email:e.target.value}})} placeholder="name@example.com"/></label>
   <div className="guild-phone-row"><label>국가번호<select value={value.contacts.country} onChange={e=>onChange({...value,contacts:{...value.contacts,country:e.target.value}})}>{countries.map(c=><option value={c} key={c}>{countryNames.of(c)} +{getCountryCallingCode(c)}</option>)}</select></label><label>휴대폰 번호<input type="tel" maxLength={25} value={value.contacts.phone} onChange={e=>onChange({...value,contacts:{...value.contacts,phone:e.target.value}})} placeholder={value.contacts.country==='KR'?'010-0000-0000':'현지 휴대폰 번호'}/></label></div>
   <label>카카오톡 ID<input maxLength={50} value={value.contacts.kakao} onChange={e=>onChange({...value,contacts:{...value.contacts,kakao:e.target.value}})} placeholder="카카오톡 ID"/></label>
  </div>
  <label className="guild-file-box" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void upload(e.dataTransfer.files);}}><span>＋ 포트폴리오·이력서 첨부</span><small>{uploading?'업로드 중…':'PDF · PNG / 파일당 3MB · 최대 3개 / 클릭 또는 끌어놓기'}</small><input type="file" accept="application/pdf,image/png" multiple disabled={uploading} onChange={e=>{void upload(e.target.files);e.target.value='';}}/></label>
  <ul className="guild-file-list">{value.files.map(f=><li key={f.id}><span>{f.name} <small>({(f.size/1024).toFixed(0)}KB)</small></span><button type="button" disabled={uploading} className="guild-text-button" aria-label={`${f.name} 첨부 제외`} onClick={()=>onChange({...value,files:value.files.filter(v=>v.id!==f.id)})}>×</button></li>)}</ul>
  <button type="button" className="guild-text-button" onClick={()=>{if(stored)setStored(null);else void manage();}}>{stored?'파일 관리 접기':'내 저장 파일 관리'}</button>
  {stored&&<ul className="guild-file-list">{stored.length?stored.map(f=><li key={f.id}><span>{f.name}</span><button type="button" className="guild-text-button" disabled={uploading||value.files.length>=3||value.files.some(v=>v.id===f.id)} onClick={()=>onChange({...value,files:[...value.files,f]})}>첨부</button><button type="button" className="guild-text-button" disabled={uploading} onClick={()=>void remove(f)}>영구 삭제</button></li>):<li>저장된 파일이 없습니다.</li>}</ul>}
  <p className="guild-help">{applicant?'첨부자료는 해당 모집글 작성자와 본인만 볼 수 있습니다.':'첨부자료는 이 모집글에 지원한 회원과 본인만 볼 수 있습니다.'} 연락처는 모집 확정 후 해당 상대에게 공개됩니다. 파일 안에 연락처가 있으면 확정 전에도 보일 수 있으니 제거해 주세요.</p>
  <label className="guild-consent"><input type="checkbox" name="privacyConsent" required/> 위 대상에게 자료와 연락처를 표시하는 데 동의합니다.</label>
  {error&&<p role="alert" className="guild-help">{error}</p>}
 </fieldset>;
}
