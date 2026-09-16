'use client';

import { useState } from 'react';
import StoryBuilder from './StoryBuilder';
import LocalNarration from './LocalNarration';

export default function CreativeTools({ memberId }: { memberId: string }) {
  const [tab, setTab] = useState<'scenes' | 'audio'>('scenes');
  return <main className="creative-tools" lang="ko">
    <header className="tools-heading"><div><p>BOTTOPIA WORKSPACE</p><h1>이야기에서, 목소리까지.</h1></div><span>내 기기에서 실행 · API 키 없이</span></header>
    <p className="tools-intro">짧은 아이디어를 시나리오와 샷으로 정리하고, 대사에 목소리를 더하세요.</p>
    <nav className="tool-tabs" aria-label="창작 도구 선택">
      <button aria-pressed={tab === 'scenes'} onClick={() => setTab('scenes')}><strong><span aria-hidden="true">✦</span> 시나리오 & 샷리스트</strong><span>이야기를 다듬고 장면으로 나누기</span></button>
      <button aria-pressed={tab === 'audio'} onClick={() => setTab('audio')}><strong><span aria-hidden="true">♫</span> 나레이션</strong><span>음성 생성·미리듣기·WAV 저장</span></button>
    </nav>
    <details className="tools-notice"><summary>실행 환경과 작업 보관 안내</summary><p>생성은 이 기기에서 실행합니다. 시나리오 작업실에서 기기 저장을 켜거나 작업 파일을 내려받을 수 있습니다. 음성 결과물은 별도로 내려받아 보관해주세요.</p></details>
    <div hidden={tab !== 'scenes'}>
    <StoryBuilder memberId={memberId} />
    </div><div hidden={tab !== 'audio'}><LocalNarration /></div>
  </main>;
}
