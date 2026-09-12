# BOTTOPIA release gate — 2026-09-12

Status: NOT DEPLOYED. Do not claim 90% readiness or trigger main-branch auto-deploy yet.

## Completed in this pass
- Actual Supabase read-only integration: 21 checks passed, including raw profiles/inquiries access denial, server access, private 50MiB bucket, public feed, anonymous admin denial and client secret scan.
- Request limiter migration applied to the existing Supabase project with success. New rate table is RLS-enabled and inaccessible to anon/authenticated; only service_role can use its atomic function. It stores HMAC identifiers, not raw IP addresses. Expired counters are pruned. No existing content or profiles changed.
- Concurrent limiter test: 8 requests against a fresh limit of 3 yielded exactly 3 successes. Anonymous function/table access denied. Test record removed.
- Synthetic WebP and 1-second MP4 uploaded via signed tickets to a unique private diagnostics prefix. Storage metadata, downloaded byte equality and anonymous denial passed. Exact test objects removed. This tests Storage transport, NOT the logged-in browser work-registration flow.
- Added same-origin checks, bounded JSON reading (128KiB), route request limits and fail-closed behavior when limiter unavailable.
- Work registration validates video/cover paths belong to the same work, rejects avatar/traversal paths, and uses actual Storage metadata for MIME/size rather than browser claims. File extensions selected from permitted MIME mapping.
- Suspended creator profiles/avatars excluded from public directory/detail. Owner restriction on publishing remains.
- Browser-origin test against local API: foreign origin 403; valid local origin with incomplete form 400 (no inquiry generated).
- Unit/source tests 59 passed; lint and production build passed. Earlier npm audit for unchanged dependencies: zero known vulnerabilities.

## Production state / important blockers
- Host: Vercel, team botostudio, project bottopia, Hobby. Existing production source is 92124cc7a1741fb90bc60c034fbc2df710a84db2. Public site stays unchanged.
- Main branch pushes automatically deploy. Do not push merely to back up local changes before the release decision.
- Hobby is limited to personal non-commercial use. The intended project-inquiry/creator-service platform needs plan suitability resolved. Vercel Pro official price checked: USD20/month platform fee, 1 deploying seat, USD20 included usage credit; usage beyond included resources may incur costs. No plan changed and no payment made.
- Production Kakao flag was inspected in Vercel. It is stored as a write-only Secret. Attempt to set true was blocked by the UI's public-prefix/type validation; the edit was cancelled. No successful environment-variable change occurred. Resolve before claiming production Kakao works. Google/Naver settings not re-verified end to end this pass.
- No backup shown on Supabase overview. A restore-tested backup plan is still required; test cleanup is not a backup.
- Member uploading is still owner-only. Need creator approval workflow, per-owner publishing/deletion, quotas and moderation before marketing unrestricted community uploads.
- Current app lacks a complete public privacy/terms/reporting workflow. Do not invent the operator's legal identity, contact, retention promises, or third-party processing consent.
- Final browser checks with an actual owner session, authentic OAuth on target domain, and a nonpublic draft upload are still pending.

## Reproduce checks
From this project: npm test; npm run lint; npm run build.
CHECK_SITE_URL=http://127.0.0.1:3001 node scripts/check-supabase.mjs
node scripts/check-upload-and-limits.mjs (creates/removes private diagnostic data only; ffmpeg required).

No source commit/push/deploy performed in this pass. No fees incurred. The new Supabase limiter is the only persistent remote change.
