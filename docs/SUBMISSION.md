# Chrome Web Store — submission pack (v0.9.1 update)

The extension is **already published**; this is an update to the existing item,
not a new submission. File to upload: `.output/usrhelper-0.9.1-chrome.zip`
(rebuild with `npm run zip` if needed).

**The single most important fact for this review: the permission set is
unchanged from the published version.** Verified against the published package:

| | Published | v0.9.1 |
|---|---|---|
| `permissions` | activeTab, tabs, downloads, storage, scripting | identical |
| `host_permissions` | `<all_urls>` | identical |
| `optional_permissions` | none | none |

No new permissions means no re-consent prompt for existing users, and no new
permission justifications to write. One content script was added
(`consolescope.js`, isolated world, `document_start`); it **narrows** behaviour
rather than extending it — see the reviewer note in section 5.

---

## 1. Account

Already done: developer account paid, 2-Step Verification on, **Non-Trader**
status set, contact email verified. Nothing to change.

## 2. Package tab

**Package → Upload new package** → `usrhelper-0.9.1-chrome.zip`.

The version in `manifest.json` (0.9.1) must be higher than the published one, or
the upload is rejected. It is.

## 3. Store listing tab

Title, summary, category and language are unchanged:

| Field | Value |
|---|---|
| Title | `UsrHelper` |
| Summary (≤132) | `Deployment feedback made easy: annotated screenshots and voice screencasts, saved locally or sent by email. No accounts, no cloud.` (130 chars — the previous wording in this file was 133 and would have been rejected) |
| Category | `Developer Tools` |
| Language | `English` |

**Detailed description — replace with this (the old text predates sticky notes,
profile sharing, and the narrowed console-error capture):**

```
UsrHelper makes software-deployment feedback effortless. Testers and end users capture annotated screenshots or record screencasts with voice narration — the finished report is saved locally with a timestamp and handed off by email. No backend, no accounts, no cloud: everything stays on your machine.

SCREENSHOTS
• Three capture modes: visible area, full page (auto-scroll & stitch), selected region
• Annotation editor: marker, rectangle, ellipse, arrow, text, numbered step markers, crop, undo/redo
• Yellow sticky notes for a comment of a sentence or two — numbered on the image, and repeated as text in the report so the developer can quote them instead of retyping from the screenshot
• Anonymization brush — paint a pixel mosaic over sensitive data, irreversibly baked into the exported image
• Click path — recent clicks stamped onto the screenshot as numbered markers

SCREENCASTS
• Record a tab, window, or the entire screen with microphone narration
• Mic level meter, 3-2-1 countdown, pause/resume, elapsed timer
• Optional camera bubble and burned-in timestamp
• Long recordings split automatically into standalone clips (configurable)
• Click ripples and pressed-key captions visible on the recording (plain typing is never shown)

REPORTING
• Files saved to a configurable subfolder of Downloads with a timestamp in the name
• Companion JSON with description, reporter details, page URL/title, sticky notes, environment info (including the real OS version and CPU architecture), click path, and JavaScript errors
• One-click email hand-off (mailto) with recipients and CC from settings
• Project profiles you can export to a file and hand to your testers — importing shows the recipients for confirmation before anything is stored
• Report history, and a UI in English and Polish

PRIVACY
All processing is local. The extension has no backend, no analytics, and never transmits data anywhere. Messages an application logs through console.error are captured only on the domains you list in your project profile — that list is empty by default, so the extension does not touch any other site's console. Privacy policy: https://amigouk.github.io/UsrHelper/privacy.html

Documentation: https://amigouk.github.io/UsrHelper/
Source code: https://github.com/AmigoUK/UsrHelper
```

**Graphics — re-upload the screenshots; the published ones predate sticky notes,
the version badge and the current Settings page:**

| Asset | File |
|---|---|
| Store icon 128×128 | `public/icon/128.png` (unchanged) |
| Screenshots 1280×800 (upload in this order) | `docs/manual/images/editor.png`, `docs/manual/images/recording-overlay.png`, `docs/manual/images/recorder-setup.png`, `docs/manual/images/settings.png`, `docs/manual/images/install-extensions-page.png` |
| Small promo tile 440×280 | `docs/store-assets/promo-tile-440x280.png` (unchanged) |

## 4. Privacy tab

Single purpose and permission justifications are **unchanged** — the permissions
themselves did not change, so leave the existing text in place:

```
Capturing deployment feedback: the extension's only purpose is letting users create annotated screenshots and narrated screen recordings of the software they are testing, saved locally and handed off by email.
```

**Data usage declarations** — keep **Website content** ticked, and update the
description to match the narrowed capture:

```
Screenshots and recordings the user explicitly starts, the page URL and title, and JavaScript errors. Messages logged through console.error are captured only on domains the user configured in their project profile; that list is empty by default. All processing is local, nothing is transmitted, sold, or shared.
```

Privacy policy URL is unchanged: `https://amigouk.github.io/UsrHelper/privacy.html`

## 5. Note for the reviewer (optional field, worth filling in)

```
This update adds annotation features and profile sharing. It requests no new permissions — the permission set is byte-identical to the published version.

One content script was added (consolescope.js, isolated world). It exists to REDUCE what the extension touches: previously the extension wrapped console.error on every page in order to include recent errors in a bug report. It now does so only on domains the user has explicitly listed in their project profile, which is empty by default. On every other site the extension no longer enters the page's console call path at all.

All processing remains local; the extension has no backend and transmits nothing.
```

## 6. Distribution tab

Nothing to change unless you want to switch visibility. Confirm the current
setting is what you want before submitting — changing it triggers a re-review.

## 7. Submit

- **Submit for review.** An update still goes through review; with no permission
  change it is usually faster than the first submission.
- The published version stays live for existing users until the update is
  approved, so a slow review costs nothing.
- If rejected, the email carries a colour+element code — fix and resubmit, or
  file one substantiated appeal.

## 8. What ships in this update (v0.4.4 → v0.9.1)

Six releases have accumulated since the published build:

- **v0.4.4** — a text annotation was added twice for one text box (user report);
  every text box after the first opened unfocused; Escape left a box behind that
  blocked every drawing tool.
- **v0.4.5** — all 16 Dependabot alerts closed; build toolchain upgraded.
- **v0.5.0** — `console.error` capture narrowed to project domains.
- **v0.5.1** — the "track click path" switch was doing nothing; duplicate labels
  in Settings.
- **v0.6.0** — reports named the wrong machine (`MacIntel` on Apple Silicon,
  macOS frozen at 10_15_7); now read from User-Agent Client Hints.
- **v0.7.0** — version shown next to the app name; feedback footer.
- **v0.8.0** — yellow sticky notes.
- **v0.9.0 / v0.9.1** — profile export/import; the text box no longer swallows
  the first characters typed into it.
