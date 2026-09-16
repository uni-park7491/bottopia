import { MAX_STORY_SHOTS, type StoryShot } from './story-builder.ts';
export function timelineDuration(shots:StoryShot[]):number {
  let end=0;
  if(!shots.length || shots.length>MAX_STORY_SHOTS) throw new Error(`1–${MAX_STORY_SHOTS}개 샷이 필요합니다.`);
  for(const s of shots) {
    if(!Number.isFinite(s.duration)||s.duration<=0||s.start!==end) throw new Error('샷 시간이 연속적이지 않습니다.');
    end+=s.duration;
  }
  if(end>120) throw new Error('콘티는 최대 120초입니다.');
  return end;
}
export function activeShot(shots:StoryShot[],time:number):number {
  const end=timelineDuration(shots);
  if(!Number.isFinite(time)) return 0;
  const bounded=Math.min(end,Math.max(0,time));
  const i=shots.findIndex(s=>bounded<s.start+s.duration);
  return i<0?shots.length-1:i;
}
export function audioPosition(time:number,offset:number,duration:number):number|null {
  if(![time,offset,duration].every(Number.isFinite)||offset<0||duration<=0) return null;
  const position=time-offset;
  return position<0||position>=duration?null:position;
}
