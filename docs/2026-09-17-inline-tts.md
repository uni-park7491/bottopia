# Single-screen TTS model selection

- Replace engine navigation links with React toggle buttons. Choosing Qwen or Supertonic never changes the document or URL.
- Keep entered text, voice choice and existing audio across engine changes; reset consent because download sizes differ. Disable engine changes while generation runs.
- Keep StoryBuilder and LocalNarration mounted while switching the main tabs.
- Prepare isolation when entering `/tools`, not on selecting Qwen. Scope document isolation to `/tools/:path*`; apply matching policies to vendor and compiled worker assets. Home/login/community remain non-isolated documents.
- Main navigation and logged-in continuation use document navigation only when crossing the workspace boundary. This avoids accidentally inheriting the previous document's isolation state.
- Existing `/tools/tts?model=...` links redirect to the same workspace with the audio tab and engine selected. Authentication remains on `/tools`, preserving safe return parameters.

## Validation

- 168 automated tests pass; production build and TypeScript pass; modified TS/TSX files lint clean.
- Chrome: `/tools` remained unchanged through story → TTS → Qwen → story → TTS → Supertonic.
- Story topic and spoken text survived all switches. Selecting Qwen cleared download consent and retained the existing playable Supertonic audio.
- Supertonic generated 1.5 seconds of real audio under isolation and playback entered the playing state.
- Qwen generated 2.2 seconds of real audio on the same `/tools` document, playback entered the playing state and WAV download was requested successfully. Switching to the story tab during model preparation did not cancel TTS.
- Story model loaded to “AI 준비 완료” under isolation; test engine was then stopped to release memory. No new story output was requested.
- Legacy link redirects correctly; home response does not have COOP/COEP.
