import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadMemberPrompt} from '../lib/member-prompt.ts';

test('member prompt redirects anonymous users back to the original page after login', async()=>{
  const oldFetch=globalThis.fetch,oldWindow=globalThis.window;
  let redirected;
  globalThis.window={location:{pathname:'/works/example',search:'?lang=ko',assign:value=>{redirected=value;}}};
  globalThis.fetch=async(_url,options)=>{assert.equal(options.cache,'no-store');return new Response('{}',{status:401});};
  try{
    assert.equal(await loadMemberPrompt('/api/works/example/prompt','ko'),null);
    const url=new URL(redirected,'https://bottopia.studio');
    assert.equal(url.pathname,'/login');
    assert.equal(url.searchParams.get('next'),'/works/example?lang=ko');
    assert.equal(url.searchParams.get('reason'),'prompt');
  }finally{globalThis.fetch=oldFetch;globalThis.window=oldWindow;}
});

test('member prompt returns authorized content and does not hide service failures',async()=>{
  const oldFetch=globalThis.fetch;
  try{
    globalThis.fetch=async()=>Response.json({prompt:'member prompt',negativePrompt:'negative'});
    assert.deepEqual(await loadMemberPrompt('/prompt','en'),{prompt:'member prompt',negativePrompt:'negative'});
    globalThis.fetch=async()=>new Response('{}',{status:503});
    await assert.rejects(loadMemberPrompt('/prompt','en'),/Prompt unavailable/);
  }finally{globalThis.fetch=oldFetch;}
});

test('prompt endpoints authenticate before retrieving protected data and prevent caching',()=>{
  for(const file of ['app/api/works/[id]/prompt/route.ts','app/api/video-references/[id]/prompt/route.ts']){
    const source=readFileSync(new URL('../'+file,import.meta.url),'utf8');
    assert.match(source,/getCurrentUser\(\)/);
    assert.match(source,/status: 401/);
    assert.match(source,/private, no-store/);
    assert.match(source,/Vary: 'Cookie'/);
    assert.ok(source.indexOf('status: 401')<source.indexOf(file.includes('/works/')?'createAdminClient().from':'videoReferences.find'));
  }
  const copy=readFileSync(new URL('../app/api/works/[id]/copy/route.ts',import.meta.url),'utf8');
  assert.match(copy,/status: 401/);
});

test('public feeds and creator profiles exclude prompt originals; reference client imports types only',()=>{
  const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
  assert.match(read('app/api/works/route.ts'),/work.prompt = ''; work.negativePrompt = ''/);
  for(const file of ['app/api/works/[id]/route.ts','app/api/creators/[handle]/route.ts']){
    assert.match(read(file),/prompt: ''/);
    assert.match(read(file),/negativePrompt: ''/);
  }
  assert.match(read('app/api/video-references/route.ts'),/prompt: ''/);
  assert.match(read('app/components/VideoReferences.tsx'),/import type \{VideoReference\}/);
});
