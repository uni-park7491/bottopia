export function validateSpeech(text, voice, speed) {
  if (typeof text !== 'string' || !text.trim() || text.length > 500 || /[\u0000-\u0008]/.test(text) || !/[\p{L}\p{N}]/u.test(text)) throw new Error('읽을 대사를 1~500자로 입력해주세요.');
  if (!['F1', 'M1'].includes(voice)) throw new Error('지원하지 않는 목소리입니다.');
  if (!Number.isFinite(speed) || speed < 0.8 || speed > 1.3) throw new Error('속도를 확인해주세요.');
  return text.trim();
}
export function splitSpeech(text, limit = 100) {
  if (!Number.isInteger(limit) || limit < 2) throw new Error('Invalid chunk limit');
  const chunks = [];
  let rest = text.trim();
  while (rest.length > limit) {
    const window = rest.slice(0, limit + 1);
    const boundaries = [...window.matchAll(/[.!?。！？]\s+|\s+/gu)];
    const boundary = boundaries.at(-1);
    let cut = boundary ? boundary.index + boundary[0].trimEnd().length : limit;
    if (cut < limit / 2) cut = limit;
    // Never cut a Unicode surrogate pair in half.
    if (/[\uD800-\uDBFF]/.test(rest[cut - 1])) cut--;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}
export function encodeSpeech(samples, sampleRate) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 48000 || samples.length < sampleRate / 10 || samples.length > sampleRate * 180) throw new Error('음성 길이나 형식이 올바르지 않습니다.');
  let peak = 0;
  for (const sample of samples) { if (!Number.isFinite(sample)) throw new Error('음성 데이터에 오류가 있습니다.'); peak = Math.max(peak, Math.abs(sample)); }
  if (peak < 0.0001) throw new Error('소리가 없는 결과입니다. 다시 생성해주세요.');
  const buffer = new ArrayBuffer(44 + samples.length * 2), view = new DataView(buffer);
  for (const [offset, label] of [[0, 'RIFF'], [8, 'WAVE'], [12, 'fmt '], [36, 'data']]) for (let i = 0; i < label.length; i++) view.setUint8(offset + i, label.charCodeAt(i));
  view.setUint32(4, buffer.byteLength - 8, true); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), true);
  return buffer;
}
