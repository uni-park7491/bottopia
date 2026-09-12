export const profileRoles = ['MEMBER', 'CREATOR', 'FOUNDING_CREATOR', 'ADMIN'] as const;
export type ProfileRole = (typeof profileRoles)[number];

export const creatorStatuses = ['PENDING', 'APPROVED', 'SUSPENDED'] as const;
export type CreatorStatus = (typeof creatorStatuses)[number];

export const socialFields = ['instagramUrl', 'xUrl', 'youtubeUrl', 'tiktokUrl', 'websiteUrl'] as const;
export type SocialField = (typeof socialFields)[number];

// Only explicitly published contact addresses are stored. Never use auth email as a fallback.
export function publicContactEmail(value: unknown, publish: unknown): string | null {
  if (publish !== true) return null;
  if (typeof value !== 'string') throw new Error('공개할 연락 이메일을 입력해주세요.');
  const email = value.trim();
  if (email.length > 254 || !/^[A-Za-z0-9.!#$%&'*+/=^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(email)) {
    throw new Error('올바른 연락 이메일을 입력해주세요.');
  }
  return email;
}

export function normalizeHandle(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '')
    .replace(/[._-]{2,}/g, '-')
    .slice(0, 30);
}

export function validHandle(value: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$/.test(value);
}

export function normalizeSocialUrl(value: unknown): string | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 500) return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function creatorInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'BT';
  return parts.slice(0, 2).map((part) => Array.from(part)[0]).join('').toUpperCase();
}
