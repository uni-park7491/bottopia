import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { normalizeAvatar, MAX_AVATAR_BYTES } from '../lib/avatar-image.ts';

test('avatar becomes a small 512px WebP without original metadata', async () => {
  const source = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#6754ff' } }).png().toBuffer();
  const output = await normalizeAvatar(source);
  const meta = await sharp(output).metadata();
  assert.equal(meta.width, 512);
  assert.equal(meta.height, 512);
  assert.equal(meta.format, 'webp');
  assert.equal(meta.exif, undefined);
  assert.ok(output.length < MAX_AVATAR_BYTES);
});
test('avatar rejects oversized, malformed, and vector uploads', async () => {
  await assert.rejects(() => normalizeAvatar(new Uint8Array(MAX_AVATAR_BYTES + 1)));
  await assert.rejects(() => normalizeAvatar(Buffer.from('not an image')));
  await assert.rejects(() => normalizeAvatar(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100"/></svg>')));
});
