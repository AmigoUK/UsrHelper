# Manual E2E test checklist

Build & load: `npm run build` → `chrome://extensions` → Developer mode → **Load unpacked** → `.output/chrome-mv3/`.

## Screenshots

- [ ] **Visible area** on any page → editor opens with the capture.
- [ ] **Full page** on a long page (e.g. a news site) → no duplicated sticky headers, page restored to top afterwards.
- [ ] **Region**: drag a rectangle → only that region opens in the editor; Esc cancels.
- [ ] Restricted page (`chrome://extensions`, Web Store) → capture buttons disabled with a notice.

## Editor

- [ ] Every tool draws: marker, rectangle, ellipse, arrow, text (Enter commits, Esc cancels), step markers auto-number 1-2-3.
- [ ] **Anonymization brush**: paint over text → mosaic; in the saved PNG the text is unreadable and no original pixels are recoverable (zoom in to verify).
- [ ] Crop: drag + Apply crops the image; annotations keep their positions relative to content.
- [ ] Undo/redo (buttons and Ctrl+Z / Ctrl+Y) across draws and crop; select tool moves and Del deletes an annotation.
- [ ] "Add click path" stamps orange numbered markers where you clicked before capturing.
- [ ] Save → PNG + JSON land in `Downloads/<subfolder>/` with timestamped names; timestamp stamped in the image corner (if enabled).
- [ ] Save + Email → mail client opens with To/CC from the active profile, subject prefix, body with metadata, attach reminder shown in UI.
- [ ] Save + Copy → confirmation card appears; paste into a GitHub issue or Jira description and the heading, metadata table and code block render (raw `|` characters mean the target does not do Markdown, not a bug in the report).
- [ ] JSON contains description, URL, title, environment, console errors (trigger one via DevTools first), click path.

## Screencast

- [ ] Mic level meter moves when speaking; camera bubble toggle works.
- [ ] Start → Chrome source picker (tab/window/screen) → 3-2-1 countdown → recording.
- [ ] Click ripples + key captions (e.g. Ctrl+S, Right click) visible on pages while recording; plain typing NOT captioned.
- [ ] Timestamp burned into the recording corner (when enabled).
- [ ] Pause freezes the timer; resume continues; elapsed time excludes the pause.
- [ ] Set clip length 1 min, record >2 min → multiple standalone playable `_part-01.webm`, `_part-02.webm` files.
- [ ] Set max 2 min → auto-stop with the limit notice.
- [ ] Stop & save → clips listed, JSON saved, Save + Email opens the mail client, Save + Copy puts the report in the clipboard.
- [ ] "Stop sharing" from Chrome's bar behaves like Stop.

## Settings & popup

- [ ] Language EN↔PL switches all views instantly; default is EN on a fresh profile.
- [ ] Profiles: add/edit/delete, active profile switch in popup; subfolder change routes new files.
- [ ] History in popup: entries with thumbnails; "Show file" opens the file manager; "Email again" opens a pre-filled email.
- [ ] Credit footer with version visible on the settings page.

## Automated

```bash
npm run test     # 134 unit tests
npm run compile  # tsc --noEmit
npm run build
xvfb-run -a node scripts/e2e.mjs   # 56 end-to-end checks in real Chromium
```
