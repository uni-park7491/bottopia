'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- UXP plugin modules use CommonJS. */
const { wrap, shotText } = require('./project.js');
function boardPages(project) {
  const title = wrap(project.title, 64);
  const header = 100 + title.split('\r').length * 42;
  const pages = [];
  for (let offset = 0; offset < project.shots.length; offset += 4) {
    const shots = project.shots.slice(offset, offset + 4);
    const cards = shots.map((shot, i) => {
      const notes = shotText(shot, 40);
      return { shot, notes, x: 80 + (i % 2) * 1080, row: Math.floor(i / 2), height: 620 + notes.split('\r').length * 32 };
    });
    const rows = [0, 1].map(row => Math.max(0, ...cards.filter(c => c.row === row).map(c => c.height)));
    cards.forEach(card => { card.y = header + (card.row ? rows[0] + 80 : 0); });
    pages.push({ number: pages.length + 1, width: 2240, height: header + rows.reduce((a, b) => a + b, 0) + (rows[1] ? 80 : 0) + 80, title, cards });
  }
  return pages;
}
function fitImage(bounds, box) {
  const width = bounds.right - bounds.left, height = bounds.bottom - bounds.top;
  if (![width, height, box.width, box.height].every(n => Number.isFinite(n) && n > 0)) throw new Error('이미지 크기를 확인하지 못했습니다.');
  return Math.min(box.width / width, box.height / height) * 100;
}
// Inspect headers before passing a file to Photoshop's image decoder.
function imageSize(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 24 || bytes.length > 10 * 1024 * 1024) throw new Error('이미지는 10MB 이하 PNG/JPEG만 지원합니다.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width, height;
  if ([137,80,78,71,13,10,26,10].every((n, i) => bytes[i] === n) && view.getUint32(12) === 0x49484452) {
    width = view.getUint32(16); height = view.getUint32(20);
  } else if (bytes[0] === 255 && bytes[1] === 216) {
    let pos = 2;
    while (pos + 4 <= bytes.length) {
      if (bytes[pos++] !== 255) break;
      while (bytes[pos] === 255) pos++;
      const marker = bytes[pos++];
      if (marker === 0xda || marker === 0xd9 || pos + 2 > bytes.length) break;
      const length = view.getUint16(pos);
      if (length < 2 || pos + length > bytes.length) break;
      if ([0xc0,0xc1,0xc2].includes(marker) && length >= 8) { height = view.getUint16(pos + 3); width = view.getUint16(pos + 5); break; }
      pos += length;
    }
  }
  if (!width || !height || width > 8192 || height > 8192 || width * height > 16000000) throw new Error('16메가픽셀 이하의 올바른 PNG/JPEG를 선택해주세요.');
  return { width, height };
}
module.exports = { boardPages, fitImage, imageSize };
