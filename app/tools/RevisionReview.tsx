'use client';
import { revisionDiff } from '../../lib/story-revision';

export default function RevisionReview({before,after,accept,discard}:{before:string;after:string;accept:()=>void;discard:()=>void}) {
  const changes=revisionDiff(before,after);
  return <section className="story-inputs" aria-label="시나리오 수정안 비교">
    <h3>수정안을 확인해주세요</h3>
    <p>기존 시나리오는 아직 바뀌지 않았습니다. 인물의 행동·대사 주체와 결말을 확인한 뒤 반영하세요. 색상은 문장 변경만 표시하며 내용의 정확성을 보장하지 않습니다.</p>
    <div className="story-shots"><article><h4>현재 시나리오</h4><pre className="story-review-text">{before}</pre></article><article><h4>AI 제안</h4><pre className="story-review-text">{after}</pre></article></div>
    <details><summary>변경 문장 보기</summary><div className="story-review-text">{changes.map((line,i)=><div key={i} className={`revision-${line.kind}`}><span aria-label={line.kind==='removed'?'삭제':line.kind==='added'?'추가':'유지'}>{line.kind==='removed'?'− ':line.kind==='added'?'+ ':'  '}</span>{line.text || '\u00a0'}</div>)}</div></details>
    <div className="tools-actions"><button className="tool-primary" onClick={accept}>수정안 반영</button><button onClick={discard}>기존 시나리오 유지</button></div>
  </section>;
}
