# Beta release decision

User explicitly requested deploying the current site without waiting for optional contact-email schema/UI control, and without upgrading the hosting plan. This supersedes the earlier blanket hold in release-gate.md; it does not assert all listed follow-up work is complete, 90% readiness, or a host-policy exemption.

Scope: current feed/navigation/typography improvements, drag-and-drop/avatar UI, role badges, request origin/size/rate guards and hardened media registration. Existing member upload restrictions remain intact. No billing or hosting provider changes. No fabricated content or private configuration included.

Contact email migration remains unapplied. Existing profile reads/saves support the old schema. Profile API advertises readiness, and the contact-email controls are disabled with a setup notice until the schema is present. OAuth production end-to-end checks, privacy/terms/reporting completion, restore-tested backup and general creator publishing remain follow-up items. Do not advertise unrestricted member uploads or all three login providers as verified.

Validation before push: 60 tests, lint, production build and whitespace checks. Previous read-only integration: 21 pass. Existing remote main/rollback source: 92124cc7a1741fb90bc60c034fbc2df710a84db2. Public deployment must be confirmed from the new revision's Vercel status and live read-only smoke checks.
