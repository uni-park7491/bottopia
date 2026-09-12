// Keep these limits aligned with supabase/schema.sql and the project's Free plan.
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_POSTER_BYTES = 10 * 1024 * 1024;

const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export function workMediaId(videoKey: string, posterKey: unknown): string | null {
  const match = /^works\/([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})\/video\.(mp4|webm|mov)$/i.exec(videoKey);
  if (!match) return null;
  if (posterKey && (typeof posterKey !== 'string' || !new RegExp('^works/' + match[1] + '/poster\\.(jpg|jpeg|png|webp|avif)$', 'i').test(posterKey))) return null;
  return match[1];
}

export function uploadError(kind: unknown, type: unknown, size: unknown): string | null {
  if (kind !== 'video' && kind !== 'poster') return '올바른 업로드 종류를 선택해주세요.';
  const video = kind === 'video';
  const allowed = video ? VIDEO_TYPES : IMAGE_TYPES;
  if (typeof type !== 'string' || !allowed.has(type) || typeof size !== 'number'
    || !Number.isSafeInteger(size) || size <= 0 || size > (video ? MAX_VIDEO_BYTES : MAX_POSTER_BYTES)) {
    return video
      ? '지원되는 영상은 MP4, WebM, MOV이며 최대 50MB입니다.'
      : '커버는 JPG, PNG, WebP, AVIF 형식으로 10MB 이하만 가능합니다.';
  }
  return null;
}
