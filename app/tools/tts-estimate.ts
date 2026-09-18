const KEY='bottopia.tts.timing.v1';
type Store=Pick<Storage,'getItem'|'setItem'>;
type Sample={context:string;chars:number;seconds:number;at:number};
function samples(store:Store):Sample[]{
  try{
    const data:unknown=JSON.parse(store.getItem(KEY)||'[]');
    if(!Array.isArray(data))return [];
    return data.filter((s):s is Sample=>typeof s?.context==='string'&&Number.isFinite(s.chars)&&s.chars>0&&s.chars<=500&&Number.isFinite(s.seconds)&&s.seconds>0&&s.seconds<86400&&Number.isFinite(s.at)&&Date.now()-s.at<30*86400000&&s.at<=Date.now()).slice(-60);
  }catch{return [];}
}
export function recordTiming(store:Store,context:string,chars:number,seconds:number){
  if(!Number.isFinite(seconds)||seconds<=0||seconds>=86400||!Number.isFinite(chars)||chars<1||chars>500)return;
  try{store.setItem(KEY,JSON.stringify([...samples(store),{context,chars,seconds,at:Date.now()}].slice(-60)));}catch{/* Storage is optional. */}
}
export function estimateTiming(store:Store,context:string,chars:number):number|null{
  // Only compare the same settings and reasonably similar text lengths.
  const values=samples(store).filter(s=>s.context===context&&chars/s.chars>=0.5&&chars/s.chars<=2).slice(-5).map(s=>s.seconds*chars/s.chars).sort((a,b)=>a-b);
  if(!values.length)return null;
  return Math.ceil(values[Math.floor(values.length/2)]);
}
export function estimateLabel(estimate:number|null,elapsed:number|null,phase:string):string{
  if(phase==='downloading')return '모델 파일 확인·다운로드 중 · 예상 시간 계산 대기';
  if(estimate===null)return '예상 시간: 첫 완료 후 기록을 바탕으로 계산';
  const remaining=elapsed===null?estimate:estimate-elapsed;
  if(remaining<=0)return '이전 기록보다 오래 걸리고 있습니다 · 생성 진행 중';
  const rounded=Math.max(5,Math.ceil(remaining/5)*5);
  const duration=rounded<60?`${rounded}초`:`${Math.floor(rounded/60)}분${rounded%60?` ${rounded%60}초`:''}`;
  return elapsed===null?`음성 생성 단계 예상 약 ${duration} · 준비 시간 별도`:`예상 남은 시간 약 ${duration}`;
}
