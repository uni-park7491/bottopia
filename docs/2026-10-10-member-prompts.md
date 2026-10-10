# Member-only prompt access

Works and source-linked video references remain public. Prompt originals and negative prompts are omitted from public work feeds, work detail responses, creator profiles and reference responses. Reference prompt data is no longer bundled into the browser JavaScript.

The protected work/reference prompt endpoints verify the Supabase user with `getUser` before fetching content and return `private, no-store` responses. The copy-count endpoint also requires membership. Creator/owner studio responses retain originals for editing under their existing authentication checks.

Clicking copy while signed out navigates to the existing social login/join page with the original return URL and a concise prompt-access notice. First sign-in uses existing automatic registration; no new approval requirement is introduced. Members fetch and copy the original plus negative prompt. Clipboard/service failures have retry notices.

Validation: 254 automated tests passed; TypeScript, scoped lint and production build passed. Local production HTTP checks verified 200 public feed/reference responses with empty prompts, and 401 private/no-store for anonymous prompt access and copy counts. Browser verified the copy button redirects to login with `reason=prompt` and the membership notice. A full new-account OAuth flow was not executed, to avoid creating a real test account; existing authentication is reused.

This gate limits anonymous access. It cannot prevent a signed-in person from redistributing copied text.
