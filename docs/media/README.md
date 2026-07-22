# Media

Screenshots and video for the store listing, the project page and social posts.

```
docs/media/
├── screenshots/   still images
└── video/         screen recordings
```

## Two things to know before you add files here

**1. Everything in `docs/` is published.** GitHub Pages serves this repository's
`docs/` folder at <https://amigouk.github.io/UsrHelper/>. A file dropped into
`docs/media/screenshots/demo.png` is immediately readable by anyone at
<https://amigouk.github.io/UsrHelper/media/screenshots/demo.png>, with no link
needed from any page. Do not put anything here that shows real customer data,
real email addresses, or an internal system — use the demo page the screenshot
generator builds instead.

**2. Git never forgets a large file.** Committing a 60 MB video adds 60 MB to
every clone of this repository, for ever, even after you delete the file — the
blob stays in the history. GitHub refuses files above 100 MB outright and warns
above 50 MB.

So:

- Screenshots: PNG, keep them under ~2 MB each. The store needs exactly
  1280×800 or 640×400.
- Short clips (a few seconds, for a README or the project page): MP4 or WebM
  under ~10 MB is fine to commit.
- A full demo video: **do not commit it.** Upload it to YouTube and link it. The
  Chrome Web Store does not host video anyway — its promo video field takes a
  YouTube URL and nothing else.

If a large file has to live in the repository, set up Git LFS first and say so
here, so the next person knows why a plain `git clone` is not enough.

## Naming

Lowercase, hyphens, no spaces: `sticky-notes-editor.png`, not `Sticky Notes 2.PNG`.
Spaces break raw URLs and shell commands, and case matters on Linux servers even
though it does not on macOS.

## Not to be confused with

- `docs/manual/images/` — screenshots generated automatically from the real
  extension by `scripts/make-docs-shots.mjs`, used by the user guide. Those are
  regenerated on every UI change; do not hand-edit them.
- `docs/store-assets/` — the promo tile required by the store listing.
