// Synthetic fixture experiment; no website integration or cloud fallback.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { factSchema, directedStorySchema, factInstruction, structuredDirectorInstruction, parseFacts, parseDirectedStory, renderDirectedStory, directedStoryRequest, reviewSchema, reviewInstruction, parseReview } from '../lib/story-director.ts';
const endpoint = 'http://127.0.0.1:11435';
const model = process.argv.find(arg => arg.startsWith('--model='))?.slice(8) || 'qwen3.5:9b';
const sampling = process.argv.includes('--official-sampling') ? 'official-general-non-thinking' : 'greedy';
const options = { num_ctx:8192, num_predict:1800, seed:42, ...(sampling === 'greedy' ? { temperature:0 } : { temperature:0.7, top_p:0.8, top_k:20, min_p:0, presence_penalty:1.5, repeat_penalty:1 }) };
if (!['qwen3.5:4b','qwen3.5:9b'].includes(model)) throw new Error('Local model allowlist only');
const id = process.argv.slice(2).find(arg => !arg.startsWith('--'));
const fixture = JSON.parse(await readFile(new URL('../tests/fixtures/story-quality.json', import.meta.url), 'utf8')).cases.find(item => item.id === id);
if (!fixture) throw new Error('Select a fixture');
const tags = await fetch(`${endpoint}/api/tags`).then(r => r.json());
const installed = tags.models?.find(item => item.name === model);
if (!installed) throw new Error('Local model not installed');
const evidence = { model, digest: installed.digest, sampling, options, fixture, stages: [], verdict: 'unreviewed' };
const folder = new URL('../artifacts/structured-story-evaluation/', import.meta.url);
await mkdir(folder, { recursive: true });
const file = new URL(`${id}-${Date.now()}.json`, folder);
async function generate(stage, system, prompt, format) {
  const started = Date.now();
  const response = await fetch(`${endpoint}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(180000), body: JSON.stringify({ model, stream: false, think: false, format, messages: [{role:'system',content:system},{role:'user',content:prompt}], options }) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = await response.json();
  const record = { stage, system, prompt, format, content: result.message?.content, done: result.done_reason, elapsedMs: Date.now() - started };
  evidence.stages.push(record); await writeFile(file, JSON.stringify(evidence, null, 2)); console.log(JSON.stringify(record));
  if (result.error || result.done_reason === 'length' || !record.content) throw new Error('Incomplete generation');
  return record.content;
}
try {
  const extracted = await generate('facts', factInstruction, `${fixture.topic}\nJSON: ${JSON.stringify(factSchema)}`, factSchema);
  const facts = parseFacts(extracted, fixture.topic);
  const draft = parseDirectedStory(await generate('draft', structuredDirectorInstruction, directedStoryRequest(fixture.topic, facts, fixture.runtime), directedStorySchema), facts);
  let previous = renderDirectedStory(draft);
  if (process.argv.includes('--review')) {
    const issues = parseReview(await generate('review', reviewInstruction, `원문: ${fixture.topic}\n초안: ${previous}\nJSON: ${JSON.stringify(reviewSchema)}`, reviewSchema), fixture.topic, previous);
    evidence.issues = issues;
    if (issues.length) {
      const correction = issues.map(issue=>issue.correction).join('\n').slice(0,500);
      const repaired = parseDirectedStory(await generate('repair', structuredDirectorInstruction, directedStoryRequest(fixture.topic, facts, fixture.runtime, previous, correction), directedStorySchema),facts);
      previous = renderDirectedStory(repaired);
    }
  }
  const revised = parseDirectedStory(await generate('revision', structuredDirectorInstruction, directedStoryRequest(fixture.topic, facts, fixture.runtime, previous, fixture.revision), directedStorySchema), facts);
  evidence.rendered = { draft: previous, revision: renderDirectedStory(revised) };
} catch (error) { evidence.validationError = error.message; process.exitCode = 1; }
await writeFile(file, JSON.stringify(evidence, null, 2));
