# Changelog

All notable changes to **UsrHelper** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Nothing yet._

## [0.4.5] — 2026-07-21

### Security
- All 16 open Dependabot alerts (5 critical, 6 high, 5 moderate) are closed — `npm audit` reports zero. Every one of them sat in the build toolchain; the only runtime dependency is Preact, so no vulnerable code was ever shipped to users or to the Chrome Web Store.
- Toolchain upgraded: WXT 0.19 → 0.20.27, Vitest 2.1 → 4.1, Vite 5.4 → 8.1 (the whole tree now shares one Vite; the audit flagged every Vite ≤ 6.4.2).
- Patched transitive build dependencies pinned via `package.json` `overrides` — tar, tmp, adm-zip, shell-quote, uuid, esbuild. Their parents (`giget`, `web-ext-run`, which serve `wxt init` templates and Firefox runs this project never uses) still ship the vulnerable ranges, so no wxt release fixes them.

### Changed
- **BREAKING (build only)** WXT 0.20 removed the `extensionApi` option; it is gone from `wxt.config.ts` and the global `chrome.*` API is now typed through `@types/chrome`. No change to the extension's behaviour, permissions or manifest — verified by the full suite: 35 unit tests and 39/39 E2E checks against the built extension.

## [0.4.4] — 2026-07-21

### Fixed
- A text annotation was added **twice** for a single text box (user report). Chrome fires `blur` on the textarea while it is being removed from the DOM, so pressing Enter ran the commit once for the key and once for that blur — the text was drawn on top of itself and Undo had to be pressed twice to remove it. The commit is now gated by a synchronously cleared anchor, so whichever trigger fires first commits and the rest are no-ops.
- Every text box after the first one opened **unfocused** and swallowed the typing: the `autofocus` attribute is processed only once per document. The editor now focuses the box explicitly when it opens.
- Escape now really discards the draft and closes the box. It used to leave the box behind, and a leftover box blocks `onPointerDown` — which made every drawing tool go dead until the editor was reopened.

### Added
- `scripts/probe-text-dup.mjs` — focused Playwright repro for the text-box commit path; the same assertions run inside the main E2E suite (`scripts/e2e.mjs`).

## [0.4.3] — 2026-07-20

### Fixed
- Long annotation text no longer runs off the image in one endless line: text wraps to ~40% of the image width and the whole block is kept inside the image even when anchored at an edge (user report).
- The text input box is now a fixed-width (320 px), wrapping field that always stays fully on screen, wherever you click.

### Changed
- The Select tool icon is now a classic mouse-pointer arrow (SVG) — users found the previous abstract glyph confusing (user report).

## [0.4.2] — 2026-07-17

### Added
- Complete user guide in English and Polish with screenshots generated from the real extension: Markdown (`docs/manual/`), an online version with a language toggle (GitHub Pages, `docs/index.html`), and printable PDFs attached to releases.
- Documentation tooling: `scripts/make-docs-shots.mjs` (Playwright screenshot generator) and `scripts/make-docs-html.mjs` (Markdown → HTML build).

## [0.4.1] — 2026-07-17

### Fixed
- Settings did not open from `chrome://extensions` — the embedded options modal silently failed to appear. Options now open in a full browser tab (`options_ui.open_in_tab: true`), which also suits the full-width settings layout. Verified against the v0.4.0 artifact (row click → nothing) vs the fix (row click → settings tab).

## [0.4.0] — 2026-07-17

### Fixed
- **Screencasts froze/failed when the recorder tab was hidden** (the normal case — users switch to the app they are demoing). Chrome throttles `requestAnimationFrame` in hidden tabs, which stalled the canvas compositor. Composition now runs in a Web Worker via WebCodecs (`MediaStreamTrackProcessor` → `OffscreenCanvas` → `MediaStreamTrackGenerator`), immune to tab visibility. Verified: 38 frames (frozen) → 252 frames (~20 fps) for a 12.5 s hidden-tab recording. Falls back to the raw display stream (no bubble/timestamp) on browsers without the API.

### Added
- **Reporter details** in settings: customer no., company, first name, last name, AnyDesk no. — included in every report JSON (`reporter` field) and in the email body ("Reporter: Jan Kowalski | ACME | #C-102 | AnyDesk: …").
- Throttling reproduction script (`scripts/repro-throttle.mjs`) that runs the extension under real-Chrome background-throttling conditions; E2E suite extended to 36 checks (reporter details in saved JSON).
- `CLAUDE.md` project memory (stack, conventions, protected files, gotchas).

## [0.3.1] — 2026-07-17

### Fixed
- Console errors from the page are now actually captured: a MAIN-world content script observes uncaught errors, unhandled rejections, and `console.error` calls and relays them to the extension (isolated worlds never receive the page's error events).
- Full-page capture no longer hides the sticky/fixed header on the first (top) segment — it appears exactly once in the stitched image.

### Added
- Automated E2E suite (`scripts/e2e.mjs`, Playwright): 35 checks driving the real extension in Chromium — settings/i18n, all three capture modes, every editor tool including mosaic pixel verification, undo/redo, saves with JSON content validation, recording with clip splitting, overlays, burned-in timestamp frame analysis, and popup history.

## [0.3.0] — 2026-07-17

### Added
- Screencast recorder: source picker (tab/window/screen), microphone narration with live level meter, 3-2-1 countdown, pause/resume, elapsed-time counter.
- Automatic clip splitting: standalone `.webm` clips every N minutes (profile setting, default 5) with a total cap (default 30 min) and auto-stop notice.
- Optional Loom-style camera bubble and burned-in timestamp via canvas compositing.
- Recording overlays on pages: click ripples (left/right differentiated), pressed-key and click-type captions, live timestamp clock; enabled across tabs for the duration of the recording.
- Report history actions in the popup: show saved file, re-open a pre-filled email.
- Chrome Web Store compliance: PRIVACY.md, permission justifications and listing checklist (docs/STORE_LISTING.md), dropped unused `notifications` permission.

## [0.2.0] — 2026-07-17

### Added
- Screenshot capture in three modes: visible area, full page (scroll & stitch with sticky-element hiding), and selected region (drag overlay, Esc cancels).
- Annotation editor: freehand marker, rectangle, ellipse, arrow, text, numbered step markers, crop with apply/cancel, select/move/delete, undo/redo (Ctrl+Z / Ctrl+Y).
- Anonymization brush: paints a pixel mosaic (block-average) that is irreversibly baked into the exported PNG.
- Click-path stamping: recent page clicks can be added to the screenshot as numbered markers.
- Export pipeline: timestamped PNG + companion JSON (description, URL, environment, console errors, click path) saved to the profile subfolder; optional pre-filled email via mailto with attach reminder.
- Popup with capture actions, project profile switcher, and restricted-page detection.
- Console error and click tracking in the content script.

## [0.1.0] — 2026-07-17

### Added
- Settings page: project profiles (email To/CC, subject prefix, Downloads subfolder, description template, clip limits), feature toggles, and EN/PL language switch.
- Core libraries: timestamped file naming, subfolder sanitization, `chrome.downloads` saving, `mailto:` builder with To/CC and body truncation, environment metadata collection, report history storage.
- Credit footer with version display on the settings page.
- Unit tests (Vitest) for file naming and mailto construction.

## [0.0.1] — 2026-07-17

### Added
- Initial project scaffold: WXT (Manifest V3) + TypeScript + Preact + Vitest.
- i18n module with English (default) and Polish dictionaries.
- Extension icons and base entrypoints (background, content script).

[Unreleased]: https://github.com/AmigoUK/UsrHelper/compare/v0.4.5...HEAD
[0.4.5]: https://github.com/AmigoUK/UsrHelper/compare/v0.4.4...v0.4.5
[0.4.4]: https://github.com/AmigoUK/UsrHelper/compare/v0.4.3...v0.4.4
[0.4.3]: https://github.com/AmigoUK/UsrHelper/compare/v0.4.2...v0.4.3
[0.4.2]: https://github.com/AmigoUK/UsrHelper/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/AmigoUK/UsrHelper/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/AmigoUK/UsrHelper/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/AmigoUK/UsrHelper/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/AmigoUK/UsrHelper/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/AmigoUK/UsrHelper/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/AmigoUK/UsrHelper/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/AmigoUK/UsrHelper/releases/tag/v0.0.1
