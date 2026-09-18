'use client';

import { useEffect, useState } from 'react';

const key = 'bottopia-theme';
export default function ThemeSwitch() {
  const [dark, setDark] = useState(false);
  const [manual, setManual] = useState(false);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem(key); } catch {}
      const explicit = saved === 'light' || saved === 'dark';
      const next = explicit ? saved === 'dark' : media.matches;
      document.documentElement.dataset.theme = next ? 'dark' : 'light';
      setDark(next); setManual(explicit);
    };
    sync();
    media.addEventListener('change', sync);
    window.addEventListener('storage', sync);
    window.addEventListener('bottopia-theme-change', sync);
    return () => {
      media.removeEventListener('change', sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener('bottopia-theme-change', sync);
    };
  }, []);
  function toggle() {
    const next = !dark;
    try { localStorage.setItem(key, next ? 'dark' : 'light'); } catch {}
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    setDark(next); setManual(true);
  }
  function reset() {
    try { localStorage.removeItem(key); } catch {}
    const next = matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    setDark(next); setManual(false);
  }
  return <div className="theme-control">
    <button type="button" className="theme-switch" role="switch" aria-checked={dark} aria-label="밤 테마" title={dark ? '낮 테마로 전환' : '밤 테마로 전환'} onClick={toggle}>
      <span className="theme-thumb" />
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z"/></svg>
    </button>
    {manual && <button type="button" className="theme-auto" onClick={reset} title="기기 설정에 맞춰 자동 전환">자동</button>}
  </div>;
}
