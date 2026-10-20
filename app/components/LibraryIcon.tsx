export default function LibraryIcon({ name }: { name: 'book' | 'code' | 'search' | 'play' | 'spark' }) {
  return <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {name === 'book' ? <><path d="M3 4h5a5 5 0 0 1 4 2 5 5 0 0 1 4-2h5v15h-5a5 5 0 0 0-4 2 5 5 0 0 0-4-2H3Z" /><path d="M12 6v15" /></> : name === 'code' ? <><path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18" /></> : name === 'search' ? <><circle cx="10.5" cy="10.5" r="7" /><path d="m16 16 5 5" /></> : name === 'play' ? <><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m10 8 6 4-6 4Z" /></> : <><path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z" /><path d="M20 2v4m-2-2h4" /></>}
  </svg>;
}
