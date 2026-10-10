export type VideoReference = {
  id:string; title:string; summary:string; category:string; tool:string; model:string;
  durationSeconds:15|30; author:string; sourceUrl:string; publishedAt:string|null;
  region:'국내'|'해외'; evidence:string; prompt:string;
};
// Withdrawn at the owner's request. Do not publish fabricated/adapted examples.
export const videoReferences: VideoReference[] = [];
export function latestReferences(items: VideoReference[]): VideoReference[] {
  return [...items].sort((a,b)=>(b.publishedAt ? Date.parse(b.publishedAt):0)-(a.publishedAt ? Date.parse(a.publishedAt):0));
}
