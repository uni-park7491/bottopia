export function sameSiteMutation(request: Request, siteUrl?: string): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = request.headers.get('origin');
  if (!origin) return true; // Non-browser clients still require route authentication/rate limits.
  try {
    const url = new URL(request.url);
    const allowed = new Set([url.origin]);
    // Next dev may normalize request.url to localhost while the browser uses 127.0.0.1.
    if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      const host = new URL('http://' + request.headers.get('host'));
      if (['localhost', '127.0.0.1', '[::1]'].includes(host.hostname) && host.port === url.port) allowed.add(host.origin);
    }
    if (siteUrl) allowed.add(new URL(siteUrl).origin);
    return allowed.has(origin);
  } catch { return false; }
}

export async function readJsonObject(request: Request, maxBytes = 131072): Promise<Record<string, unknown> | null> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const result: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return result && typeof result === 'object' && !Array.isArray(result) ? result as Record<string, unknown> : null;
  } catch { return null; }
  finally { reader.releaseLock(); }
}
