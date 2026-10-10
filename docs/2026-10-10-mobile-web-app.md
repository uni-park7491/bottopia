# Mobile web app release

## Scope

- One PWA on the existing domain; standalone manifest, mascot PNG icons, Apple home-screen metadata and platform-specific installation help.
- Mobile bottom navigation: explore, tools, upload, community and profile. Creators/About remain reachable above the content.
- Safe-area clearance, single-column studio fields and 16px mobile input text (no forced zoom restrictions).
- XHR signed uploads using the installed Supabase SDK's PUT/multipart contract. Real transfer events plus explicit save-stage weighting; 100% only after the final record succeeds.
- Manual retry retains form values and, where the same selected File instance remains, reuses completed uploads.
- User-scoped session draft, text fields only. Files and publication approval are not restored. Closing the tab or clearing browser data removes the draft; blocked storage does not prevent uploading.
- No upload permission expansion: approved creators and owner only, private publication default, existing 50MB limit and rate limits unchanged.
- Online-first worker caches only the static offline explanation, never API responses, user pages, media or prompts. Offline mode is informational, not offline creation or background upload.

## Verification

- 266 automated tests passed, including actual manifest PNG dimensions, worker request handling, draft validation and mocked transfer success/failure/progress.
- Production Next build and targeted ESLint passed.
- Responsive browser checks at 390×844: install guidance, navigation and unauthenticated upload redirect with next=/studio.
- Real iPhone/Android home-screen installation and real-device file-picker uploads require device verification; desktop viewport tests do not establish those outcomes.
- Official signed-upload contract: https://supabase.com/docs/reference/javascript/file-buckets-createsigneduploadurl

## Installation

- iPhone/iPad: Safari → Share → Add to Home Screen.
- Android: Chrome → Install app / Add to Home screen; native installation button where the browser exposes it.
- Installed app still requires internet for data and uploads. Keep the upload screen open until saved.
- Browser TTS remains available according to device support; PC-only model generation remains PC-only. No new paid API, push subscription or app-store submission is included.
