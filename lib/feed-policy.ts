export type FeedItem = {
  title: string; summary: string; tool: string; model: string; category: string;
  copies: number; createdAt: string; workType?: string;
  creator?: { displayName: string; handle: string; role: string } | null;
};
export function filterWorks<T extends FeedItem>(works: T[], category: string, query: string, originalsOnly: boolean, sort: 'LATEST' | 'POPULAR'): T[] {
  const term = query.trim().toLowerCase();
  return works.filter(work => (category === 'ALL' || work.category === category)
    && (!originalsOnly || (work.workType === 'ORIGINAL' && (!work.creator || work.creator.role === 'FOUNDING_CREATOR')))
    && [work.title, work.summary, work.tool, work.model, work.creator?.displayName, work.creator?.handle].join(' ').toLowerCase().includes(term))
    .sort((a, b) => sort === 'POPULAR' ? b.copies - a.copies : +new Date(b.createdAt) - +new Date(a.createdAt));
}
