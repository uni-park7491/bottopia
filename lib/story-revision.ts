export type RevisionLine = { kind:'same'|'removed'|'added'; text:string };

// Bounded line diff for review, not a semantic claim that character roles are correct.
export function revisionDiff(before:string, after:string):RevisionLine[] {
  if (before.length>2400 || after.length>2400) throw new Error('시나리오 길이를 확인해주세요.');
  const a=before.split('\n'), b=after.split('\n');
  if(a.length>200 || b.length>200) return [{kind:'removed',text:before},{kind:'added',text:after}];
  const lengths=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
  for(let i=a.length-1;i>=0;i--) for(let j=b.length-1;j>=0;j--) lengths[i][j]=a[i]===b[j]?1+lengths[i+1][j+1]:Math.max(lengths[i+1][j],lengths[i][j+1]);
  const result:RevisionLine[]=[]; let i=0,j=0;
  while(i<a.length || j<b.length) {
    if(i<a.length && j<b.length && a[i]===b[j]) {result.push({kind:'same',text:a[i++]});j++;}
    else if(i<a.length && (j===b.length || lengths[i+1][j]>=lengths[i][j+1])) result.push({kind:'removed',text:a[i++]});
    else result.push({kind:'added',text:b[j++]});
  }
  return result;
}
