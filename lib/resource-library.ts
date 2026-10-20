export const resourceSource = 'https://link-notes-nine.vercel.app/';
export const resourceCategories = ['video', 'agents', 'prompts', 'growth', 'offers'] as const;
export type ResourceCategory = typeof resourceCategories[number];
export const resourceFormats = ['github', 'skill', 'video', 'prompt', 'guide'] as const;
export type ResourceFormat = typeof resourceFormats[number];
export type Resource = {
  id: string; title: string; description: string; category: ResourceCategory;
  topic: string; formats: ResourceFormat[]; author: string; publishedAt: string;
  sourceUrl: string; noteUrl: string; repositories: string[]; relatedUrls: string[];
};
export type ResourceFeed = { updatedAt: string; importedAt: string; source: string; items: Resource[] };

export function safeResourceUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    if (!url.hostname.includes('.') || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}

export function githubRepository(value: string): string | null {
  const safe = safeResourceUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  if (url.hostname !== 'github.com') return null;
  const match = url.pathname.match(/^\/([\w.-]+)\/([\w.-]+)(?:\/|$)/);
  return match ? `https://github.com/${match[1]}/${match[2].replace(/\.git$/, '')}` : null;
}

const categoryMap: Record<string, ResourceCategory> = { 'AI 영상': 'video', '에이전트·코딩': 'agents', '프롬프트': 'prompts', '마케팅·수익화': 'growth', '혜택·할인': 'offers' };
const fallback: Record<ResourceCategory, string> = {
  video: '영상 제작 사례와 도구·작업 과정을 원문에서 살펴보세요.',
  agents: '에이전트와 개발 도구의 사용 방법·설정 자료를 살펴보세요.',
  prompts: '프롬프트 예시와 입력 방법을 원문에서 확인하세요.',
  growth: '채널 운영·수익화 사례를 정리한 참고 자료입니다.',
  offers: '신청 대상·지원 국가·기간과 현재 조건을 공식 페이지에서 확인하세요.',
};

export function normalizeResourceFeed(raw: unknown, importedAt = new Date().toISOString()): ResourceFeed {
  if (!raw || typeof raw !== 'object' || !('items' in raw) || !Array.isArray(raw.items)) throw new Error('Invalid resource feed');
  const source = raw as { updated_at?: unknown; items: unknown[] };
  const ids = new Set<string>();
  const items: Resource[] = source.items.map(value => {
    if (!value || typeof value !== 'object') throw new Error('Invalid resource');
    const item = value as Record<string, unknown>;
    if (typeof item.id !== 'string' || !/^[a-z0-9-]{1,80}$/i.test(item.id) || ids.has(item.id)) throw new Error('Invalid or duplicate resource ID');
    ids.add(item.id);
    if (typeof item.title !== 'string' || !item.title.trim()) throw new Error('Missing resource title');
    const sourceUrl = safeResourceUrl(item.url);
    if (!sourceUrl) throw new Error('Unsafe resource source');
    const title = item.title.replace(/\\([~$])/g, '$1').trim().slice(0, 240);
    let category = categoryMap[String(item.cat)] || 'agents';
    if (category === 'video' && /Godot|3D 게임/i.test(title)) category = 'agents';
    const topic = String(item.sub || '').slice(0, 60);
    // Read public references as data only. Never import executable HTML or commands.
    const contents = String(item.html || '') + JSON.stringify(item.snippets || []);
    const candidates = contents.match(/https?:[^\s<>"\\]+/g) || [];
    const repositories = [...new Set(candidates.map(githubRepository).filter((url): url is string => !!url))];
    const relatedUrls = [...new Set(candidates.map(safeResourceUrl).filter((url): url is string => !!url))]
      .filter(url => !/\.(?:md|local)$/i.test(new URL(url).hostname) && !['x.com', 'twitter.com', 'github.com'].includes(new URL(url).hostname))
      .slice(0, 5);
    const formats: ResourceFormat[] = [];
    if (repositories.length) formats.push('github');
    if (/스킬|플러그인|SKILL\.md|MCP/i.test(title + topic)) formats.push('skill');
    if (category === 'video') formats.push('video');
    if (category === 'prompts' || /프롬프트/.test(title)) formats.push('prompt');
    if (!formats.length) formats.push('guide');
    const summary = typeof item.summary === 'string' ? item.summary.replace(/\\([~$])/g, '$1').replace(/<[^>]*>/g, '').trim() : '';
    const firstSentence = summary.match(/^(.{25,180}?[.!?。])(?:\s|$)/u)?.[1];
    const excerpt = firstSentence || summary.slice(0, 180);
    const description = !summary || summary === title ? fallback[category] : excerpt + (/[.!?。…]$/.test(excerpt) ? '' : '…');
    const date = item.date && typeof item.date === 'object' && 'd' in item.date ? String(item.date.d) : '';
    return { id: item.id, title, description, category, topic, formats, author: String(item.author || '').slice(0, 100),
      publishedAt: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '', sourceUrl,
      noteUrl: `${resourceSource}#${encodeURIComponent(item.id)}`, repositories, relatedUrls };
  });
  items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return { source: resourceSource, updatedAt: typeof source.updated_at === 'string' ? source.updated_at : importedAt, importedAt, items };
}

export function filterResources(items: Resource[], category: string, format: string, query: string): Resource[] {
  const normalized = query.normalize('NFKC').trim().toLocaleLowerCase();
  return items.filter(item => (category === 'all' || item.category === category)
    && (format === 'all' || item.formats.includes(format as ResourceFormat))
    && (!normalized || [item.title, item.description, item.topic, item.author, ...item.repositories].join(' ').normalize('NFKC').toLocaleLowerCase().includes(normalized)));
}
