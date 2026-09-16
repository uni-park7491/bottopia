export type ShotSlot = { index: number; clip: number; start: number; duration: number };
export const MAX_STORY_SHOTS = 32;
export type StoryShot = ShotSlot & { visual: string; camera: string; audio: string };
export class StoryFormatError extends Error {}
export function normalizeStoryDraft(raw: string): string {
  const text = raw.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/^```(?:text|markdown)?\s*\n?|\n?```$/g, '').replace(/\*\*/g, '').trim();
  if (!text || !/[가-힣]/.test(text)) throw new StoryFormatError('한국어 시나리오 본문이 생성되지 않았습니다.');
  if (text.length > 2400) throw new StoryFormatError(`시나리오가 너무 깁니다 (${text.length}자 / 최대 2,400자).`);
  if (text.includes('<think>') || hasRunawayRepetition(text)) throw new StoryFormatError('생각 과정 또는 반복 문장이 포함되어 있습니다.');
  const headings = [...text.matchAll(/^[ \t]*(?:#{1,3}[ \t]*)?(?:\[([기승전결])\]|([기승전결]))[ \t]*(?:\([^\n)]{1,30}\)[ \t]*)?(?:[:：][ \t]*|(?=\n|$)|(?<=[\]])[ \t]*)(.*)$/gm)];
  if (headings.map(m => m[1] || m[2]).join('') !== '기승전결') throw new StoryFormatError('기·승·전·결 네 단계가 순서대로 필요합니다.');
  const bodies = headings.map((m, i) => [m[3], text.slice(m.index! + m[0].length, headings[i + 1]?.index ?? text.length)].join('\n').trim());
  if (bodies.some(body => !/[가-힣]/.test(body))) throw new StoryFormatError('내용이 비어 있는 시나리오 단계가 있습니다.');
  const prefix = text.slice(0, headings[0].index).trim();
  return [prefix, ...bodies.map((body, i) => `[${'기승전결'[i]}]\n${body}`)].filter(Boolean).join('\n\n');
}
export function hasRunawayRepetition(text:string):boolean {
  const counts = new Map<string,number>();
  for (const line of text.split('\n').map(s=>s.replace(/\s+/g,' ').trim()).filter(s=>s.length>=40)) {
    const count=(counts.get(line)||0)+1; if(count>=3) return true; counts.set(line,count);
  }
  return false;
}
export function shotSchedule(runtime: number, clipLength: number): ShotSlot[] {
  if (!Number.isInteger(runtime) || runtime < 15 || runtime > 120 || !Number.isInteger(clipLength) || clipLength < 5 || clipLength > 30) throw new Error('전체 길이 15–120초, 클립 길이 5–30초를 입력해주세요.');
  const slots: ShotSlot[] = [];
  for (let start = 0, clip = 1; start < runtime; clip++) {
    const length = Math.min(clipLength, runtime - start);
    const count = Math.ceil(length / 8);
    for (let i = 0; i < count; i++) {
      const duration = Math.floor(length / count) + (i < length % count ? 1 : 0);
      slots.push({ index: slots.length + 1, clip, start, duration }); start += duration;
    }
  }
  return slots;
}
export function parseShots(text: string, slots: ShotSlot[]): StoryShot[] {
  const value: unknown = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim());
  if (!value || typeof value !== 'object' || !('shots' in value) || !Array.isArray(value.shots) || value.shots.length !== slots.length) throw new Error('AI의 샷 구성이 올바르지 않습니다. 다시 생성해주세요.');
  return value.shots.map((item: unknown, i: number) => {
    if (!item || typeof item !== 'object') throw new Error('샷 데이터가 올바르지 않습니다.');
    const row = item as Record<string, unknown>;
    for (const key of ['visual', 'camera', 'audio']) if (typeof row[key] !== 'string' || !row[key].trim() || row[key].length > 500) throw new Error('샷 설명이 비어 있거나 너무 깁니다. 다시 생성해주세요.');
    return { ...slots[i], visual: (row.visual as string).trim(), camera: (row.camera as string).trim(), audio: (row.audio as string).trim() };
  });
}
export const directorInstruction = `당신은 한국어 단편영화 시나리오 작가입니다. 사용자가 지정한 사건은 확정된 사실입니다. 누가 누구에게 무엇을 하는지, 물건이 누구에게서 누구에게 이동하는지, 사건의 전후 순서를 정확히 보존하세요. 주어진 사건을 더 극적으로 만들려고 뒤집지 마세요. 기·승·전·결은 한 이야기를 시간 순서로 나눈 네 부분입니다. 각 부분에서 전체 이야기를 다시 요약하지 마세요. 이미 일어난 행동은 뒤 단계에서 다시 일어나지 않습니다. 결말은 [결]에 한 번만 씁니다. 정보가 없는 부분에만 촬영 가능한 행동과 짧은 대사를 보충하세요. 대명사 때문에 주체가 모호해지면 인물 이름을 다시 쓰세요. 수정 요청은 이전 초안보다 우선합니다. 이전 초안의 오류를 반복하지 마세요. 자연스러운 한국어로 요청된 시나리오 또는 JSON만 출력하세요. 해설, 조언, 마크다운 강조는 쓰지 마세요. /no_think`;
export function storyRequest(topic: string, tone: string, runtime: number, draft = '', feedback = '') {
  if (!topic.trim() || topic.length > 1200 || draft.length > 2400 || feedback.length > 500) throw new Error('입력 길이를 확인해주세요.');
  return `전체 러닝타임 ${runtime}초, 분위기 ${tone}.\n출력 형식: 제목, 한 줄 소개, [기], [승], [전], [결]. 각 단계 1–2문장, 총 800자 이내. 네 단계는 이미 주어진 사건을 시간순으로 나누는 구분입니다. 사건이 충분하면 새 선택이나 갈등을 만들 필요가 없습니다. 주제만 주어진 경우에는 자연스러운 시작·진행·전환·결말을 창작하세요. 지정된 사건 문장은 그대로 사용해도 되며, 표정·공간·촬영 가능한 세부 묘사로 발전시키세요. 아직 샷리스트는 작성하지 마세요.\n${draft ? `수정할 이전 초안(틀린 내용이 있을 수 있음):\n${draft}\n\n` : ''}사용자가 지정한 원래 사건(이름·역할·행동·순서 유지):\n${topic}\n\n${draft ? `이번 수정에서 반드시 반영할 요청:\n${feedback}\n요청한 부분을 실제로 변경하고 나머지 확정 사실은 보존하세요.` : '위 사건을 순서대로 장면으로 풀어주세요. 누가 행동하고 누가 받는지 뒤집지 마세요.'}\n완성 시나리오만 출력하세요. /no_think`;
}
export function shotBeatStages(index: number, totalShots: number): string {
  if (!Number.isInteger(totalShots) || totalShots < 2 || totalShots > MAX_STORY_SHOTS || !Number.isInteger(index) || index < 1 || index > totalShots) throw new Error('전체 샷 순서를 확인해주세요.');
  // Partition the four beats across the complete shot list, not overlapping time
  // intervals. For two shots this is 기승 / 전결, never 기승전 / 전결.
  const first = Math.floor((index - 1) * 4 / totalShots);
  const end = Math.max(first + 1, Math.floor(index * 4 / totalShots));
  return '기승전결'.slice(first, end);
}
export function shotSources(story: string, slots: ShotSlot[], totalShots: number) {
  const clean = story.replace(/\*\*/g, '').replace(/^([ \t]*(?:#{1,3}[ \t]*)?\[[기승전결]\])[ \t]+(?![:：(])([^\s].*)$/gm, '$1: $2');
  // Only standalone stage headings count, never prose beginning with 기/승/전/결.
  const heading = /^[ \t]*(?:#{1,3}[ \t]*)?(?:\[([기승전결])\]|([기승전결]))[ \t]*(?:\([^\n)]{1,30}\)[ \t]*)?(?:[:：][ \t]*(.*)|[ \t]*)$/gm;
  const matches = [...clean.matchAll(heading)];
  const beats = new Map<string, string>();
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const stage = match[1] || match[2];
    const body = [match[3] || '', clean.slice(match.index! + match[0].length, matches[i + 1]?.index ?? clean.length)].join('\n').trim();
    if (beats.has(stage)) throw new Error('기·승·전·결 제목이 중복됩니다. 시나리오의 단계 제목을 정리해주세요.');
    beats.set(stage, body);
  }
  if (beats.size && [...'기승전결'].some(stage => !beats.get(stage))) throw new Error('기·승·전·결 중 비어 있는 단계가 있습니다. 시나리오를 확인해주세요.');
  return slots.map(s => {
    const stages = shotBeatStages(s.index, totalShots);
    const source = beats.size ? [...stages].map(stage => beats.get(stage)).join('\n') : clean;
    return { ...s, stage: stages, source };
  });
}
export function shotsRequest(story: string, slots: ShotSlot[], runtime: number, totalShots: number) {
  const assigned = shotSources(story, slots, totalShots);
  const includesEnding = slots.some(s => s.start + s.duration === runtime);
  const ending = includesEnding ? '마지막 샷에서 확정 시나리오의 결말을 보여주세요. 결말을 다른 사건으로 바꾸거나 다음 이야기를 시작하지 마세요.' : '아직 마지막 묶음이 아닙니다. 배정되지 않은 후반 사건이나 결말을 앞당기지 마세요.';
  const sourceText=assigned.map(s=>`샷 ${s.index}, ${s.start}–${s.start+s.duration}초, 단계 ${s.stage}\n확정 원문:\n${s.source}`).join('\n\n');
  return `전체 ${runtime}초 영화의 샷 연출안입니다.\n${sourceText}\n\n정확히 ${slots.length}개를 시간 순서대로 작성하세요. ${ending}\nvisual에는 배정된 원문의 모든 행동을 빠짐없이 순서대로 쓰세요. 원문 문장을 그대로 사용해도 됩니다. 등장인물, 물건의 주인, 받는 사람을 바꾸지 마세요. camera는 구도와 움직임만 제안하세요. audio는 원문에 대사가 없으면 대사를 만들지 말고 환경음만 제안하세요.\nJSON 형식: {"shots":[{"visual":"원문의 모든 행동","camera":"구도와 카메라 움직임","audio":"원문 대사 또는 환경음"}]}. visual은 400자 이내, camera와 audio는 각각 100자 이내. 설명이나 마크다운 없이 JSON만 출력하세요.`;
}
export const shotDirectorInstruction = '확정된 한국어 시나리오를 촬영용 샷으로 옮기는 연출 조수입니다. 이야기를 새로 쓰는 작업이 아닙니다. 제공된 원문의 모든 행동·인물·물건 전달 방향을 보존합니다. 원문에 없는 사건과 대사를 추가하지 않습니다. 요청된 JSON만 출력합니다.';
export function exportStory(story: string, shots: StoryShot[]): string {
  return [story, ...shots.map(s => `클립 ${s.clip} · 샷 ${s.index} · ${s.start}–${s.start + s.duration}초\n화면: ${s.visual}\n카메라: ${s.camera}\n소리: ${s.audio}`)].join('\n\n');
}
