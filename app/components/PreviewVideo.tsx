'use client';
import { useEffect, useRef, useState } from 'react';

// Load only nearby previews; avoid fetching every video on initial page load.
export default function PreviewVideo({ src, poster, refreshSrc }: { src: string; poster?: string; refreshSrc?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [nearby, setNearby] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setNearby(true);
      else video.pause();
    }, { rootMargin: '160px' });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);
  return <video ref={ref} src={nearby ? src : undefined} poster={poster} muted loop playsInline onError={event => {
    const video = event.currentTarget;
    if (refreshSrc && video.dataset.refreshed !== src) {
      video.dataset.refreshed = src;
      video.src = refreshSrc;
      video.load();
      void video.play().catch(() => undefined);
    }
  }} onLoadedMetadata={event => { if (!poster && Number.isFinite(event.currentTarget.duration)) event.currentTarget.currentTime = Math.min(.5, event.currentTarget.duration / 2); }} preload={poster ? 'none' : 'metadata'} />;
}
