# Changelog

All notable changes to **UsrHelper** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Nothing yet._

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

[Unreleased]: https://github.com/AmigoUK/UsrHelper/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/AmigoUK/UsrHelper/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/AmigoUK/UsrHelper/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/AmigoUK/UsrHelper/releases/tag/v0.0.1
