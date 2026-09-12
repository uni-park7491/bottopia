export default function CreatorBadge({ role }: { role: string }) {
  const label = role === 'ADMIN' ? '운영팀' : role === 'FOUNDING_CREATOR' ? '초기 크리에이터' : role === 'CREATOR' ? '크리에이터' : '멤버';
  return <span className="creator-badge" title="활동 역할 표시입니다. 등급이나 본인 인증 표시는 아닙니다."><span aria-hidden="true">✦</span>{label}</span>;
}
