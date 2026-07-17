# UsrHelper

A Chrome extension that makes software-deployment feedback effortless. Testers and end users capture **annotated screenshots** or record **screencasts with voice narration**, and the report is saved locally with a timestamp and/or handed off to email — no backend, no accounts.

## Features

### Screenshots
- **Three capture modes:** visible area, full page (auto-scroll & stitch), selected region.
- **Annotation editor:** freehand marker, rectangle/ellipse, arrow, text, numbered step markers (1-2-3…), crop, full undo/redo.
- **Anonymization brush:** paint a pixel mosaic over sensitive data — irreversibly baked into the exported image.
- **Click path:** the last clicks on the page can be stamped onto the screenshot as numbered markers.
- Timestamp in the file name, stamped in the image corner, and stored in a companion `.json`.

### Screencasts
- Source picker on start (tab / window / entire screen) with microphone narration.
- Mic level indicator, 3-2-1 countdown, pause/resume, elapsed-time counter.
- Optional Loom-style camera bubble.
- **Automatic clip splitting:** long recordings are split into standalone clips (default 5 min, total cap 30 min — configurable).
- Click ripples and pressed-key captions visible on the recording.

### Reporting
- Files saved to a configurable subfolder of `Downloads/` with a timestamp in the name.
- Companion `.json` with the description, exact time, page URL/title, environment info (browser, OS, resolution), recent console errors, and click path.
- **Email hand-off:** one click opens a pre-filled email (`mailto:`) with To/CC recipients from settings; the extension reminds you which file to attach.
- Report history in the popup (thumbnails, show file, re-email).
- **Project profiles:** switchable sets of recipients, folder, description template, and limits.
- UI in **English** (default) and **Polish**.

## Documentation

- 📖 **[User Guide (English)](docs/manual/USER_GUIDE.en.md)** · **[Instrukcja użytkownika (polski)](docs/manual/USER_GUIDE.pl.md)** — with screenshots
- 🌐 Online version with a language toggle: **[amigouk.github.io/UsrHelper](https://amigouk.github.io/UsrHelper/)**
- 📄 Printable PDFs: [EN](docs/manual/pdf/UsrHelper_User_Guide_EN.pdf) · [PL](docs/manual/pdf/UsrHelper_Instrukcja_PL.pdf) (also attached to each release)

Screenshots are generated from the real extension (`scripts/make-docs-shots.mjs`); the HTML page is built from the Markdown guides (`scripts/make-docs-html.mjs`).

## Installation (development)

```bash
npm install
npm run build
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select `.output/chrome-mv3/`.

For development with hot reload:

```bash
npm run dev
```

## Testing

```bash
npm run test      # unit tests (Vitest)
npm run compile   # type check
```

Manual E2E checklist: see [docs/TESTING.md](docs/TESTING.md).

## Privacy

Everything stays on your machine: captures are saved to your local Downloads folder, settings live in your Chrome profile, and there is no backend, tracking, or analytics. See [PRIVACY.md](PRIVACY.md). Chrome Web Store compliance notes live in [docs/STORE_LISTING.md](docs/STORE_LISTING.md).

## Tech stack

TypeScript · [WXT](https://wxt.dev) (Manifest V3) · Preact · Vitest. The annotation editor is a hand-rolled `<canvas>` object layer — no heavy canvas libraries.

## License & credits

Project & Development: Tomasz 'Amigo' Lewandowski · [dev@attv.uk](mailto:dev@attv.uk) · [www.attv.uk](https://www.attv.uk)
