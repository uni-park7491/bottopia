'use client';
import { useEffect, useRef, useState } from 'react';
import { downloadFile } from './download';
import { normalizeQrUrl } from './qr-url';
export default function QrTool() {
  const [value,setValue] = useState(''), [size,setSize] = useState(1024), [status,setStatus] = useState('');
  const [result,setResult] = useState<{ url:string; png:string; svg:string; size:number; input:string } | null>(null);
  const [busy,setBusy] = useState(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function generate() {
    setBusy(true); setStatus('');
    try {
      const url = normalizeQrUrl(value);
      const QR = await import('qrcode');
      const options = { errorCorrectionLevel: 'M' as const, margin:4, width:size, color:{dark:'#15131aff',light:'#ffffffff'} };
      const [png,svg] = await Promise.all([QR.toDataURL(url,options), QR.toString(url,{...options,type:'svg'})]);
      if (active.current) { setResult({url,png,svg,size,input:value}); setStatus('QR 코드가 생성되었습니다. 휴대전화로 스캔해 주소를 확인하세요.'); }
    } catch { if (active.current) setStatus('QR 생성 실패: 2000자 이하의 올바른 http 또는 https 주소를 입력해주세요.'); }
    finally { if (active.current) setBusy(false); }
  }
  return <section className="utility-tool"><header className="tool-section-head"><div><p className="story-beta">LINK TO QR</p><h2>작품으로 연결되는 작은 코드.</h2><p>작품·프로필·SNS·공개 이미지 및 영상 주소를 QR 코드로 변환합니다.</p></div></header><div className="utility-grid"><div className="utility-panel">
    <label className="tool-field">연결할 주소<input type="url" maxLength={2000} value={value} onChange={e => setValue(e.target.value)} placeholder="https://bottopia.studio/…" /></label>
    <label className="tool-field compact-field">PNG 크기<select value={size} onChange={e => setSize(Number(e.target.value))}>{[512,1024,2048].map(n=><option key={n} value={n}>{n} × {n} px</option>)}</select></label>
    <button className="tool-primary" disabled={busy || !value.trim()} onClick={generate}>{busy ? '생성 중…' : 'QR 코드 만들기'}</button><p role="status">{result && (result.input !== value || result.size !== size) ? `설정이 변경되었습니다. 현재 다운로드는 ${result.size} × ${result.size}px의 이전 결과입니다. 새 설정을 적용하려면 다시 생성하세요.` : status}</p>
    <details><summary>사용 전 확인</summary><p>파일 자체를 QR 안에 넣거나 업로드하지 않습니다. 먼저 이미지·영상을 공개한 뒤 해당 주소를 입력하세요. 비공개 링크는 스캔하는 사람도 로그인 권한이 필요합니다. 코드에는 주소가 그대로 포함되므로 비밀번호나 비공개 공유 토큰을 넣지 마세요.</p><p>주소가 삭제되거나 변경되면 기존 QR로 열 수 없습니다. 다운로드 전 실제 기기로 스캔하세요.</p></details>
  </div><div className="utility-panel qr-result">{result ? <><img src={result.png} alt="생성된 QR 코드" width={320} height={320} /><div className="tools-actions"><button onClick={async () => { const blob = await (await fetch(result.png)).blob(); downloadFile(blob,'bottopia-qr.png'); }}>PNG 저장</button><button onClick={() => downloadFile(new Blob([result.svg],{type:'image/svg+xml'}),'bottopia-qr.svg')}>SVG 저장</button></div><small className="qr-export-note">주소 문구 없이 QR 코드만 저장됩니다.</small></> : <div className="utility-empty">주소를 입력하면 여기에 QR 코드가 표시됩니다.</div>}</div></div></section>;
}
