# Mobile theme and authentication check — 2026-10-10

## Changes

- Remove the conditional Automatic button; retain a stable day/night switch.
- Without a saved manual preference, initial render and system-theme changes follow the device. Saved manual choices survive refresh and navigation.
- Explicit `color-scheme: only light` / `only dark` prevents supported Chromium auto-dark recoloring from overriding the site's own palettes. This is mitigation, not a confirmed diagnosis of the photographed Android device.
- Synchronize native controls and theme-color toolbar metadata with manual selections, not just the OS preference.
- Retain temporary manual choices if local storage is unavailable.
- Do not show the generic social-login setup message merely because NAVER is disabled while Google and Kakao are available.

## Verified before deployment

- 269 automated tests passed; targeted ESLint passed; production build passed.
- Browser at 390 × 844: no horizontal overflow on login; repeated day/night changes update computed backgrounds (#f7f8fa / #111318), color-scheme and toolbar metadata. Refresh preserves choice. Tools navigation correctly requires login; checked browser console contained no errors.
- Production Google OAuth: selected an already authorized existing account, returned to /profile and displayed the authenticated user.
- Production Kakao OAuth: reached the official Kakao account/password entry page without a provider-configuration error. No Kakao credentials were entered; successful session exchange is not verified.

## Limits

No physical Android/iPhone device is connected to this environment. Browser viewport checks do not prove installed-PWA behavior, Samsung browser forced-dark behavior, camera/file selection, or every TTS model. The photographed Android failure must be retested on that phone after release.

Chrome source: https://developer.chrome.com/blog/auto-dark-theme
