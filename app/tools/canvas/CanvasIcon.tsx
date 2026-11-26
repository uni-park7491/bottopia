import type { SVGProps } from 'react';

const paths: Record<string, string> = {
  add: 'M12 5v14M5 12h14',
  select: 'm5 3 14 9-7 1-3 7-4-17Z',
  hand: 'M8 12V5a2 2 0 0 1 4 0v6-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v9c0 4-3 7-7 7h-1c-3 0-5-2-6-4l-3-5a2 2 0 0 1 3-2l2 2',
  history: 'M3 11a9 9 0 1 1 3 7M3 4v7h7M12 7v5l3 2',
  tools: 'm14 4 2 2-3 3-3-3 3-3a6 6 0 0 0-7 8L3 17a3 3 0 0 0 4 4l6-6a6 6 0 0 0 7-7l-3 3-3-3 3-3',
  keyboard: 'M3 5h18v14H3zM6 9h1m3 0h1m3 0h1m3 0h1M6 12h1m3 0h1m3 0h1m3 0h1M7 16h10',
  guide: 'M9 9a3 3 0 1 1 5 2c-1 1-2 1-2 3m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  arrange: 'M3 4h7v6H3zM14 4h7v6h-7zM3 14h7v6H3zM14 14h7v6h-7z',
  map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16',
  edge: 'M4 7h4c7 0 1 10 8 10h4M4 4v6m16 4v6',
  snap: 'M4 8V4h4m8 0h4v4M4 16v4h4m8 0h4v-4M9 9h6v6H9z',
  upload: 'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
  download: 'M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5',
  duplicate: 'M8 8h13v13H8zM16 8V3H3v13h5',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  group: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 8h8v8H8z',
  undo: 'm8 4-5 5 5 5M3 9h11a6 6 0 0 1 0 12',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  close: 'm6 6 12 12M6 18 18 6',
  chevron: 'm9 5 7 7-7 7',
  image: 'M3 4h18v16H3zM3 16l5-5 5 5 3-3 5 5M16 8h.01',
  video: 'M3 5h13v14H3zM16 9l5-3v12l-5-3',
  audio: 'M5 9v6m4-10v14m4-16v18m4-16v14m4-10v6',
  text: 'M4 5h16M12 5v15M8 20h8',
  script: 'M5 3h14v18H5zM8 7h8M8 11h8M8 15h5',
  arrow: 'M12 19V5m-6 6 6-6 6 6',
};

export default function CanvasIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: string }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] ?? paths.more} /></svg>;
}
