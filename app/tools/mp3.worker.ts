import { Mp3Encoder } from '@breezystack/lamejs';

self.onmessage = ({ data }: MessageEvent<ArrayBuffer>) => {
  try {
    const v = new DataView(data);
    const label = (offset: number, length: number) => String.fromCharCode(...new Uint8Array(data, offset, length));
    if (data.byteLength < 44 || label(0,4) !== 'RIFF' || label(8,4) !== 'WAVE' || label(36,4) !== 'data' || v.getUint16(20,true) !== 1 || v.getUint16(22,true) !== 1 || v.getUint16(34,true) !== 16) throw new Error('지원하지 않는 음성 형식입니다.');
    const rate = v.getUint32(24,true), count = v.getUint32(40,true) / 2;
    if (![24000,44100,48000].includes(rate) || count < 1 || count > rate * 180 || 44 + count * 2 !== data.byteLength) throw new Error('음성 데이터가 올바르지 않습니다.');
    const samples = new Int16Array(count);
    for (let i=0;i<count;i++) samples[i] = v.getInt16(44+i*2,true);
    const encoder = new Mp3Encoder(1, rate, 128);
    const parts: Uint8Array[] = [];
    for (let i=0;i<count;i+=1152) parts.push(new Uint8Array(encoder.encodeBuffer(samples.subarray(i,i+1152))));
    parts.push(new Uint8Array(encoder.flush()));
    self.postMessage({ blob: new Blob(parts as BlobPart[], { type: 'audio/mpeg' }) });
  } catch { self.postMessage({ error: 'MP3 변환에 실패했습니다. WAV로 저장하거나 다시 시도해주세요.' }); }
};
