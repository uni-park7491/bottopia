import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { boardPages, fitImage, imageSize } = createRequire(import.meta.url)('../extensions/photoshop-shot-desk/board.js');
test('all 32 shots remain ordered across eight bounded nonoverlapping board pages', () => {
  const project = { title: '한'.repeat(1200), shots: Array.from({ length: 32 }, (_, i) => ({ index: i + 1, start: i * 3, duration: 3, visual: '화'.repeat(500), camera: '카'.repeat(500), audio: '소'.repeat(500) })) };
  const pages = boardPages(project);
  assert.equal(pages.length, 8);
  assert.deepEqual(pages.flatMap(p => p.cards.map(c => c.shot.index)), project.shots.map(s => s.index));
  for (const page of pages) {
    assert.ok(page.height < 6000);
    for (const card of page.cards) {
      assert.ok(card.x + 1000 <= page.width - 80);
      assert.ok(card.y + card.height <= page.height - 80);
      assert.ok(card.notes.split('\r').every(line => Array.from(line).length <= 40));
    }
    assert.ok(page.cards[2].y >= page.cards[0].y + page.cards[0].height + 80);
  }
});
test('single and partial last pages keep only requested shots', () => {
  for (const count of [1, 2, 3, 5, 27]) {
    const shots = Array.from({ length: count }, (_, i) => ({ index: i + 1, start: i, duration: 1, visual: '걷기', camera: '고정', audio: '바람' }));
    const pages = boardPages({ title: '제목', shots });
    assert.equal(pages.length, Math.ceil(count / 4));
    assert.equal(pages.flatMap(p => p.cards).length, count);
  }
});
test('image fit preserves aspect ratio and rejects invalid geometry', () => {
  assert.equal(fitImage({ left: 0, top: 0, right: 2000, bottom: 1000 }, { width: 1000, height: 562 }), 50);
  assert.throws(() => fitImage({ left: 0, top: 0, right: 0, bottom: 100 }, { width: 1000, height: 562 }));
});
function png(width, height) {
  const bytes = new Uint8Array(24); bytes.set([137,80,78,71,13,10,26,10]);
  const v = new DataView(bytes.buffer); v.setUint32(12, 0x49484452); v.setUint32(16, width); v.setUint32(20, height); return bytes.buffer;
}
test('image headers enforce format, dimensions and byte limits before host decode', () => {
  assert.deepEqual(imageSize(png(1920, 1080)), { width: 1920, height: 1080 });
  for (const data of [png(0, 1), png(8193, 1), png(5000, 5000), new ArrayBuffer(30), new ArrayBuffer(10 * 1024 * 1024 + 1)]) assert.throws(() => imageSize(data));
  const jpg = new Uint8Array(24); jpg.set([255,216,255,192,0,17,8,4,56,7,128]);
  assert.deepEqual(imageSize(jpg.buffer), { width: 1920, height: 1080 });
});
