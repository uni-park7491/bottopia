// Creates only unique private diagnostic objects and removes those exact objects afterwards.
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const options = { auth: {persistSession:false,autoRefreshToken:false} };
const admin = createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const visitor = createClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);
const key = createHash('sha256').update('diagnostic:'+randomUUID()).digest('hex');
const prefix = 'diagnostics/'+randomUUID();
const paths = [prefix+'/avatar.webp',prefix+'/video.mp4'];
const directory = await mkdtemp(join(tmpdir(),'bottopia-upload-'));
let failed = false;
try {
  const results = await Promise.all(Array.from({length:8},()=>admin.rpc('bottopia_rate_limit',{p_key:key,p_limit:3,p_window_seconds:60})));
  assert.ok(results.every(r=>!r.error));
  assert.equal(results.filter(r=>r.data.allowed).length,3);
  assert.ok((await visitor.rpc('bottopia_rate_limit',{p_key:key,p_limit:3,p_window_seconds:60})).error);
  assert.ok((await visitor.from('bottopia_request_limits').select('key').limit(1)).error);
  console.log('PASS atomic request limit: 8 concurrent attempts, exactly 3 allowed; anonymous access denied');
  const photo = await sharp({create:{width:512,height:512,channels:3,background:'#6754ff'}}).webp().toBuffer();
  const videoPath = join(directory,'video.mp4');
  execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','color=c=purple:s=160x90:d=1','-an','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',videoPath]);
  const video = await readFile(videoPath);
  for (const [index,bytes,type] of [[0,photo,'image/webp'],[1,video,'video/mp4']]) {
    const path = paths[index];
    const ticket = await admin.storage.from('works').createSignedUploadUrl(path);
    assert.equal(ticket.error,null);
    const uploaded = await visitor.storage.from('works').uploadToSignedUrl(path,ticket.data.token,bytes,{contentType:type});
    assert.equal(uploaded.error,null);
    const info = await admin.storage.from('works').info(path);
    assert.equal(info.error,null);
    assert.equal(info.data.size,bytes.length);
    assert.ok((await visitor.storage.from('works').download(path)).error);
    const signed = await admin.storage.from('works').createSignedUrl(path,60);
    assert.equal(signed.error,null);
    const fetched = await fetch(signed.data.signedUrl);
    assert.equal(fetched.status,200);
    assert.deepEqual(Buffer.from(await fetched.arrayBuffer()),bytes);
    console.log('PASS private signed upload, metadata, playback integrity and anonymous denial: '+type);
  }
} catch { failed=true; console.error('FAIL diagnostic check (details/credentials withheld)'); }
finally {
  const cleanup = await admin.storage.from('works').remove(paths);
  const rateCleanup = await admin.from('bottopia_request_limits').delete().eq('key',key);
  if (cleanup.error || rateCleanup.error) { failed=true; console.error('FAIL diagnostic cleanup; inspect diagnostics prefix'); }
  else console.log('PASS exact diagnostic objects and rate record removed; existing user data unchanged');
  await rm(directory,{recursive:true,force:true});
}
process.exitCode = failed ? 1 : 0;
