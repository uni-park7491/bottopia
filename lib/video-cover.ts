// Local-only cover extraction: no paid service or extra video upload.
export async function videoCover(file: File): Promise<File | null> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.preload = 'auto';
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('Cover timeout')), 10000);
      const finish = () => { clearTimeout(timer); resolve(); };
      video.onerror = () => { clearTimeout(timer); reject(new Error('Unsupported video')); };
      video.onloadeddata = () => {
        if (video.duration > .5) { video.onseeked = finish; video.currentTime = .5; }
        else finish();
      };
      video.src = url;
    });
    if (!video.videoWidth || !video.videoHeight) return null;
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(960, video.videoWidth);
    canvas.height = Math.round(canvas.width * video.videoHeight / video.videoWidth);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', .82));
    return blob ? new File([blob], 'cover.jpg', { type: 'image/jpeg' }) : null;
  } catch { return null; }
  finally { video.onloadeddata = null; video.onseeked = null; video.onerror = null; video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url); }
}
