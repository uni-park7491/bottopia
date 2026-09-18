export type SavedAudio = { id:string; owner:string; at:number; blob:Blob; seconds:number; text:string; voice:string; engine:string; language:string };
function openHistory():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('bottopia-audio-history',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('audio',{keyPath:'id'});
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error('다른 탭을 닫고 다시 시도해주세요.'));
  });
}
export async function audioHistory(owner:string, action:'list'|'save'|'delete'='list', value?:SavedAudio|string):Promise<SavedAudio[]> {
  const db=await openHistory();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('audio',action==='list'?'readonly':'readwrite'), store=tx.objectStore('audio');
    let rows:SavedAudio[]=[];
    const request=store.getAll();
    request.onsuccess=()=>{
      rows=(request.result as SavedAudio[]).filter(row=>row.owner===owner);
      if(action==='save' && typeof value==='object' && value.owner===owner) {
        if(rows.some(row=>row.id===value.id)) return;
        if(rows.length>=50 || rows.reduce((sum,row)=>sum+row.blob.size,0)+value.blob.size>100*1024*1024) { tx.abort(); return; }
        store.put(value); rows.push(value);
      }
      if(action==='delete' && typeof value==='string' && rows.some(row=>row.id===value)) { store.delete(value); rows=rows.filter(row=>row.id!==value); }
    };
    tx.oncomplete=()=>{db.close();resolve(rows.sort((a,b)=>b.at-a.at));};
    tx.onabort=tx.onerror=()=>{db.close();reject(tx.error||new Error('보관함이 가득 찼습니다. 기존 기록을 삭제하거나 현재 음성을 내려받으세요.'));};
  });
}
