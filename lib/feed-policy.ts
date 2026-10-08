import { matchesVideoFilters, type FeedFilters } from './work-genres.ts';
export type FeedItem = {
  title: string; summary: string; tool: string; model: string; category: string;
  copies: number; createdAt: string; workType?: string; durationSeconds?: number | null;
  creator?: { displayName: string; handle: string; role: string } | null;
};
export function filterWorks<T extends FeedItem>(works: T[], category: string, query: string, originalsOnly: boolean, sort: 'LATEST' | 'POPULAR', filters: FeedFilters = {}): T[] {
  const term = query.trim().toLowerCase();
  return works.filter(work => (category === 'ALL' || work.category === category) && matchesVideoFilters(work, filters)
    && (!originalsOnly || (work.workType === 'ORIGINAL' && (!work.creator || work.creator.role === 'FOUNDING_CREATOR')))
    && [work.title, work.summary, work.tool, work.model, work.creator?.displayName, work.creator?.handle].join(' ').toLowerCase().includes(term))
    .sort((a, b) => sort === 'POPULAR' ? b.copies - a.copies : +new Date(b.createdAt) - +new Date(a.createdAt));
}
