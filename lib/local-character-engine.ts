import { spawn } from 'node:child_process';
import { access, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { characterPrompt } from './character-generation';

type Job = { id: string; owner: string; state: 'running' | 'done' | 'error'; image?: Buffer; expires: number };
const registry = globalThis as typeof globalThis & { bottopiaCharacterJobs?: Map<string, Job>; bottopiaCharacterBusy?: boolean };
const jobs = registry.bottopiaCharacterJobs ??= new Map<string, Job>();
export async function characterEngineAvailable() {
  if (process.env.NODE_ENV !== 'development' || process.platform !== 'darwin') return false;
  try {
    await access(path.join(process.cwd(), '.character-venv/bin/mflux-generate-flux2'));
    const snapshots = path.join(homedir(), '.cache/huggingface/hub/models--black-forest-labs--FLUX.2-klein-4B/snapshots');
    const required = ['text_encoder/model-00001-of-00002.safetensors', 'text_encoder/model-00002-of-00002.safetensors', 'transformer/diffusion_pytorch_model.safetensors', 'vae/diffusion_pytorch_model.safetensors'];
    for (const revision of await readdir(snapshots)) {
      try { await Promise.all(required.map(file => access(path.join(snapshots, revision, file)))); return true; } catch { /* Partial model download is not ready. */ }
    }
    return false;
  } catch { return false; }
}
export function getCharacterJob(id: string, owner: string) {
  const job = jobs.get(id);
  if (!job || job.owner !== owner || job.expires < Date.now()) return undefined;
  return job;
}
export async function startCharacterJob(owner: string, description: string, image?: Buffer) {
  if (!await characterEngineAvailable()) throw new Error('ENGINE_UNAVAILABLE');
  if (registry.bottopiaCharacterBusy) throw new Error('ENGINE_BUSY');
  const prompt = characterPrompt(description, Boolean(image));
  registry.bottopiaCharacterBusy = true;
  let folder: string | undefined;
  try {
    for (const [id, job] of jobs) if (job.expires < Date.now()) jobs.delete(id);
    folder = await mkdtemp(path.join(tmpdir(), 'bottopia-character-'));
    const promptPath = path.join(folder, 'prompt.txt'), output = path.join(folder, 'sheet.png');
    await writeFile(promptPath, prompt, { mode: 0o600 });
    const args = ['--model', 'flux2-klein-4b', '-q', '4', '--low-ram', '--steps', '4', '--seed', String(Math.floor(Math.random() * 1000000000)), '--width', '1024', '--height', '768', '--prompt-file', promptPath, '--output', output, '--no-metadata'];
    if (image) {
      const ref = path.join(folder, 'reference.png');
      await sharp(image, { limitInputPixels: 16000000 }).rotate().resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).png().toFile(ref);
      args.push('--image-paths', ref);
    }
    const job: Job = { id: randomUUID(), owner, state: 'running', expires: Date.now() + 30 * 60000 };
    jobs.set(job.id, job);
    const command = path.join(process.cwd(), `.character-venv/bin/mflux-generate-flux2${image ? '-edit' : ''}`);
    const child = spawn(command, args, { shell: false, stdio: 'ignore', env: { NODE_ENV: process.env.NODE_ENV, PATH: process.env.PATH, HOME: process.env.HOME, HF_HUB_DISABLE_TELEMETRY: '1', DO_NOT_TRACK: '1' } });
    const workingFolder = folder;
    let finished = false;
    const timeout = setTimeout(() => child.kill('SIGKILL'), 15 * 60000);
    const finish = async (success: boolean) => {
      if (finished) return;
      finished = true; clearTimeout(timeout);
      try {
        if (!success) throw new Error('GENERATION_FAILED');
        const bytes = await readFile(output);
        const info = await sharp(bytes, { limitInputPixels: 16000000 }).metadata();
        if (info.format !== 'png' || info.width !== 1024 || info.height !== 768 || bytes.length > 12000000) throw new Error('INVALID_OUTPUT');
        job.image = bytes; job.state = 'done';
      } catch { job.state = 'error'; }
      finally {
        registry.bottopiaCharacterBusy = false;
        job.expires = Date.now() + 15 * 60000;
        const expiry = setTimeout(() => jobs.delete(job.id), 15 * 60000);
        expiry.unref();
        await rm(workingFolder, { recursive: true, force: true }).catch(() => undefined);
      }
    };
    child.once('error', () => { void finish(false); });
    child.once('close', code => { void finish(code === 0); });
    return job.id;
  } catch (error) {
    registry.bottopiaCharacterBusy = false;
    if (folder) await rm(folder, { recursive: true, force: true });
    throw error;
  }
}
