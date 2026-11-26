import type { Metadata } from 'next';
import CreativeTools from './CreativeTools';
import './tools.css';
import './workspace.css';
import './studio-theme.css';
import './canvas/canvas.css';
import './canvas/canvas-shell.css';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';

export const metadata: Metadata = { title: '캔버스·시나리오·TTS · BOTTOPIA', description: '노드를 연결해 이미지와 영상을 만들고, 시나리오와 목소리를 다듬는 봇토피아 창작 도구.' };
export const dynamic = 'force-dynamic';
export default async function ToolsPage({ searchParams }: { searchParams: Promise<{ tab?: string; model?: string }> }) {
  const params = await searchParams;
  const initialTab = params.tab === 'audio' ? 'audio' : params.tab === 'scenes' ? 'scenes' : 'canvas';
  const initialEngine = params.model === 'qwen' ? 'qwen' : 'supertonic';
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(initialTab === 'audio' ? `/tools?tab=audio&model=${initialEngine}` : `/tools?tab=${initialTab}`)}&lang=ko`);
  return <CreativeTools key={user.id} memberId={user.id} initialTab={initialTab} initialEngine={initialEngine} />;
}
