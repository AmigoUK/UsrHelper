# Chrome Web Store — listing & review notes

Working notes to satisfy the [Chrome Web Store program policies](https://support.google.com/chrome/a/answer/2714278) at publication time.

## Single purpose

UsrHelper has one purpose: **capturing deployment feedback** — annotated screenshots and narrated screen recordings saved locally and handed off by email. Every permission below serves that purpose.

## Permission justifications (for the review form)

| Permission | Justification |
|---|---|
| `activeTab` | Capture the tab the user is looking at when they click a capture button. |
| `tabs` | Read the active tab's URL/title to include in the report metadata and detect pages that cannot be captured (`chrome://`). |
| `downloads` | Save screenshots, recordings, and report `.json` files into the user-chosen subfolder of Downloads. |
| `storage` | Store user settings, project profiles, and local report history. |
| `scripting` | Inject the capture helper into already-open tabs right after install/update (the registered content script only loads on new navigations). |
| `<all_urls>` (host) | The region-selection overlay, full-page scroll capture, click-ripple/keystroke overlays for recordings, and click/console context must work on any site the user is deploying or testing — the target site cannot be known in advance. All processing is local; see PRIVACY.md. |

## Manifest V3 compliance checklist

- [x] Manifest V3 service worker, no persistent background page.
- [x] **No remote code** — all JS/CSS bundled; no CDN scripts, no `eval`.
- [x] Minimal permissions — no `notifications`, `history`, `webRequest`, etc.
- [x] Privacy policy: `PRIVACY.md` (host a copy at a public URL and link it in the developer dashboard).
- [x] No analytics/tracking; no data leaves the machine (limited use policy: N/A — no user data transmitted).
- [x] Extension name/description free of keyword spam.
- [ ] Store assets to prepare at submission: 128×128 icon (have), at least one 1280×800 or 640×400 screenshot, short & long description (reuse README), category: Developer Tools.
- [ ] Justify each permission in the dashboard "Privacy practices" tab using the table above.
- [ ] Declare that remote code is not used and data is not sold/transferred.

## Listing copy (draft)

**Short description (≤132 chars):**
"Deployment feedback made easy: annotated screenshots and voice screencasts, saved locally or shared via email. No accounts, no cloud."

**Category:** Developer Tools · **Language:** English (Polish UI included)
