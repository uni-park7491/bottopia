import { MAX_STORY_SHOTS, parseShots, shotSchedule, type StoryShot } from './story-builder.ts';

export type StoryProject = { topic: string; tone: string; runtimeInput: string; clipInput: string; story: string; feedback: string; shots: StoryShot[] };
export type StoryVersion = { savedAt: string; project: StoryProject };
export type StoryArchive = { format: 'bottopia-story-v1'; current: StoryProject; versions: StoryVersion[] };
export const archiveKey = (memberId: string) => `bottopia:story:v1:${memberId}`;
export function parseProject(input: unknown): StoryProject {
  if (!input || typeof input !== 'object') throw new Error('작업 형식이 올바르지 않습니다.');
  const p = input as Record<string, unknown>;
  const limits = { topic:1200, tone:80, runtimeInput:3, clipInput:2, story:2400, feedback:500 };
  for (const [key,max] of Object.entries(limits)) if (typeof p[key] !== 'string' || (p[key] as string).length > max) throw new Error('작업 내용의 길이나 형식을 확인해주세요.');
  if (!Array.isArray(p.shots) || p.shots.length > MAX_STORY_SHOTS) throw new Error('샷 목록이 올바르지 않습니다.');
  const shots = p.shots.length ? parseShots(JSON.stringify({ shots:p.shots }), shotSchedule(Number(p.runtimeInput),Number(p.clipInput))) : [];
  return { topic:p.topic as string, tone:p.tone as string, runtimeInput:p.runtimeInput as string, clipInput:p.clipInput as string, story:p.story as string, feedback:p.feedback as string, shots };
}
export function parseArchive(text: string): StoryArchive {
  if (text.length > 500000) throw new Error('작업 파일은 500KB 이하여야 합니다.');
  const value = JSON.parse(text);
  if (!value || value.format !== 'bottopia-story-v1' || !Array.isArray(value.versions) || value.versions.length > 8) throw new Error('지원하지 않는 작업 파일입니다.');
  return { format:'bottopia-story-v1', current:parseProject(value.current), versions:value.versions.map((v: StoryVersion) => {
    if (!v || typeof v.savedAt !== 'string' || v.savedAt.length > 40 || !Number.isFinite(Date.parse(v.savedAt))) throw new Error('버전 정보가 올바르지 않습니다.');
    return { savedAt:v.savedAt, project:parseProject(v.project) };
  }) };
}
