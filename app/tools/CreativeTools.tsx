'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const StoryBuilder = dynamic(() => import('./StoryBuilder'), { loading: () => <p role="status">시나리오 작업실을 불러오는 중…</p> });
const LocalNarration = dynamic(() => import('./LocalNarration'), { loading: () => <p role="status">TTS 작업실을 불러오는 중…</p> });
const WatermarkTool = dynamic(() => import('./WatermarkTool'));
const QrTool = dynamic(() => import('./QrTool'));
const CanvasWorkspace = dynamic(() => import('./canvas/CanvasWorkspace'), { loading: () => <p role="status">캔버스를 불러오는 중…</p> });
type ToolTab = 'canvas' | 'scenes' | 'audio' | 'watermark' | 'qr' | 'templates' | 'plugins';

export default function CreativeTools({ memberId, initialTab = 'canvas', initialEngine = 'supertonic' }: { memberId: string; initialTab?: 'canvas' | 'scenes' | 'audio'; initialEngine?: 'supertonic' | 'qwen' }) {
  const [tab, setTab] = useState<ToolTab>(initialTab);
  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const toolMenu = useRef<HTMLDivElement>(null);
  const toolMenuOpener = useRef<HTMLElement | null>(null);
  const [visited, setVisited] = useState<Record<ToolTab,boolean>>({ canvas: initialTab === 'canvas', scenes: initialTab === 'scenes', audio: initialTab === 'audio', watermark:false,qr:false,templates:false,plugins:false });
  function selectTab(next: ToolTab) {
    setVisited(previous => ({ ...previous, [next]: true }));
    setToolMenuOpen(false);
    setTab(next);
  }
  useEffect(() => {
    if (!toolMenuOpen) return;
    toolMenu.current?.querySelector('button')?.focus();
    function dismiss(event: KeyboardEvent) {
      if (event.key === 'Escape') { setToolMenuOpen(false); event.preventDefault(); }
    }
    document.addEventListener('keydown', dismiss);
    return () => {
      document.removeEventListener('keydown', dismiss);
      toolMenuOpener.current?.focus({ preventScroll: true });
    };
  }, [toolMenuOpen]);
  return <main className={`creative-tools${tab === 'canvas' ? ' is-canvas-tool' : ''}`} lang="ko">
    {tab !== 'canvas' && <>
    <header className="tools-heading"><div><p>BOTTOPIA WORKSPACE</p><h1>아이디어를 연결하고, 만들어보세요.</h1></div><span>내 기기에서 실행</span></header>
    <p className="tools-intro">캔버스에 아이디어와 참고자료를 놓고, 연결한 노드에서 이미지와 영상을 만드세요.</p>
    <nav className="tool-tabs" aria-label="창작 도구 선택">
      <button aria-pressed={false} onClick={() => selectTab('canvas')}><strong><span aria-hidden="true">⌘</span> 캔버스</strong><span>노드로 연결하는 이미지·영상 작업실</span></button>
      <button aria-pressed={tab === 'scenes'} onClick={() => selectTab('scenes')}><strong><span aria-hidden="true">✦</span> 시나리오 & 샷리스트</strong><span>이야기를 다듬고 장면으로 나누기</span></button>
      <button aria-pressed={tab === 'audio'} onClick={() => selectTab('audio')}><strong><span aria-hidden="true">♫</span> TTS</strong><span>음성 생성 · MP3·WAV 저장</span></button>
      <button aria-pressed={tab === 'watermark'} onClick={() => selectTab('watermark')}><strong><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m5 16 1-5L16 1l5 5-10 10-6 1Zm9-13 5 5M3 21h18"/></svg>워터마크</strong><span>이미지·영상에 서명하기</span></button>
      <button aria-pressed={tab === 'qr'} onClick={() => selectTab('qr')}><strong><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h3v3h3v3h-6v-6ZM12 3v9H3M21 12h-9v9"/></svg>QR 코드</strong><span>링크를 PNG·SVG로</span></button>
    </nav>
    <nav className="tool-upcoming" aria-label="준비 중인 도구">
      <Link className="tool-feedback-link" href="/tools/feedback">도구 피드백 ↗</Link>
      <button aria-pressed={tab === 'templates'} onClick={() => selectTab('templates')}>템플릿 <span>준비 중</span></button>
      <button aria-pressed={tab === 'plugins'} onClick={() => selectTab('plugins')}>플러그인 <span>준비 중</span></button>
    </nav>
    <details className="tools-notice"><summary>실행 환경과 작업 보관 안내</summary><p>캔버스 작업은 이 브라우저에 저장합니다. 이미지·영상 생성은 연결된 외부 API를 사용하며 생성 전에 예상 사용료를 표시합니다. 시나리오와 TTS는 기기에서 실행합니다. 중요한 작업과 결과 파일은 별도로 내려받아 보관해주세요.</p></details>
    </>}
    {tab === 'canvas' && toolMenuOpen && <>
      <button className="canvas-switcher-backdrop" aria-label="창작도구 메뉴 닫기" onClick={() => setToolMenuOpen(false)} />
      <div ref={toolMenu} className="canvas-tool-switcher" role="dialog" aria-modal="true" aria-label="다른 창작도구" onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button,a[href]'));
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
        <p>BOTTOPIA STUDIO</p>
        <button aria-current="page" onClick={() => setToolMenuOpen(false)}>캔버스 <span>노드 작업실</span></button>
        <button onClick={() => selectTab('scenes')}>시나리오 & 샷리스트</button>
        <button onClick={() => selectTab('audio')}>TTS</button>
        <button onClick={() => selectTab('watermark')}>워터마크</button>
        <button onClick={() => selectTab('qr')}>QR 코드</button>
        <div><Link href="/tools/feedback">피드백</Link><Link href="/">홈으로 ↗</Link></div>
      </div>
    </>}
    <div className="canvas-tool-host" hidden={tab !== 'canvas'} inert={toolMenuOpen}>{visited.canvas && <CanvasWorkspace memberId={memberId} onOpenTools={() => { toolMenuOpener.current = document.activeElement as HTMLElement; setToolMenuOpen(value => !value); }} />}</div>
    <div hidden={tab !== 'scenes'}>
    {visited.scenes && <StoryBuilder memberId={memberId} />}
    </div><div hidden={tab !== 'audio'}>{visited.audio && <LocalNarration memberId={memberId} engine={initialEngine} />}</div>
    <div hidden={tab !== 'watermark'}>{visited.watermark && <WatermarkTool />}</div>
    <div hidden={tab !== 'qr'}>{visited.qr && <QrTool />}</div>
    {tab === 'templates' && <section className="utility-panel"><h2>템플릿</h2><p>공개할 자료를 준비하고 있습니다. 등록된 템플릿은 아직 없습니다.</p></section>}
    {tab === 'plugins' && <section className="utility-panel"><h2>플러그인</h2><p>공개할 도구를 준비하고 있습니다. 배포 중인 플러그인은 아직 없습니다.</p></section>}
  </main>;
}
