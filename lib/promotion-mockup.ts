export type MockupTemplate='poster'|'gallery'|'social';
export const mockupSizes={poster:[1080,1350],gallery:[1600,1000],social:[1080,1080]} as const;
export function creatorCredit(handle:string):string {
  const value=handle.trim();
  if(!value)return '';
  if(!/^[a-z0-9][a-z0-9_-]{2,29}$/.test(value))throw new Error('프로필 주소는 영문 소문자·숫자·_·-로 3–30자 입력해주세요.');
  return `bottopia.studio/creators/${value}`;
}
export function imageContain(sw:number,sh:number,x:number,y:number,w:number,h:number) {
  if(![sw,sh,w,h].every(v=>Number.isFinite(v)&&v>0))throw new Error('이미지 크기를 확인해주세요.');
  const scale=Math.min(w/sw,h/sh);
  return {x:x+(w-sw*scale)/2,y:y+(h-sh*scale)/2,width:sw*scale,height:sh*scale};
}
