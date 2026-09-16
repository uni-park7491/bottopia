export const speechLanguages: [string, string][];
export function languagesFor(engine: 'qwen' | 'supertonic'): [string, string][];
export function validateLanguage(engine: 'qwen' | 'supertonic', language?: string): string;
