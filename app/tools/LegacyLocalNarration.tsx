'use client';
import { useEffect, useState } from 'react';
import { downloadFile } from './download';
import { copyText } from '../../lib/clipboard';

export default function LocalNarration() {
  const [text, setText] = useState('');
  const [rate, setRate] = useState(160);
  const [status, setStatus] = useState('');
  const [engine, setEngine] = useState<'espeak-ng' | 'system'>('espeak-ng');
  const command = `node local-narration.mjs narration.txt narration.wav ${engine === 'espeak-ng' ? 'ko' : 'Yuna'} ${rate} ${engine}`;
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (text.trim()) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [text]);
  async function getTool() {
    try {
      const response = await fetch('/api/tools/narration-download');
      if (!response.ok) throw new Error((await response.json()).error || '다운로드에 실패했습니다.');
      downloadFile(await response.blob(), 'local-narration.mjs');
      setStatus('로컬 실행 도구 다운로드를 요청했습니다. 저장된 파일을 확인해주세요.');
    } catch (error) { setStatus(error instanceof Error ? error.message : '다운로드에 실패했습니다.'); }
  }
  return <section className="tool-workspace local-narration" aria-label="로컬 임시 내레이션">
    <header className="tool-section-head"><div><h2>로컬 임시 내레이션 · Mac 베타</h2><p>확정한 대사를 WAV로 만들어 콘티의 타이밍을 확인하세요. 웹사이트에서 즉시 생성되는 기능이 아니라, 내려받은 도구를 내 Mac에서 실행하는 방식입니다.</p></div></header>
    <div className="tools-columns"><div>
      <p className="tools-notice">API 키·건당 요금·서버 전송 없음. 별도로 설치한 음성 엔진을 내 Mac에서 실행합니다. 음성 복제·음악 생성은 아니며 Windows·모바일은 아직 지원하지 않습니다.</p>
      <label className="tool-field">음성 엔진<select value={engine} onChange={event => setEngine(event.target.value as 'espeak-ng' | 'system')}><option value="espeak-ng">eSpeak NG · 한국어 합성음</option><option value="system">Mac Yuna · 개인 미리듣기 전용</option></select></label>
      {engine === 'system' ? <p className="tools-notice">개인·비상업적 미리듣기 전용입니다. Apple 시스템 음성으로 만든 파일은 공개 피드·SNS·포트폴리오에 공유하는 용도로 사용하지 마세요. 공개할 콘티에는 직접 녹음했거나 공개 이용이 허용된 음원을 사용하세요. <a href="https://www.apple.com/legal/sla/docs/macOSTahoe.pdf" target="_blank" rel="noopener noreferrer">Apple 사용권 계약 2.F 확인</a></p> : <p className="tools-notice">eSpeak NG는 설치형 오픈소스 합성음입니다. 기계적인 발음이므로 임시 콘티의 길이 확인에 적합하며, AI 성우 품질을 제공하지 않습니다. 대사·원작의 이용 권리는 별도로 확인하세요. <a href="https://github.com/espeak-ng/espeak-ng" target="_blank" rel="noopener noreferrer">엔진·라이선스 안내</a></p>}
      <label className="tool-field">읽을 대사 · 최대 3,000자<textarea rows={9} maxLength={3000} value={text} onChange={event => setText(event.target.value)} placeholder="시나리오에서 실제로 읽을 대사나 내레이션만 붙여 넣으세요. 카메라 지시문은 제외해주세요." /></label>
      <label className="tool-field">읽기 속도 · {rate}<input type="range" min={80} max={260} step={10} value={rate} onChange={event => setRate(Number(event.target.value))} /></label>
      <div className="tools-actions"><button disabled={!text.trim()} onClick={() => { downloadFile(new Blob([text], { type: 'text/plain;charset=utf-8' }), 'narration.txt'); setStatus('대사 파일 다운로드를 요청했습니다. narration.txt 이름을 확인해주세요.'); }}>대사 TXT 내려받기</button><button onClick={getTool}>Mac 실행 도구 내려받기</button></div>
      <p>입력 내용은 자동 저장되지 않습니다. 대사 파일을 내려받아 보관하세요.</p>
    </div><aside className="tool-preview">
      <h3>처음 한 번만 준비하기</h3>
      {engine === 'espeak-ng' && <p><a href="https://brew.sh" target="_blank" rel="noopener noreferrer">Homebrew 공식 설치 안내</a>에 따라 준비한 뒤 터미널에서 <code>brew install espeak-ng</code>를 실행하세요. 이미 설치했다면 생략합니다. 이 웹사이트는 프로그램을 자동 설치하지 않습니다.</p>}
      <ol><li><a href="https://nodejs.org/en/download" target="_blank" rel="noopener noreferrer">Node.js 공식 사이트</a>에서 Mac용 LTS(22 이상)를 설치합니다. 이미 있다면 생략하세요.</li><li>내려받은 <code>local-narration.mjs</code>와 <code>narration.txt</code>를 같은 폴더에 놓습니다.</li><li>Finder에서 그 폴더를 선택하고 우클릭 → 서비스 → 폴더에서 새로운 터미널 열기를 선택합니다.</li><li>아래 명령을 실행합니다. 기존 <code>narration.wav</code>가 있으면 덮어쓰지 않으므로 먼저 다른 이름으로 보관하세요.</li></ol>
      <pre>{command}</pre><button onClick={async () => setStatus(await copyText(command) ? '실행 명령을 복사했습니다.' : '복사하지 못했습니다. 명령을 직접 선택해 복사해주세요.')}>실행 명령 복사</button>
      <p><code>narration.wav</code>를 시나리오·샷리스트 탭의 확정 콘티 → 음원 선택에 넣고 시작 위치와 볼륨을 조절하세요. {engine === 'system' && 'Mac Yuna 음성이 들어간 콘티는 공개하지 마세요. '}생성된 음성 길이는 샷 길이에 자동으로 맞춰지지 않습니다.</p>
      <details><summary>목소리가 없거나 실행되지 않나요?</summary><p>{engine === 'system' ? 'macOS의 시스템 설정 → 손쉬운 사용 → 읽기 및 말하기(버전에 따라 명칭이 다름)에서 한국어 Yuna 목소리를 설치해주세요.' : 'Homebrew로 eSpeak NG를 설치했는지 확인해주세요. 기본 설치 위치만 지원하며 다른 음성 엔진으로 자동 전환하지 않습니다.'} 이 도구는 목소리를 자동 다운로드하지 않습니다. 터미널에서 Node.js를 찾지 못하면 설치 후 터미널을 다시 여세요.</p></details>
    </aside></div><p role="status">{status}</p>
  </section>;
}
