# Public contact email — pending database and deployment

User requests free-plan deployment and optional creator contact email. No billing change authorized or made. Acknowledging hosting conditions is not a determination that the platform satisfies Hobby terms.

Implemented separate opt-in contactEmail. Authentication email is never autofilled or used as a fallback. Unchecked consent removes the stored address on save. Strict boolean consent, bounded address validation, encoded mailto link and spam exposure warning. Public creator responses use no-store so revoked addresses are not served from the previous API cache. Previously rendered/downloaded public information cannot be recalled.

Migration: supabase/migrations/20260912_public_contact_email.sql. Additive, idempotent, no backfill. NOT APPLIED.

Read-only check confirmed contact_email is absent (PostgreSQL 42703). Compatible profile reads and ordinary profile saves support the pre-migration schema. Attempted email publication returns a setup-specific 503 until migration.

60 tests passed. Rollout compatibility caused a Supabase TypeScript select-string inference error, corrected with explicit query return types. Final production build, lint and git diff whitespace checks passed. Authenticated browser save/revoke testing remains pending.

GitHub authentication is valid when network access is permitted. No commit/push/deploy performed. CUA browser control timed out three times (two inventories, one direct Supabase tab selection). No Supabase CLI/direct SQL credentials configured locally. Do not extract browser credentials. Need restored browser control or user-run additive migration, then authenticated verification and remaining release checks in 2026-09-12-release-gate.md.

Existing production unchanged. No fees incurred. No host migration or removal of inquiry functionality in this pass.
