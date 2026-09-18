export const watermarkFonts = [
  { id: 'gothic', label: '나눔고딕', family: 'NanumGothic', weight: '400', file: 'NanumGothic-Regular.ttf', license: 'nanumgothic' },
  { id: 'gothic-bold', label: '나눔고딕 Bold', family: 'NanumGothic', weight: '700', file: 'NanumGothic-Bold.ttf', license: 'nanumgothic' },
  { id: 'myeongjo', label: '나눔명조', family: 'NanumMyeongjo', weight: '400', file: 'NanumMyeongjo-Regular.ttf', license: 'nanummyeongjo' },
  { id: 'pen', label: '나눔손글씨 펜', family: 'NanumPen', weight: '400', file: 'NanumPenScript-Regular.ttf', license: 'nanumpenscript' },
] as const;
export type WatermarkFont = typeof watermarkFonts[number];
export function watermarkCanvasFont(font: WatermarkFont, size: number) {
  return `${font.weight} ${size}px "${font.family}"`;
}
const pending = new Map<string, Promise<void>>();
export function loadWatermarkFont(font: WatermarkFont): Promise<void> {
  const cached = pending.get(font.id);
  if (cached) return cached;
  const task = new FontFace(font.family, `url(/fonts/watermark/${font.file})`, { weight: font.weight }).load()
    .then(face => { document.fonts.add(face); })
    .catch(error => { pending.delete(font.id); throw error; });
  pending.set(font.id, task);
  return task;
}
