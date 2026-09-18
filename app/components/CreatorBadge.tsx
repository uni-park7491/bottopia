export default function CreatorBadge({ role }: { role: string }) {
  return <span className="creator-badge" data-role={role} role="img" aria-label="봇토피아 멤버 뱃지" title="봇토피아 멤버 뱃지 · 본인 인증 표시는 아닙니다.">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3L7 14.2 2 9.3l6.9-1L12 2Z" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  </span>;
}
