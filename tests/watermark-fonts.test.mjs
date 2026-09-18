import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { watermarkFonts, watermarkCanvasFont, loadWatermarkFont } from '../app/tools/watermark-fonts.ts';

test('four original TTF choices include copyright and OFL license', () => {
  assert.equal(watermarkFonts.length, 4);
  for (const font of watermarkFonts) {
    const bytes = readFileSync(new URL('../public/fonts/watermark/' + font.file, import.meta.url));
    assert.equal(bytes.readUInt32BE(0), 0x00010000);
    const license = readFileSync(new URL('../public/fonts/watermark/' + font.license + '-OFL.txt', import.meta.url), 'utf8');
    assert.match(license, /Copyright/);
    assert.match(license, /SIL OPEN FONT LICENSE/);
    assert.match(watermarkCanvasFont(font, 24), new RegExp('^' + font.weight + ' 24px'));
  }
});

test('font loader caches successful downloads and retries failures', async () => {
  const oldFontFace = globalThis.FontFace, oldDocument = globalThis.document;
  let calls = 0, added = 0, fail = true;
  globalThis.document = { fonts: { add() { added++; } } };
  globalThis.FontFace = class {
    constructor(family, url, options) {
      assert.match(url, /^url\(\/fonts\/watermark\//);
      assert.ok(options.weight);
      this.family = family;
    }
    async load() { calls++; if (fail) throw Error('offline'); return this; }
  };
  try {
    await assert.rejects(loadWatermarkFont(watermarkFonts[0]), /offline/);
    fail = false;
    await Promise.all([loadWatermarkFont(watermarkFonts[0]), loadWatermarkFont(watermarkFonts[0])]);
    assert.equal(calls, 2);
    assert.equal(added, 1);
  } finally {
    globalThis.FontFace = oldFontFace;
    globalThis.document = oldDocument;
  }
});
