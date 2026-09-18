import {parseIntroLinks} from './recruitment-links.ts';
export const recruitmentRoles = ['영상', '음악', '사운드', '시나리오', '디자인', '개발', '기타'] as const;
export const compensationTypes = ['무보수 협업', '유료 협업', '수익 배분', '협의'] as const;
export function parseKeywords(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 8 || value.some(v => typeof v !== 'string' || !v.trim() || v.trim().length > 24)) return null;
  return [...new Set(value.map(v => v.trim().toLowerCase()))];
}
export function parseRecruitment(value: Record<string, unknown>) {
  const text = (key: string) => typeof value[key] === 'string' ? (value[key] as string).trim() : '';
  const title = text('title'), body = text('body'), schedule = text('schedule'), contact = text('contact');
  const tags = parseKeywords(value.tags);
  if (title.length < 4 || title.length > 80 || body.length < 20 || body.length > 2000 || !schedule || schedule.length > 100 || !tags?.length) return null;
  if (!compensationTypes.some(v => v === value.compensation)) return null;
  try { const url = new URL(contact); if (url.protocol !== 'https:' || url.username || url.password || contact.length > 500) return null; } catch { return null; }
  const links=value.introLinks===undefined?null:parseIntroLinks(value.introLinks);
  if(value.introLinks!==undefined&&!links)return null;
  return { title, body, schedule, contact_url: links?.[0]||contact, ...(links?{intro_urls:links}:{}), tags, compensation: value.compensation as string };
}
