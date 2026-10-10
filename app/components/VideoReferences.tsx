'use client';
import {useEffect,useMemo,useState} from 'react';
import type {VideoReference} from '../../lib/video-references';
import {genreLabel,workGenres,matchesVideoFilters} from '../../lib/work-genres';
import {copyText} from '../../lib/clipboard';
import type {Locale} from '../i18n';
import {loadMemberPrompt,memberPromptNotice} from '../../lib/member-prompt';

export default function VideoReferences({locale}:{locale:Locale}) {
  const [videoReferences,setReferences]=useState<VideoReference[]>([]);
  const [loading,setLoading]=useState(true);
  const [loadFailed,setLoadFailed]=useState(false);
  useEffect(()=>{let live=true;fetch('/api/video-references').then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{if(live)setReferences(data.references);}).catch(()=>{if(live)setLoadFailed(true);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[]);
  const [genre,setGenre]=useState('ALL');
  const [model,setModel]=useState('ALL');
  const [duration,setDuration]=useState<'ALL'|'15'|'30'>('ALL');
  const [region,setRegion]=useState('ALL');
  const [copied,setCopied]=useState('');
  const [error,setError]=useState('');
  const ko=locale==='ko';
  const models=[...new Set(videoReferences.map(item=>item.model))];
  const visible=useMemo(()=>[...videoReferences].sort((a,b)=>(b.publishedAt?Date.parse(b.publishedAt):0)-(a.publishedAt?Date.parse(a.publishedAt):0)).filter(item=>(genre==='ALL'||item.category===genre)&&(region==='ALL'||item.region===region)&&matchesVideoFilters(item,{model,duration})),[videoReferences,genre,model,duration,region]);
  async function copyPrompt(item:VideoReference){
    setError('');
    try {
      const content=await loadMemberPrompt(`/api/video-references/${encodeURIComponent(item.id)}/prompt`,locale);
      if(!content)return;
      setReferences(current=>current.map(row=>row.id===item.id?{...row,prompt:content.prompt}:row));
      if(await copyText(content.prompt))setCopied(item.id);else setError(item.id);
    }catch{setError(item.id);}
  }
  return <div className="reference-archive">
    <div className="reference-intro"><p>{ko?'국내외 제작자의 원본 영상으로 연결합니다. 프롬프트는 봇토피아가 재구성한 예시이며 원작자의 실제 입력문이 아닙니다.':'Source-linked creator videos. Prompts are BOTTOPIA adaptations, not the original generation prompts.'}</p><span>{ko?'게시일 최신순 · 날짜 미확인은 마지막':'Newest published first · unknown dates last'}</span></div>
    <div className="feed-filters" aria-label={ko?'레퍼런스 장르':'Reference genres'}><button aria-pressed={genre==='ALL'} onClick={()=>setGenre('ALL')}>{ko?'전체':'All'}</button>{workGenres.slice(0,13).map(item=><button key={item[0]} aria-pressed={genre===item[0]} onClick={()=>setGenre(item[0])}>{genreLabel(item[0],locale)}</button>)}</div>
    <div className="video-filter-row">
      <label>{ko?'모델':'Model'}<select value={model} onChange={e=>setModel(e.target.value)}><option value="ALL">{ko?'전체 모델':'All models'}</option>{models.map(value=><option key={value}>{value}</option>)}</select></label>
      <label>{ko?'길이':'Duration'}<select value={duration} onChange={e=>setDuration(e.target.value as typeof duration)}><option value="ALL">{ko?'전체 길이':'All lengths'}</option><option value="15">15 {ko?'초':'sec'}</option><option value="30">30 {ko?'초':'sec'}</option></select></label>
      <label>{ko?'지역':'Region'}<select value={region} onChange={e=>setRegion(e.target.value)}><option value="ALL">{ko?'국내·해외':'All regions'}</option><option value="국내">{ko?'국내':'Korea'}</option><option value="해외">{ko?'해외':'International'}</option></select></label><span>{visible.length} {ko?'개':'references'}</span>
    </div>
    {loading?<p role="status">{ko?'레퍼런스 불러오는 중…':'Loading references…'}</p>:loadFailed?<p role="alert">{ko?'레퍼런스를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.':'Unable to load references. Refresh to retry.'}</p>:visible.length ? <div className="reference-grid">{visible.map(item=><article className="reference-card" key={item.id}>
      <a className="reference-source-cover" href={item.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} · ${ko?'원본 영상 보기':'View source video'}`}><span>{genreLabel(item.category,locale)}</span><strong>{item.durationSeconds}<small> SEC</small></strong><span>{ko?'원본 영상 보기 ↗':'Watch at source ↗'}</span></a>
      <div className="reference-card-copy"><div className="reference-tags"><span>{item.model}</span><span>{ko?item.region:item.region==='국내'?'Korea':'International'}</span></div><h3>{item.title}</h3><p>{item.summary}</p><a className="reference-credit" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{ko?'출처':'Source'} · {item.author} ↗</a><small className="reference-date">{item.publishedAt??(ko?'게시일 미확인':'Publication date unverified')}</small>
      <details><summary>{ko?'재구성 프롬프트':'Adapted prompt'} <span>+</span></summary><p>{item.prompt||memberPromptNotice[locale]}</p><button onClick={()=>copyPrompt(item)}>{copied===item.id?(ko?'복사 완료':'Copied'):(ko?'프롬프트 복사':'Copy prompt')}</button>{error===item.id&&<p role="alert">{ko?'프롬프트를 가져오거나 복사하지 못했습니다. 다시 시도해주세요.':'Unable to load or copy the prompt. Please retry.'}</p>}</details>
      <details className="reference-evidence"><summary>{ko?'확인 정보':'Verification notes'}</summary><p>{item.evidence}</p></details></div>
    </article>)}</div>:<div className="archive-empty"><h3>{ko?'이 조건으로 확인된 자료가 없습니다.':'No verified references for these filters.'}</h3><button onClick={()=>{setGenre('ALL');setModel('ALL');setDuration('ALL');setRegion('ALL');}}>{ko?'필터 초기화':'Reset filters'}</button></div>}
  </div>;
}
