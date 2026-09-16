// Read-only synthetic input; local Ollama reference, not a browser quality pass.
import {readFile,writeFile} from 'node:fs/promises';
import {parseArchive} from '../lib/story-project.ts';
import {shotSchedule,shotsRequest,shotDirectorInstruction,parseShots} from '../lib/story-builder.ts';
const endpoint='http://127.0.0.1:11435';
const model='qwen3.5:4b';
const project=parseArchive(await readFile(new URL('../artifacts/animatic-test/browser-courier-shots.json',import.meta.url),'utf8')).current;
const slots=shotSchedule(Number(project.runtimeInput),Number(project.clipInput));
const tags=await fetch(`${endpoint}/api/tags`).then(r=>r.json());
const installed=tags.models?.find(item=>item.name===model);if(!installed)throw new Error('Local model must already be installed');
const evidence={model,digest:installed.digest,system:shotDirectorInstruction,story:project.story,results:[],verdict:'unreviewed'};
const output=new URL(`../artifacts/animatic-test/local-shot-reference-${Date.now()}.json`,import.meta.url);
const schema={type:'object',properties:{shots:{type:'array',minItems:1,maxItems:1,items:{type:'object',properties:{visual:{type:'string'},camera:{type:'string'},audio:{type:'string'}},required:['visual','camera','audio'],additionalProperties:false}}},required:['shots'],additionalProperties:false};
for(const slot of slots){
  const prompt=shotsRequest(project.story,[slot],Number(project.runtimeInput),slots.length);
  const started=Date.now();
  const r=await fetch(`${endpoint}/api/chat`,{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(180000),body:JSON.stringify({model,think:false,stream:false,format:schema,messages:[{role:'system',content:shotDirectorInstruction},{role:'user',content:prompt}],options:{temperature:.35,top_p:.8,presence_penalty:0,num_ctx:4096,num_predict:1300}})});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const result=await r.json();
  evidence.results.push({slot,prompt,raw:result.message?.content,done:result.done_reason,elapsedMs:Date.now()-started});
  await writeFile(output,JSON.stringify(evidence,null,2));
  if(result.done_reason==='length'||!result.message?.content)throw new Error('Incomplete generation');
  console.log(JSON.stringify(parseShots(result.message.content,[slot])));
}
console.log(output.pathname);
