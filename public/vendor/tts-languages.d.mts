export const speechLanguages: [string, string][];
export function languagesFor(engine: 'qwen' | 'supertonic' | 'kokoro'): [string, string][];
export function validateLanguage(engine: 'qwen' | 'supertonic' | 'kokoro', language?: string): string;
