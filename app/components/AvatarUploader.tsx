'use client';
import { useRef, useState } from 'react';
import FileDropInput from './FileDropInput';

export default function AvatarUploader({ onUploaded, disabled }: { onUploaded: (version: number) => void; disabled?: boolean }) {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function upload(file: File) {
    if (inFlight.current || disabled) return;
    inFlight.current = true;
    setBusy(true); setMessage('');
    let bitmap: ImageBitmap | undefined;
    try {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('JPG, PNG, WebP, AVIF 형식으로 10MB 이하 사진을 선택해주세요.');
      bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 512;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('이 브라우저에서는 사진을 변환할 수 없습니다.');
      const side = Math.min(bitmap.width, bitmap.height);
      context.drawImage(bitmap, (bitmap.width-side)/2, (bitmap.height-side)/2, side, side, 0, 0, 512, 512);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', .85));
      if (!blob) throw new Error('사진을 변환하지 못했습니다.');
      const response = await fetch('/api/profile/avatar', { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '사진을 저장하지 못했습니다.');
      onUploaded(data.version);
      setMessage('프로필 사진이 저장되었습니다.');
    } catch (error) { setMessage(error instanceof Error ? error.message : '사진 업로드에 실패했습니다.'); }
    finally { bitmap?.close(); setBusy(false); inFlight.current = false; }
  }
  return <div className="avatar-upload"><FileDropInput label="프로필 사진" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy || disabled}
    validate={file => !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) || !file.size || file.size > 10 * 1024 * 1024 ? 'JPG, PNG, WebP, AVIF 형식으로 10MB 이하 사진을 선택해주세요.' : null}
    onFile={file => { void upload(file); }} hint="10MB 이하 · 정사각형으로 중앙을 잘라 즉시 저장합니다." /><p role="status">{busy ? '사진을 저장하는 중…' : message}</p></div>;
}
