export function normalizeQrUrl(value: string) {
  const url = new URL(value.trim());
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || value.length > 2000) throw new Error('2000자 이하의 http 또는 https 주소를 입력해주세요.');
  return url.href;
}
