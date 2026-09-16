export type CharacterSheet = { name: string; appearance: string; personality: string; colors: string[]; images: string[] };
export const sheetLabels = ['정면', '측면', '후면', '표정 / 디테일'];
export const emptySheet = (): CharacterSheet => ({ name: '', appearance: '', personality: '', colors: ['#6c50e0', '#d3ff63', '#201a33'], images: ['', '', '', ''] });

export function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('이미지를 열지 못했습니다. JPG, PNG, WebP 파일을 확인해주세요.')); img.src = source; });
}
export async function normalizeImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024 || file.size === 0) throw new Error('JPG, PNG, WebP 이미지 한 장을 5MB 이하로 선택해주세요.');
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 24000000) throw new Error('이미지는 2,400만 화소 이하로 줄여주세요.');
    const scale = Math.min(1, 1000 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('이 브라우저에서 이미지 처리를 지원하지 않습니다.');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}
export function parseSheet(value: unknown): CharacterSheet {
  if (!value || typeof value !== 'object') throw new Error('캐릭터 시트 작업 파일이 아닙니다.');
  const data = value as Record<string, unknown>;
  if (data.format !== 'bottopia-character-v1') throw new Error('지원하지 않는 작업 파일입니다.');
  for (const [key, max] of [['name', 40], ['appearance', 240], ['personality', 160]] as const) {
    if (typeof data[key] !== 'string' || data[key].length > max) throw new Error('캐릭터 설정 형식을 확인해주세요.');
  }
  if (!Array.isArray(data.colors) || data.colors.length !== 3 || !data.colors.every(c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c))) throw new Error('색상 형식을 확인해주세요.');
  if (!Array.isArray(data.images) || data.images.length !== 4 || !data.images.every(src => typeof src === 'string' && (src === '' || src.length <= 6000000 && /^data:image\/png;base64,[a-zA-Z0-9+/]+=*$/.test(src)))) throw new Error('작업 파일에는 PNG 이미지 데이터만 포함할 수 있습니다.');
  return { name: data.name as string, appearance: data.appearance as string, personality: data.personality as string, colors: data.colors, images: data.images };
}
function textBlock(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, maxLines: number) {
  const lines: string[] = []; let line = '';
  for (const ch of text) {
    if (ch === '\n' || ctx.measureText(line + ch).width > width) { lines.push(line); line = ch === '\n' ? '' : ch; } else line += ch;
  }
  lines.push(line);
  lines.slice(0, maxLines).forEach((entry, i) => ctx.fillText(i === maxLines - 1 && lines.length > maxLines ? entry.slice(0, -1) + '…' : entry, x, y + i * 32));
}
export async function drawSheet(canvas: HTMLCanvasElement, sheet: CharacterSheet) {
  const images = await Promise.all(sheet.images.map(src => src ? loadImage(src) : null));
  if (images.some(img => img && (img.naturalWidth > 1000 || img.naturalHeight > 1000))) throw new Error('저장 파일의 이미지는 1,000px 이하여야 합니다.');
  canvas.width = 1600; canvas.height = 1400;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('이 브라우저에서 시트 만들기를 지원하지 않습니다.');
  ctx.fillStyle = '#f8f7fc'; ctx.fillRect(0, 0, 1600, 1400);
  ctx.fillStyle = '#231c39'; ctx.fillRect(0, 0, 1600, 150);
  ctx.fillStyle = '#d3ff63'; ctx.font = '18px sans-serif'; ctx.fillText('BOTTOPIA / CHARACTER SHEET', 64, 42);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 44px sans-serif'; ctx.fillText(sheet.name || '이름 없는 캐릭터', 64, 108, 1460);
  images.forEach((img, i) => {
    const x = 64 + (i % 2) * 760; const y = 190 + Math.floor(i / 2) * 390;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 712, 340); ctx.strokeStyle = '#d7d0e5'; ctx.strokeRect(x, y, 712, 340);
    if (img) { const scale = Math.min(680 / img.naturalWidth, 312 / img.naturalHeight); const w = img.naturalWidth * scale, h = img.naturalHeight * scale; ctx.drawImage(img, x + (712 - w) / 2, y + (340 - h) / 2, w, h); }
    else { ctx.fillStyle = '#777080'; ctx.font = '24px sans-serif'; ctx.fillText('이미지 없음', x + 290, y + 175); }
    ctx.fillStyle = '#514565'; ctx.font = '20px sans-serif'; ctx.fillText(`${String(i + 1).padStart(2, '0')} / ${sheetLabels[i]}`, x, y + 372);
  });
  ctx.fillStyle = '#201a33'; ctx.font = 'bold 22px sans-serif'; ctx.fillText('외형 / 유지할 특징', 64, 1030); ctx.fillText('성격 / 설정', 824, 1030);
  ctx.font = '22px sans-serif'; textBlock(ctx, sheet.appearance || '—', 64, 1070, 700, 7); textBlock(ctx, sheet.personality || '—', 824, 1070, 700, 7);
  sheet.colors.forEach((color, i) => { const x = 64 + i * 220; ctx.fillStyle = color; ctx.fillRect(x, 1330, 40, 28); ctx.strokeStyle = '#bcb6ca'; ctx.strokeRect(x, 1330, 40, 28); ctx.fillStyle = '#514565'; ctx.font = '18px sans-serif'; ctx.fillText(color.toUpperCase(), x + 54, 1351); });
  ctx.fillStyle = '#756b86'; ctx.font = '18px sans-serif'; ctx.fillText('Assembled locally · bottopia.studio', 1170, 1351);
}
