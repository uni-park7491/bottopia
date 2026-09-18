export const feedbackTools = {scenes:'시나리오·샷리스트',audio:'TTS',watermark:'워터마크',qr:'QR 코드',other:'기타'} as const;
export const FEEDBACK_TYPE='TOOL_FEEDBACK';
export function parseToolFeedback(value:Record<string,unknown>|null){
  if(!value||typeof value.tool!=='string'||!Object.hasOwn(feedbackTools,value.tool))return null;
  if(typeof value.title!=='string'||typeof value.message!=='string')return null;
  const title=value.title.trim(),message=value.message.trim();
  if(title.length<2||title.length>100||message.length<10||message.length>3000)return null;
  if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(title+message))return null;
  return {tool:value.tool as keyof typeof feedbackTools,title,message};
}
