export function characterPrompt(description: string, reference: boolean) {
  if (typeof description !== 'string' || description.length > 1500 || (!description.trim() && !reference)) throw new Error('사진 또는 캐릭터 설명을 입력해주세요.');
  return `Create ONE finished character design reference sheet as a single unified landscape image on a clean warm-white background. Freeform editorial composition, generous negative space, varied illustration sizes. NO grid, NO panels, NO boxes, NO dividing lines, NO comic frames, NO text labels.
${reference ? 'Use the person or character in the reference image as the strict identity anchor. Preserve facial structure, hairstyle, age appearance, skin tone and visible costume details. This is the SAME character in every depiction, not a cast of different people.' : 'Design one original character from the description and keep the identical face, hairstyle, proportions and costume in every depiction.'}
One large full-body hero view on the left. Smaller three-quarter, side and rear full-body views arranged freely nearby. Facial studies with neutral, smiling and angry expressions. Extreme close-up studies of the eye, lips and hair. Isolated costume fastenings and the character accessory as small detail studies. Every study floats on the same continuous background without borders. Consistent lighting and rendering style throughout. Clear uncropped silhouettes, coherent anatomy. Produce the complete artwork, not instructions or a template.
Character direction: ${description.trim() || 'Keep the reference design. Invent only details not visible in the reference.'}`;
}

export function localCharacterRequestAllowed(url: string, origin: string | null, development: boolean, host?: string | null) {
  if (!development) return false;
  try {
    const target = new URL(url);
    if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.protocol !== 'http:') return false;
    if (!host) return origin === target.origin;
    const browser = new URL(`http://${host}`);
    return browser.host === host && ['127.0.0.1', 'localhost'].includes(browser.hostname)
      && browser.port === target.port && origin === browser.origin;
  } catch { return false; }
}
