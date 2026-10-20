import type { Metadata } from 'next';
import snapshot from '../../data/resources.json';
import type { ResourceFeed } from '../../lib/resource-library';
import ResourceLibrary from './ResourceLibrary';

export const metadata: Metadata = {
  title: '자료 · BOTTOPIA',
  description: 'AI 영상, GitHub 도구, 에이전트 스킬, 프롬프트와 채널 운영 자료를 분야별로 찾아보세요.',
  alternates: { canonical: '/resources' },
};

export default function ResourcesPage() {
  return <ResourceLibrary feed={snapshot as ResourceFeed} />;
}
