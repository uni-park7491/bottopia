// Manual evaluation runner: only synthetic checked-in fixtures, loopback Ollama,
// and a local evidence file. Never called by the public website or npm test.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { directorInstruction, storyRequest } from '../lib/story-builder.ts';
const endpoint='http://127.0.0.1:11435';
const model=process.argv.find(arg=>arg.startsWith('--model='))?.slice(8) ?? 'qwen3.5:4b';
if(!['qwen3.5:4b','qwen3.5:9b'].includes(model)) throw new Error('Only the reviewed local 4B/9B models are allowed. No cloud fallback.');
const thinking=process.argv.includes('--thinking');
// Isolated prompt experiment; never silently promoted into the website runtime.
const fewShot=process.argv.includes('--few-shot');
const exampleMessages = [
  {role:'user',content:'누나가 동생의 부러진 연을 발견한다. 누나는 테이프를 동생에게 건넨다. 동생이 테이프로 연을 고친다. 마지막에는 두 사람이 함께 연을 날린다. 제목, 한 줄 소개, [기][승][전][결]로 장면을 발전시켜줘. 마지막 사건은 [결]에만 넣고, 행동하는 사람은 바꾸지 마.'},
  {role:'assistant',content:'제목: 다시 부는 바람\n한 줄 소개: 부러진 연을 고친 남매가 다시 함께 바람을 맞는다.\n[기]\n누나가 동생의 손에 들린 부러진 연을 발견한다. 동생은 축 처진 연의 꼬리를 내려다본다.\n[승]\n누나가 서랍에서 테이프를 꺼내 동생에게 건넨다. 동생은 테이프와 부러진 연살을 번갈아 바라본다.\n[전]\n동생이 부러진 연살에 테이프를 감아 연을 고친다. 동생은 붙인 자리를 손끝으로 눌러 튼튼한지 확인한다.\n[결]\n누나와 동생이 함께 연을 날린다. 팽팽해진 줄을 잡은 두 사람 위로 연이 떠오른다.'},
];
const fixtures=JSON.parse(await readFile(new URL('../tests/fixtures/story-quality.json',import.meta.url),'utf8'));
async function installedModel(){const tags=await fetch(`${endpoint}/api/tags`,{signal:AbortSignal.timeout(10000)}).then(r=>r.json());return tags.models?.find(m=>m.name===model);}
let installed=await installedModel();
if(!installed && process.argv.includes('--wait')) {
  const deadline=Date.now()+12*60*1000;
  console.log('Waiting for the existing local model pull; no duplicate download will be started.');
  while(!installed && Date.now()<deadline){await new Promise(resolve=>setTimeout(resolve,5000));installed=await installedModel();}
}
if(!installed) throw new Error(`Download the local ${model} model first. No cloud fallback.`);
const selected=process.argv.slice(2).find(arg=>!arg.startsWith('--'));
const cases=fixtures.cases.filter(c=>!selected||c.id===selected);
if(!cases.length) throw new Error('Unknown fixture');
const folder=new URL('../artifacts/local-story-evaluation/',import.meta.url);
await mkdir(folder,{recursive:true});
async function generate(prompt) {
  const started=Date.now();
  const response=await fetch(`${endpoint}/api/chat`,{
    method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(300000),
    body:JSON.stringify({model,stream:false,think:thinking,keep_alive:'5m',messages:[{role:'system',content:thinking?directorInstruction.replaceAll('/no_think',''):directorInstruction},...(fewShot?exampleMessages:[]),{role:'user',content:thinking?prompt.replaceAll('/no_think',''):prompt}],options:{temperature:0.4,top_p:0.8,presence_penalty:0.5,num_ctx:thinking?8192:4096,num_predict:thinking?4096:1800,seed:42}}),
  });
  if(!response.ok) throw new Error(`Local inference HTTP ${response.status}`);
  const result=await response.json();
  if(result.error) throw new Error(result.error);
  return {prompt,content:result.message?.content,doneReason:result.done_reason,elapsedMs:Date.now()-started,promptTokens:result.prompt_eval_count,outputTokens:result.eval_count};
}
for(const c of cases) {
  const file=new URL(`${c.id}-${Date.now()}.json`,folder);
  const draft=await generate(storyRequest(c.topic,'따뜻한 코미디',c.runtime));
  console.log(JSON.stringify({id:c.id,stage:'draft',...draft}));
  const evidence={at:new Date().toISOString(),model,thinking,fewShot,examples:fewShot?exampleMessages:[],digest:installed.digest,system:directorInstruction,fixture:c,draft,revision:null,semanticVerdict:'unreviewed'};
  await writeFile(file,JSON.stringify(evidence,null,2));
  if(!draft.content?.trim() || draft.doneReason==='length') {
    console.log(JSON.stringify({id:c.id,stage:'revision',skipped:'Draft incomplete; do not reinterpret an empty draft as a new generation.'}));
    continue;
  }
  const revision=await generate(storyRequest(c.topic,'따뜻한 코미디',c.runtime,draft.content,c.revision));
  console.log(JSON.stringify({id:c.id,stage:'revision',...revision}));
  evidence.revision=revision;
  await writeFile(file,JSON.stringify(evidence,null,2));
}
