import type { CanvasAsset, CanvasProject } from '../../../lib/canvas/types';
import { exportProject, parseProject } from '../../../lib/canvas/graph.ts';

const MAX_BYTES = 200 * 1024 * 1024;
const MIME = new Set(['image/png','image/jpeg','image/webp','video/mp4','video/quicktime','audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/aac']);
function base64(bytes: Uint8Array): string {
  let binary='';
  for(let i=0;i<bytes.length;i+=8192) binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(binary);
}
export async function makeArchive(project: CanvasProject, assets: CanvasAsset[]): Promise<Blob> {
  const used=new Set(project.nodes.flatMap(node=>node.assetIds));
  const selected=assets.filter(a=>used.has(a.id));
  if(selected.reduce((n,a)=>n+(a.blob?.size??0),0)>MAX_BYTES) throw new Error('미디어 합계가 200MB를 넘습니다. 중요한 결과 파일을 먼저 따로 보관해주세요.');
  const media=[];
  for(const asset of selected) {
    const {blob}=asset;
    media.push({id:asset.id,kind:asset.kind,name:asset.name,mime:asset.mime,bytes:asset.bytes,width:asset.width,height:asset.height,durationSeconds:asset.durationSeconds,remoteUrl:blob?undefined:asset.remoteUrl,data:blob?base64(new Uint8Array(await blob.arrayBuffer())):undefined});
  }
  return new Blob([JSON.stringify({format:'bottopia-canvas-archive-v1',project:JSON.parse(exportProject(project)),assets:media})],{type:'application/json'});
}
export async function readArchive(file: File): Promise<{project:CanvasProject;assets:CanvasAsset[]}> {
  if(file.size>MAX_BYTES*1.4) throw new Error('280MB 이하의 캔버스 작업 파일을 선택해주세요.');
  const raw=JSON.parse(await file.text());
  if(raw.format==='bottopia-canvas-v1') return {project:parseProject(JSON.stringify(raw)),assets:[]};
  if(raw.format!=='bottopia-canvas-archive-v1'||!Array.isArray(raw.assets)||raw.assets.length>500) throw new Error('봇토피아 캔버스 작업 파일이 아닙니다.');
  const project=parseProject(JSON.stringify(raw.project));
  const ids=new Set(project.nodes.flatMap(n=>n.assetIds));const seen=new Set<string>();const assets:CanvasAsset[]=[];let total=0;
  for(const item of raw.assets) {
    if(!item||typeof item.id!=='string'||!ids.has(item.id)||seen.has(item.id)||!MIME.has(item.mime)||!['image','video','audio'].includes(item.kind)||!item.mime.startsWith(item.kind+'/')) throw new Error('작업 파일의 미디어 정보를 확인해주세요.');
    seen.add(item.id);
    let blob:Blob|undefined;
    if(item.data!==undefined) {
      if(typeof item.data!=='string')throw new Error('미디어 형식이 올바르지 않습니다.');
      const binary=atob(item.data);total+=binary.length;if(total>MAX_BYTES)throw new Error('미디어 합계는 200MB까지 불러올 수 있습니다.');
      blob=new Blob([Uint8Array.from(binary,c=>c.charCodeAt(0))],{type:item.mime});
    }
    let remoteUrl:string|undefined;
    if(typeof item.remoteUrl==='string') {
      const url=new URL(item.remoteUrl);
      const host=url.hostname.toLowerCase();
      if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443')||!host.includes('.')||host.endsWith('.')||/^(\d+\.){3}\d+$/.test(host)||host.includes(':')||/(^|\.)(localhost|local|internal|test|invalid)$/.test(host))throw new Error('공개 HTTPS 미디어 주소만 지원합니다.');
      remoteUrl=url.href;
    }
    assets.push({id:item.id,kind:item.kind,name:String(item.name||'미디어').slice(0,160),mime:item.mime,bytes:blob?.size??0,blob,remoteUrl,width:Number.isFinite(item.width)?item.width:undefined,height:Number.isFinite(item.height)?item.height:undefined,durationSeconds:Number.isFinite(item.durationSeconds)?item.durationSeconds:undefined});
  }
  return {project,assets};
}
