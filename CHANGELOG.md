# Changelog

All notable changes to **UsrHelper** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Nothing yet._

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

[Unreleased]: https://github.com/AmigoUK/UsrHelper/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/AmigoUK/UsrHelper/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/AmigoUK/UsrHelper/releases/tag/v0.0.1
