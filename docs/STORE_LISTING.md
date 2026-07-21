# Chrome Web Store — listing & review notes

Working notes to satisfy the [Chrome Web Store program policies](https://support.google.com/chrome/a/answer/2714278) at publication time. Last validated against the codebase: 2026-07-17 (v0.4.2).

## Single purpose

UsrHelper has one purpose: **capturing deployment feedback** — annotated screenshots and narrated screen recordings saved locally and handed off by email. Every permission below serves that purpose. (Two capture modes, one goal — analogous to Google's accepted "multiple functions, one narrow purpose" examples.)

## Permission justifications (for the review form)

| Permission | Justification |
|---|---|
| `activeTab` | Capture the tab the user is looking at when they click a capture button. |
| `tabs` | Read the active tab's URL/title to include in the report metadata and detect pages that cannot be captured (`chrome://`). |
| `downloads` | Save screenshots, recordings, and report `.json` files into the user-chosen subfolder of Downloads. |
| `storage` | Store user settings, project profiles, and local report history. |
| `scripting` | Inject the capture helper into already-open tabs right after install/update (the registered content script only loads on new navigations). |
| `<all_urls>` (host) | Required for capabilities that must exist **before or across** user actions and therefore cannot be granted per-click via `activeTab`: (1) the click-path buffer and console-error context are collected in the seconds *before* the user decides to capture — on-demand injection would arrive too late to have seen them; (2) during a screencast, click ripples and keystroke captions must follow the user across every tab they switch to; (3) the region-selection overlay and full-page scroll capture must work on whatever site the customer is testing, which cannot be known in advance. All processing is local; nothing is transmitted (see privacy policy). |

**Decision (2026-07-17):** keep `<all_urls>` and accept the likely in-depth manual review (1–2 weeks). Downgrading to `activeTab`+on-demand injection would silently break the click-path, pre-capture console context, and cross-tab recording overlays — core product value.

## Verified compliance state (v0.4.2)

- [x] Manifest V3, `background.service_worker`, `action.default_popup`, `host_permissions` separated.
- [x] **No remote code, no `eval`/`new Function`** — verified by grep over sources and the built bundle.
- [x] Icons 16/32/48/96/128 px present in `public/icon/` and emitted into the manifest.
- [x] No `_locales/` directory (custom i18n module) → `default_locale` must stay absent. ✔ consistent.
- [x] Recording uses web APIs (`getDisplayMedia`/`getUserMedia` + WebCodecs) — `tabCapture`/`desktopCapture`/`offscreen` permissions are NOT needed and NOT declared.
- [x] Version consistent: `package.json` 0.4.2 = latest CHANGELOG entry (WXT takes the manifest version from `package.json`).
- [x] Descriptions unified between `package.json` and `wxt.config.ts` (≤132 chars).
- [x] **Privacy policy at a public HTTPS URL:** https://amigouk.github.io/UsrHelper/privacy.html (built from `PRIVACY.md` by `scripts/make-docs-html.mjs`; includes the Limited Use compliance statement).
- [x] No analytics/tracking; no data leaves the machine. Data-usage declaration to tick in the dashboard: *website content* (screenshots, page URL/title, console errors) — processed locally only, not sold, not transferred, single-purpose only.
- [x] Store assets: screenshots 1280×800 ready in `docs/manual/images/` (editor.png, settings.png, recorder-*.png, recording-overlay.png); promo tile 440×280 in `docs/store-assets/promo-tile-440x280.png`; store icon = `public/icon/128.png`.

## Dashboard submission checklist

1. Developer account: one-time $5 fee, 2-Step Verification enabled, developer email monitored (mail from `chromewebstore-noreply@google.com`, check spam).
2. **Trader / Non-Trader declaration** (EEA consumer law; applies regardless of UK residence). **Decision (2026-07-17): Non-Trader** — the extension is free, attv.uk generates no revenue, there is no registered business behind the distribution, and the purpose is a student portfolio / personal brand. Revisit and switch to Trader if UsrHelper ever promotes paid services, gains a paid tier, or a registered business (self-employed/Ltd) takes over distribution. Non-Trader means no public disclosure of personal contact details; EEA users see a consumer-rights notice; no effect on ranking or review.
3. Package: `npm run zip` → upload `.output/usrhelper-X.Y.Z-chrome.zip` (manifest at zip root, no comments, no sources/`node_modules`).
4. Store listing: title "UsrHelper" (≤75), summary ≤132 chars (no superlatives), detailed description from README features, category **Developer Tools**, language English.
5. Privacy practices tab: single-purpose sentence, permission justifications (table above), data-usage boxes + certifications, privacy policy URL (above).
6. Distribution: consider **Unlisted** for the first submission (same review, no public listing) → switch to Public after real-account testing (triggers re-review). Free.
7. Submit for review; optionally use **deferred publish** (staged submission stays publishable for 30 days, then reverts to draft). Expect >3 days up to ~2–3 weeks due to `<all_urls>`; contact developer support if pending >3 weeks.
8. If rejected: the email carries a "colour + element" violation code (e.g. Purple Potassium = perceived excessive permissions). Fix and resubmit, or file **one** substantiated appeal.
9. Updates: bump version, `npm run zip`, upload; avoid bundling permission changes with big listing changes; avoid Friday submissions. Gradual percentage rollout becomes available above 10k 7-day active users.

## Listing copy (draft)

**Short description (≤132 chars):**
"Deployment feedback made easy: annotated screenshots and voice screencasts, saved locally or shared via email. No accounts, no cloud."

**Category:** Developer Tools · **Language:** English (Polish UI included)

**Support / homepage URL:** `https://attv.uk/projects/usrhelper.html` — carries the public roadmap
(vote on what gets built next) and a problem-report form that accepts screenshots. Pointing the
listing here gives users somewhere to go with a feature request instead of leaving a one-star review.
