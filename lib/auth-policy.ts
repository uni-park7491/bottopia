type AuthUser = { id: string; email?: string; email_confirmed_at?: string };

export function callbackOrigin(requestUrl: string, host: string | null, siteUrl: string | undefined, production: boolean): string | null {
  try {
    if (production) {
      if (!siteUrl) return null;
      const site = new URL(siteUrl);
      return site.protocol === 'https:' && !site.username && !site.password ? site.origin : null;
    }
    // Next dev can normalize request.url to localhost, which loses 127.0.0.1 cookies.
    const url = new URL(requestUrl);
    const local = new URL(`http://${host || url.host}`);
    return ['localhost', '127.0.0.1', '[::1]'].includes(local.hostname) && !local.username && !local.password && local.pathname === '/' ? local.origin : null;
  } catch { return null; }
}

/** Only return to this site, including after URL decoding/normalization. */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value || value.length > 2048) return '/';
  let decoded = value;
  for (let pass = 0; pass < 4; pass++) {
    if (!decoded.startsWith('/') || decoded.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(decoded)) return '/';
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) {
        const url = new URL(decoded, 'https://bottopia.invalid');
        if (url.origin !== 'https://bottopia.invalid' || url.pathname.startsWith('/auth/') || url.pathname === '/login') return '/';
        return value;
      }
      decoded = next;
    } catch { return '/'; }
  }
  return '/';
}

/** A configured user ID takes priority; missing emails must never grant access. */
export function isSiteOwner(user: AuthUser | null, ownerId?: string, ownerEmail?: string): boolean {
  if (!user) return false;
  const id = ownerId?.trim();
  if (id) return user.id === id;
  const email = ownerEmail?.trim().toLowerCase();
  return Boolean(email && user.email_confirmed_at && user.email?.trim().toLowerCase() === email);
}
