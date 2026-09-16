// Only bundled synthetic reference voices are accepted; never user-supplied URLs.
export function referenceVoice(voice) {
  if (voice !== 'F1' && voice !== 'M1') throw new Error('여성 또는 남성 목소리를 선택해주세요.');
  return new URL(`./voices/${voice}.wav`, import.meta.url);
}

export async function loadReferenceVoice(voice, fetcher = fetch) {
  const response = await fetcher(referenceVoice(voice));
  if (!response.ok) throw new Error('기준 목소리를 불러오지 못했습니다. 다시 시도해주세요.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  const tag = offset => String.fromCharCode(...bytes.slice(offset, offset + 4));
  if (bytes.length < 44 || bytes.length > 2000000 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') {
    throw new Error('기준 목소리 파일이 올바르지 않습니다.');
  }
  return bytes;
}
