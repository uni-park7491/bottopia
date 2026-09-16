// Experimental two-pass director. Validate provenance/coverage, not semantic truth.
export type StoryFact = { id: number; source: string; actor: string; action: string; recipient: string };
export type DirectedStory = { title: string; logline: string; beats: Array<{ text: string; facts: number[] }> };
const string = { type: 'string' };
export const factSchema = { type: 'object', properties: { events: { type: 'array', minItems: 1, maxItems: 12, items: { type: 'object', properties: { source: string, actor: string, action: string, recipient: string }, required: ['source','actor','action','recipient'], additionalProperties: false } } }, required: ['events'], additionalProperties: false };
export const directedStorySchema = { type: 'object', properties: { title: string, logline: string, beats: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'object', properties: { text: string, facts: { type: 'array', items: { type: 'integer' } } }, required: ['text','facts'], additionalProperties: false } } }, required: ['title','logline','beats'], additionalProperties: false };
export const factInstruction = 'Extract the events explicitly stated by the user. Return JSON only. Do not write a screenplay. Preserve who acts, who receives an object or request, and chronological order. Each source must be an exact contiguous quote from the user text. Write actor, action, recipient in Korean. If there is no recipient, use an empty string. Do not invent an event. /no_think';
export const structuredDirectorInstruction = 'You write Korean short-film screenplays. Return the requested JSON only. Four beats are consecutive parts of ONE story, not four summaries of the same story. Preserve the supplied facts exactly: same actor, recipient, object and order. Each numbered fact must occur in exactly ONE beat and be listed in that beat facts array. Empty facts arrays are allowed for an added setup or reaction. Never replay an earlier event in a later beat. Add only filmable details, not contradictory events. Korean text only. /no_think';
export const reviewSchema = { type: 'object', properties: { issues: { type: 'array', maxItems: 6, items: { type: 'object', properties: { source: string, candidate: string, correction: string }, required: ['source','candidate','correction'], additionalProperties: false } } }, required: ['issues'], additionalProperties: false };
export const reviewInstruction = 'Compare the Korean original facts with the proposed screenplay. Check actor, recipient, verb meaning, event order, missing ending and repeated events. Do not review style. Return issues only when there is a concrete mismatch. For each issue, source must quote the original verbatim, candidate must quote the proposed screenplay verbatim, and correction explains the needed fix in Korean. Do not rewrite facts to excuse a mismatch. Empty issues if no mismatch. JSON only. /no_think';
export function parseReview(raw: string, topic: string, draft: string): Array<{source:string;candidate:string;correction:string}> {
  if (raw.length > 12000) throw new Error('검토 응답이 너무 깁니다.');
  const value = JSON.parse(raw);
  if (!Array.isArray(value?.issues) || value.issues.length > 6) throw new Error('검토 형식을 확인해주세요.');
  return value.issues.map((issue:Record<string,unknown>) => {
    if (!issue) throw new Error('검토 항목이 올바르지 않습니다.');
    const source = readText(issue.source,1200); const candidate = readText(issue.candidate,2400);
    if (!topic.includes(source) || !draft.includes(candidate)) throw new Error('검토 근거가 실제 원문·초안과 일치하지 않습니다.');
    return {source,candidate,correction:readText(issue.correction,300)};
  });
}
function readText(value: unknown, max: number, empty = false): string {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) throw new Error('생성 내용의 길이·형식을 확인해주세요.');
  return value.trim();
}
export function parseFacts(raw: string, topic: string): StoryFact[] {
  if (raw.length > 12000 || !topic.trim() || topic.length > 1200) throw new Error('원문 또는 생성 내용이 너무 깁니다.');
  const value = JSON.parse(raw);
  if (!Array.isArray(value?.events) || value.events.length < 1 || value.events.length > 12) throw new Error('사건 목록이 올바르지 않습니다.');
  return value.events.map((event: Record<string, unknown>, index: number) => {
    if (!event || typeof event !== 'object') throw new Error('사건 형식이 올바르지 않습니다.');
    const source = readText(event.source, 1200);
    if (!topic.includes(source)) throw new Error('원문에 없는 사건 근거가 생성되었습니다.');
    return { id: index + 1, source, actor: readText(event.actor, 80), action: readText(event.action, 200), recipient: readText(event.recipient, 80, true) };
  });
}
export function parseDirectedStory(raw: string, facts: StoryFact[]): DirectedStory {
  if (raw.length > 12000 || !facts.length) throw new Error('시나리오를 확인해주세요.');
  const value = JSON.parse(raw);
  if (!Array.isArray(value?.beats) || value.beats.length !== 4) throw new Error('기승전결 네 단계가 필요합니다.');
  const order: number[] = [];
  const beats = value.beats.map((beat: Record<string, unknown>) => {
    if (!beat || !Array.isArray(beat.facts) || !beat.facts.every(id => Number.isInteger(id) && id >= 1 && id <= facts.length)) throw new Error('사건 연결이 올바르지 않습니다.');
    order.push(...beat.facts);
    return { text: readText(beat.text, 450), facts: beat.facts as number[] };
  });
  if (order.length !== facts.length || order.some((id, i) => id !== i + 1)) throw new Error('사건이 누락·반복되거나 순서가 바뀌었습니다.');
  return { title: readText(value.title, 80), logline: readText(value.logline, 160), beats };
}
export function renderDirectedStory(story: DirectedStory): string {
  return `제목: ${story.title}\n한 줄 소개: ${story.logline}\n\n${story.beats.map((beat, i) => `[${'기승전결'[i]}]\n${beat.text}`).join('\n\n')}`;
}
export function directedStoryRequest(topic: string, facts: StoryFact[], runtime: number, previous = '', feedback = '') {
  if (!topic.trim() || topic.length > 1200 || previous.length > 2400 || feedback.length > 500 || !Number.isInteger(runtime) || runtime < 15 || runtime > 120) throw new Error('입력값을 확인해주세요.');
  return `전체 ${runtime}초, 따뜻한 코미디. 총 800자 이내. 기/승/전/결 순서로 정확히 네 beats를 만드세요. 각 text는 1–2문장. 촬영 가능한 행동과 짧은 대사로 보여주세요.\n원문: ${topic}\n확정 사건: ${JSON.stringify(facts)}\n${previous ? `이전 초안: ${previous}\n수정 요청: ${feedback}\n원문의 사실은 보존하고 요청한 부분을 바꾸세요.` : '순서대로 사건을 나누고 결말은 마지막에 한 번만 보여주세요.'}\nJSON: ${JSON.stringify(directedStorySchema)}`;
}
