# UsrHelper — Chrome Extension Design

**Date:** 2026-07-17 · **Status:** approved

## Problem

During software deployments, testers and end users need a frictionless way to report what they see: an annotated screenshot or a narrated screen recording, delivered to the development team by email or dropped into a shared folder. Existing tools are heavyweight, SaaS-bound, or require accounts. UsrHelper is a zero-backend Chrome extension: everything is captured, annotated, and saved locally; email hand-off uses `mailto:`.

## Decisions (from requirements interview)

| Topic | Decision |
|---|---|
| Email delivery | Local save + `mailto:` only (no backend, no OAuth). To + CC lists come from settings; UI reminds the user to attach the saved file. |
| Save location | Subfolder of `Downloads/` via `chrome.downloads` (subfolder name configurable per profile). |
| Screenshot modes | Visible area · full page (scroll & stitch) · selected region. |
| Annotation tools | Freehand marker, rectangle/ellipse, arrow, text, numbered step markers, crop, undo/redo, **anonymization brush** (paints a pixel mosaic; irreversibly baked into the exported bitmap; undoable inside the editor). |
| Screencast | Source picker (tab/window/screen via `getDisplayMedia`), mic narration, mic level meter, 3-2-1 countdown, pause/resume, optional camera bubble, elapsed timer, configurable total cap (default 30 min) with **automatic clip splitting** (default 5 min, standalone `.webm` files `_part-01`, `-02`, …). |
| Click visualization | Ripple around the cursor while recording; pressed-key / click-type captions at the bottom; click-path buffer stamped onto screenshots as numbered markers. |
| Timestamp | In the file name (`UsrHelper_YYYY-MM-DD_HH-MM-SS`), stamped visibly in the image/recording corner, and in a companion `.json`. |
| Report context | Auto environment metadata (URL, title, resolution, browser/OS versions), recent console errors, report history in the popup, project profiles (recipients, CC, folder, description template, limits). |
| Languages | UI in English (default) and Polish — toggle in settings stored in `storage.sync`; custom lightweight i18n module (JSON dictionaries + `useT()` hook) because `chrome.i18n` cannot switch independently of the browser locale. All GitHub documentation in English. |
| Stack | TypeScript + WXT (Manifest V3) + Preact; hand-rolled `<canvas>` annotation editor; Vitest. |

## Architecture

| Module (WXT entrypoint) | Responsibility |
|---|---|
| `background` (service worker) | Orchestration: `tabs.captureVisibleTab`, saving via `chrome.downloads` (subfolder + timestamped names), full-page stitch coordination, message routing, `mailto:` URL construction |
| `content` (content script) | On-page overlays: click ripples, key captions, region-selection rectangle, click-path buffer, visible recording timestamp/clock, console error capture (injected script: `window.onerror` + `console.error` patch) |
| `popup` | Menu: three capture modes, record start/stop/pause, mic indicator, report history, profile switcher |
| `editor` (full tab) | Canvas editor with an annotation object layer + description panel + Save / Save + Email. Full-screen workspace — no credit footer |
| `recorder` (dedicated tab) | `getDisplayMedia` + `getUserMedia` (mic, optional camera), `MediaRecorder` restarted every N minutes (clips), audio mixing, canvas compositing for camera bubble/timestamp (`captureStream` only when needed; direct stream otherwise) |
| `options` | Project profiles (To/CC, subfolder, description template, clip limits, feature toggles), language toggle, credit footer + version |

**Storage:** `chrome.storage.sync` — settings + profiles; `chrome.storage.local` — report history (metadata, dataURL thumbnails, file paths — no blobs).

**Permissions:** `activeTab`, `tabs`, `downloads`, `storage`, `scripting`, `notifications`; host permissions `<all_urls>`.

## Error handling

Screen/mic permission denied → clear instruction; no microphone → offer recording without audio with a warning; `downloads` failure → retry + keep blob in memory for manual download; total-cap reached → auto-stop with notification; `chrome://` / Web Store pages → "cannot capture" notice; `mailto:` body too long → truncate with a note pointing to the `.json` file.

## Testing

Unit tests (Vitest) for `lib/`: file name generation, clip-splitting logic, click buffer, mailto construction, full-page stitching math, pixelation. Manual E2E checklist in `docs/TESTING.md` (load unpacked build). Release management from `v0.0.1`: Keep-a-Changelog, git tags, GitHub Releases at `github.com/AmigoUK/UsrHelper`.
