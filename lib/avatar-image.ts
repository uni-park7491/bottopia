import sharp from 'sharp';

export const MAX_AVATAR_BYTES = 1024 * 1024;
export async function normalizeAvatar(input: Uint8Array) {
  if (!input.byteLength || input.byteLength > MAX_AVATAR_BYTES) throw new Error('사진 용량이 너무 큽니다.');
  const image = sharp(input, { limitInputPixels: 4096 * 4096, failOn: 'warning' });
  const metadata = await image.metadata();
  if (!['jpeg', 'png', 'webp', 'avif', 'heif'].includes(metadata.format || '')) throw new Error('지원하지 않는 이미지 형식입니다.');
  return image.rotate().resize(512, 512, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
}
