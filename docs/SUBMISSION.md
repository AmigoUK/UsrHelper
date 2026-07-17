# Chrome Web Store — copy-paste submission pack (v0.4.2)

Everything below maps 1:1 to the developer dashboard fields. File to upload:
`.output/usrhelper-0.4.2-chrome.zip` (rebuild with `npm run zip` if needed).

---

## 1. Account (must be done by the owner)

1. https://chrome.google.com/webstore/devconsole → sign in (consider a dedicated Google account).
2. Accept the developer agreement, pay the **one-time $5 fee**.
3. Enable **2-Step Verification** on the Google account (mandatory).
4. Account tab → **Trader status: Non-Trader** (decision recorded in STORE_LISTING.md).
5. Set and verify the contact email (watch for mail from `chromewebstore-noreply@google.com`).

## 2. Package

**Add new item** → upload `usrhelper-0.4.2-chrome.zip`.

## 3. Store listing tab

| Field | Value |
|---|---|
| Title | `UsrHelper` |
| Summary (≤132) | `Deployment feedback made easy: annotated screenshots and voice screencasts, saved locally or shared via email. No accounts, no cloud.` |
| Category | `Developer Tools` |
| Language | `English` |

**Detailed description (paste as-is):**

```
UsrHelper makes software-deployment feedback effortless. Testers and end users capture annotated screenshots or record screencasts with voice narration — the finished report is saved locally with a timestamp and handed off by email. No backend, no accounts, no cloud: everything stays on your machine.

SCREENSHOTS
• Three capture modes: visible area, full page (auto-scroll & stitch), selected region
• Annotation editor: marker, rectangle, ellipse, arrow, text, numbered step markers, crop, undo/redo
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
• Companion JSON with description, reporter details, page URL/title, environment info, recent console errors, and click path
• One-click email hand-off (mailto) with recipients and CC from settings
• Report history and switchable project profiles
• UI in English and Polish

PRIVACY
All processing is local. The extension has no backend, no analytics, and never transmits data anywhere. Privacy policy: https://amigouk.github.io/UsrHelper/privacy.html

Documentation: https://amigouk.github.io/UsrHelper/
Source code: https://github.com/AmigoUK/UsrHelper
```

**Graphics:**

| Asset | File |
|---|---|
| Store icon 128×128 | `public/icon/128.png` |
| Screenshots 1280×800 (upload in this order) | `docs/manual/images/editor.png`, `docs/manual/images/recording-overlay.png`, `docs/manual/images/recorder-setup.png`, `docs/manual/images/settings.png`, `docs/manual/images/install-extensions-page.png` |
| Small promo tile 440×280 | `docs/store-assets/promo-tile-440x280.png` |

## 4. Privacy tab

**Single purpose (paste):**

```
Capturing deployment feedback: the extension's only purpose is letting users create annotated screenshots and narrated screen recordings of the software they are testing, saved locally and handed off by email.
```

**Permission justifications (paste each):**

| Permission | Justification |
|---|---|
| `activeTab` | Captures the tab the user is looking at when they click a capture button in the popup. |
| `tabs` | Reads the active tab's URL and title to include them in the report metadata, and detects browser-internal pages that cannot be captured. |
| `downloads` | Saves the screenshots, recording clips, and report JSON files into the user-chosen subfolder of Downloads. |
| `storage` | Stores user settings, project profiles, and the local report history. Nothing is synced to any third party. |
| `scripting` | Injects the capture helper into tabs that were already open before the extension was installed or updated (the declared content script only loads on new navigations). |
| Host permission `<all_urls>` | Required for capabilities that must exist before or across user actions and therefore cannot be granted per-click: (1) the click-path and console-error context shown in reports are collected in the seconds before the user decides to capture — injecting on demand would arrive too late; (2) during a screencast, click ripples and keystroke captions must follow the user across every tab they switch to; (3) the region-selection overlay and full-page capture must work on whatever site the customer is testing, which cannot be known in advance. All processing is strictly local; no data ever leaves the machine (see privacy policy). |

**Data usage declarations:**
- Tick: **Website content** (screenshots, page URL/title, console errors — processed locally only).
- Certify all three statements (no sale of data, no use unrelated to the single purpose, no use for creditworthiness).
- Privacy policy URL: `https://amigouk.github.io/UsrHelper/privacy.html`

## 5. Distribution tab

- Visibility: **Unlisted** for the first submission (same review; switch to Public later — that triggers a re-review).
- Regions: all · Price: free.

## 6. Submit

- **Submit for review**; optionally untick auto-publish (deferred publish gives a 30-day window to publish manually).
- Expected review time: a few days, up to 2–3 weeks (manual review likely due to `<all_urls>`). Pending >3 weeks → contact developer support.
- If rejected, the email carries a colour+element code (e.g. Purple Potassium = perceived excessive permissions) — fix and resubmit, or file one substantiated appeal.
