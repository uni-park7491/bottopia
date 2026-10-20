// Read-only importer: review stdout, then apply the JSON snapshot with apply_patch.
import { normalizeResourceFeed, resourceSource } from '../lib/resource-library.ts';
const response = await fetch(new URL('items.json', resourceSource), { signal: AbortSignal.timeout(15000), redirect: 'error' });
if (!response.ok) throw new Error(`Resource source returned ${response.status}`);
const raw = await response.text();
if (raw.length > 2_000_000) throw new Error('Resource source exceeds import size limit');
process.stdout.write(JSON.stringify(normalizeResourceFeed(JSON.parse(raw)), null, 2) + '\n');
