// Stored on this browser origin only; never included in server requests.
export const CONNECTION_KEY = 'bottopia.tts.pc-connection.v1';
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function readConnection(store: Store): string {
  try { const value = store.getItem(CONNECTION_KEY) || ''; return /^[\w-]{43}$/.test(value) ? value : ''; }
  catch { return ''; }
}
export function saveConnection(store: Store, token: string): boolean {
  try {
    if (!token) store.removeItem(CONNECTION_KEY);
    else if (/^[\w-]{43}$/.test(token)) store.setItem(CONNECTION_KEY, token);
    else return false;
    return true;
  } catch { return false; }
}
