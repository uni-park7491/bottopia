'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const StoryBuilder = dynamic(() => import('./StoryBuilder'), { loading: () => <p role="status">시나리오 작업실을 불러오는 중…</p> });
const LocalNarration = dynamic(() => import('./LocalNarration'), { loading: () => <p role="status">TTS 작업실을 불러오는 중…</p> });
const WatermarkTool = dynamic(() => import('./WatermarkTool'));
const QrTool = dynamic(() => import('./QrTool'));
type ToolTab = 'scenes' | 'audio' | 'watermark' | 'qr' | 'templates' | 'plugins';

export default function CreativeTools({ memberId, initialTab = 'scenes', initialEngine = 'supertonic' }: { memberId: string; initialTab?: 'scenes' | 'audio'; initialEngine?: 'supertonic' | 'qwen' }) {
  const [tab, setTab] = useState<ToolTab>(initialTab);
  const [visited, setVisited] = useState<Record<ToolTab,boolean>>({ scenes: initialTab === 'scenes', audio: initialTab === 'audio', watermark:false,qr:false,templates:false,plugins:false });
  function selectTab(next: ToolTab) {
    setVisited(previous => ({ ...previous, [next]: true }));
    setTab(next);
  }
  return <main className="creative-tools" lang="ko">
    <header className="tools-heading"><div><p>BOTTOPIA WORKSPACE</p><h1>이야기에서, 목소리까지.</h1></div><span>내 기기에서 실행 · API 키 없이</span></header>
    <p className="tools-intro">짧은 아이디어를 시나리오와 샷으로 정리하고, 대사에 목소리를 더하세요.</p>
    <nav className="tool-tabs" aria-label="창작 도구 선택">
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
    <details className="tools-notice"><summary>실행 환경과 작업 보관 안내</summary><p>생성은 이 기기에서 실행합니다. 시나리오 작업실에서 기기 저장을 켜거나 작업 파일을 내려받을 수 있습니다. 음성은 현재 브라우저의 생성 기록에 보관되며 중요한 파일은 별도로 내려받아 보관해주세요.</p></details>
    <div hidden={tab !== 'scenes'}>
    {visited.scenes && <StoryBuilder memberId={memberId} />}
    </div><div hidden={tab !== 'audio'}>{visited.audio && <LocalNarration memberId={memberId} engine={initialEngine} />}</div>
    <div hidden={tab !== 'watermark'}>{visited.watermark && <WatermarkTool />}</div>
    <div hidden={tab !== 'qr'}>{visited.qr && <QrTool />}</div>
    {tab === 'templates' && <section className="utility-panel"><h2>템플릿</h2><p>공개할 자료를 준비하고 있습니다. 등록된 템플릿은 아직 없습니다.</p></section>}
    {tab === 'plugins' && <section className="utility-panel"><h2>플러그인</h2><p>공개할 도구를 준비하고 있습니다. 배포 중인 플러그인은 아직 없습니다.</p></section>}
  </main>;
}
