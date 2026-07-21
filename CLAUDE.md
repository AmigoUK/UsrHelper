# Project Overview
UsrHelper is a zero-backend Chrome extension (Manifest V3) for software-deployment feedback: annotated screenshots and narrated screen recordings saved to Downloads and handed off by `mailto:`. All data stays on the user's machine.

# Tech Stack
- TypeScript 5.6 (strict), Preact 10.24
- WXT 0.20 (Manifest V3 build framework, Vite 8.1) — `extensionApi` was removed in 0.20, so the global `chrome.*` API is typed via `@types/chrome`
- Vitest 4.1 (unit tests in `tests/`), Playwright 1.61 (E2E: `xvfb-run -a node scripts/e2e.mjs`)
- Node 22.23 / npm 10.9
- Chrome APIs: downloads, storage (sync+local), scripting, tabs, activeTab; WebCodecs Breakout Box (MediaStreamTrackProcessor/Generator, Chrome 94+) for recording composition

# Naming & Coding Conventions
- Entrypoints in `entrypoints/` (WXT convention: `background.ts`, `content.ts`, `*.content.ts`, page dirs with `index.html` + `main.tsx`); shared logic in `lib/` (camelCase files), UI components in `components/` (PascalCase).
- i18n: every UI string goes through `useT()`/`translate()` with keys in `lib/i18n/{en,pl}.json` (EN is the fallback and default). GitHub docs in English; conversation with the owner in Polish.
- Pure logic (filenames, mailto, stitching, clip timing, pixelation) lives in `lib/` and MUST have Vitest coverage — these run without a browser.
- Releases: SemVer from v0.0.1, Keep-a-Changelog in CHANGELOG.md, annotated git tags, GitHub Releases with the `npm run zip` artifact attached.
- `package.json` `overrides` pin patched transitive build dependencies (tar, tmp, adm-zip, shell-quote, uuid, esbuild). `npm audit` must stay at zero; drop an override only once the parent ships the fix itself.

# Protected Files
- `docs/superpowers/specs/*` — approved design specs; do not rewrite history, add new dated specs instead.
- `PRIVACY.md` and `docs/STORE_LISTING.md` — Chrome Web Store compliance documents; every permission or data-flow change must be reflected there, never silently.
- `public/icon/*` — brand assets; regenerate only on explicit request.

# Critical gotchas (learned the hard way)
- Hidden tabs throttle rAF/timers: anything that must run during recording lives in a Web Worker (`entrypoints/compositor-worker.ts`), never in page rAF.
- Playwright's default args DISABLE background throttling — E2E must pass `ignoreDefaultArgs` for the throttling flags to reproduce real-Chrome recording behaviour (see `scripts/repro-throttle.mjs`).
- Playwright renames downloads to bare GUID files; verify downloads by MIME/content, not filename.
- Isolated-world content scripts never see the page's uncaught errors — error capture requires the MAIN-world script (`entrypoints/errors.content.ts`).
