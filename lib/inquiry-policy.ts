export type InquiryInput = {
  name: string;
  contact: string;
  projectType: string;
  timelineBudget: string;
  brief: string;
  locale: string;
};

const limits = {
  name: 100,
  contact: 180,
  projectType: 60,
  timelineBudget: 240,
  brief: 3000,
  locale: 8,
} as const;

function text(value: unknown, limit: number) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

export function parseInquiry(value: unknown): { data?: InquiryInput; error?: string } {
  if (!value || typeof value !== 'object') return { error: 'Invalid request' };
  const body = value as Record<string, unknown>;
  if (text(body.website, 200)) return { error: 'Invalid request' };

  const data = {
    name: text(body.name, limits.name),
    contact: text(body.contact, limits.contact),
    projectType: text(body.projectType, limits.projectType) || 'OTHER',
    timelineBudget: text(body.timelineBudget, limits.timelineBudget),
    brief: text(body.brief, limits.brief),
    locale: text(body.locale, limits.locale) || 'ko',
  };
  if (data.name.length < 2) return { error: 'Name is required' };
  if (data.contact.length < 4) return { error: 'Contact is required' };
  if (data.brief.length < 10) return { error: 'Brief must be at least 10 characters' };
  return { data };
}
