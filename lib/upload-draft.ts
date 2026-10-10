export const draftFields = ['title','category','tool','model','summary','prompt','negativePrompt','workType','processNotes','aspectRatio','seed','durationSeconds'] as const;
export function readUploadDraft(raw: string | null): Record<string, string> | null {
  try {
    const value = JSON.parse(raw || 'null');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return Object.fromEntries(draftFields.filter(key => typeof value[key] === 'string').map(key => [key, value[key].slice(0,16000)]));
  } catch { return null; }
}
