import test from 'node:test';
import assert from 'node:assert/strict';
import { MODELS, getCanvasModel, estimateGenerationCost } from '../lib/canvas/models.ts';

const refs = n => Array.from({ length: n }, () => ({ kind: 'image' }));
const estimate = (modelId, resolution, n = 0, extra = {}) => estimateGenerationCost({ modelId, resolution, references: refs(n), ...extra });

test('catalog contains only the four requested exact model families and dated primary prices', () => {
  assert.deepEqual(MODELS.map(model => model.id), ['seedream-5-pro', 'seedream-5-5', 'nano-banana-2-1', 'seedance-2-5']);
  assert.equal(getCanvasModel('seedream-5-lite'), undefined);
  assert.equal(getCanvasModel('nano-banana-2'), undefined);
  for (const model of MODELS) {
    assert.match(model.pricingSource, /^https:\/\//);
    assert.equal(model.checkedAt, '2026-11-26');
    assert.ok(model.priceNote);
    assert.equal(new Set(model.resolutions).size, model.resolutions.length);
  }
  assert.deepEqual(getCanvasModel('seedream-5-pro').resolutions, ['1K', '2K']);
  assert.deepEqual(getCanvasModel('seedream-5-5').resolutions, ['1K', '1.5K', '2K']);
  assert.deepEqual(getCanvasModel('nano-banana-2-1').resolutions, ['1K', '2K', '4K']);
  assert.equal(getCanvasModel('seedance-2-5').resolutions.includes('480p'), false);
});

test('Seedream Pro accounts for first-free references across its complete 0–10 range', () => {
  for (const [resolution, base] of [['1K', 0.035], ['2K', 0.07]]) {
    for (let n = 0; n <= 10; n++) {
      const quote = estimate('seedream-5-pro', resolution, n);
      assert.equal(quote.amount, Math.round((base + Math.max(0, n - 1) * 0.0025) * 1e6) / 1e6);
      assert.equal(quote.currency, 'USD');
      assert.equal(quote.approximate, false);
    }
  }
  assert.match(estimate('seedream-5-pro', '1K', 6).note, /다른 제공자/);
  assert.equal(estimate('seedream-5-pro', '1K', 6).amount, 0.0475);
  assert.equal(estimate('seedream-5-pro', '2K', 10).amount, 0.0925);
});

test('Seedream5.5 bills every reference at all three resolution tiers', () => {
  for (const [resolution, base] of [['1K', 0.018], ['1.5K', 0.018], ['2K', 0.0315]]) {
    for (let n = 0; n <= 10; n++) {
      assert.equal(estimate('seedream-5-5', resolution, n).amount, Math.round((base + n * 0.0072) * 1e6) / 1e6);
    }
  }
  assert.equal(estimate('seedream-5-5', '2K', 2).amount, 0.0459);
});

test('Nano2.1 uses the exact 2.1 listed output price with no invented input surcharge', () => {
  for (const [resolution, amount] of [['1K', 0.02], ['2K', 0.03], ['4K', 0.045]]) {
    for (let n = 0; n <= 10; n++) assert.equal(estimate('nano-banana-2-1', resolution, n).amount, amount);
  }
  assert.match(estimate('nano-banana-2-1', '1K', 1).note, /별도 참조 요금.*표시되지/);
});

test('quotes reject unsupported versions, sizes, media kinds and reference counts', () => {
  for (const input of [
    { modelId: 'seedream-5-lite', resolution: '1K', references: [] },
    { modelId: 'seedream-5-pro', resolution: '4K', references: [] },
    { modelId: 'seedream-5-5', resolution: '4K', references: [] },
    { modelId: 'nano-banana-2-1', resolution: '0.5K', references: [] },
    { modelId: 'seedream-5-pro', resolution: '1K', references: refs(11) },
    { modelId: 'seedream-5-5', resolution: '1K', references: [{ kind: 'audio', durationSeconds: 2 }] },
    { modelId: 'nano-banana-2-1', resolution: '1K', references: [{ kind: 'video', durationSeconds: 2 }] },
    { modelId: 'nano-banana-2-1', resolution: '1K', references: [{ kind: 'script' }] },
  ]) assert.throws(() => estimateGenerationCost(input));
});

test('video quote remains provisional and validates duration rather than implying a cost cap', () => {
  assert.equal(estimate('seedance-2-5', '720p', 0, { durationSeconds: 5 }).approximate, true);
  for (const durationSeconds of [0, 3, 4.5, 31, NaN, Infinity]) {
    assert.throws(() => estimate('seedance-2-5', '720p', 0, { durationSeconds }));
  }
});

test('video pricing uses the explicitly selected provider without switching to a more expensive route', () => {
  assert.equal(getCanvasModel('seedance-2-5').providerId, 'opensand');
  assert.match(getCanvasModel('seedance-2-5').configurationNote, /요청 규격.*기다리고/);
  assert.equal(getCanvasModel('seedance-2-5', 'beat').providerId, 'beat');
  assert.equal(getCanvasModel('seedance-2-5', 'beat').configurationNote, undefined);
  assert.equal(getCanvasModel('seedance-2-5', 'unsupported'), undefined);
  assert.equal(getCanvasModel('seedream-5-pro', 'beat'), undefined);
  assert.equal(estimate('seedance-2-5', '720p', 0, { durationSeconds: 5 }).amount, 0.936036);
  assert.equal(estimate('seedance-2-5', '1080p', 0, { durationSeconds: 10 }).amount, 4.605822);
  assert.equal(estimate('seedance-2-5', '720p', 0, { durationSeconds: 5, providerId: 'beat' }).amount, 0.97);
  assert.equal(estimateGenerationCost({ modelId: 'seedance-2-5', resolution: '720p', durationSeconds: 5, references: [] }, 'beat').amount, 0.97);
  assert.throws(() => estimateGenerationCost({ modelId: 'seedance-2-5', providerId: 'opensand', resolution: '720p', durationSeconds: 5, references: [] }, 'beat'));
  const videoQuote = estimateGenerationCost({ modelId: 'seedance-2-5', resolution: '1080p', durationSeconds: 5, providerId: 'beat', references: [{ kind: 'video', durationSeconds: 10 }] });
  assert.equal(videoQuote.amount, 4.305);
  assert.equal(videoQuote.approximate, true);
  assert.match(estimate('seedance-2-5', '720p', 0, { durationSeconds: 5 }).note, /16:9.*24fps/);
});

test('video reference estimates enforce provider limits and known input duration totals', () => {
  for (const references of [
    [{ kind: 'video' }], [{ kind: 'audio', durationSeconds: NaN }],
    [{ kind: 'video', durationSeconds: 16 }, { kind: 'video', durationSeconds: 15 }],
    [{ kind: 'audio', durationSeconds: 31 }], refs(31),
    Array.from({ length: 11 }, () => ({ kind: 'video', durationSeconds: 1 })),
  ]) assert.throws(() => estimateGenerationCost({ modelId: 'seedance-2-5', providerId: 'beat', resolution: '720p', durationSeconds: 5, references }));
  assert.throws(() => estimateGenerationCost({ modelId: 'seedance-2-5', resolution: '720p', durationSeconds: 5, references: [{ kind: 'video', durationSeconds: 5 }] }));
});
