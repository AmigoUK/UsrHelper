# Media

Screenshots and video for the store listing, the project page and social posts.

```
docs/media/
├── screenshots/   still images
└── video/         promo video — source and exported cuts
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
- Promo video: see below — the exported master does not belong in git.

If a large file has to live in the repository, set up Git LFS first and say so
here, so the next person knows why a plain `git clone` is not enough.

## The promo video

**The Chrome Web Store does not accept a video file.** Its "Promotional video"
field on the Store listing tab takes a **YouTube URL and nothing else**. So the
video has to be published on YouTube before it can appear on the listing, and
the file in this folder is never what the store shows.

Practical consequences:

- The YouTube video must be **Public or Unlisted**. A Private video fails
  validation, because the store cannot play it.
- Put the URL in `docs/SUBMISSION.md` once it exists, so the next update does
  not have to hunt for it.
- Keep the **exported master out of git** — a promo video is typically tens or
  hundreds of megabytes, and it would sit in every clone for ever. Upload it to
  YouTube, then either delete the local file or track it with Git LFS.
- What is worth committing here: a **short, web-sized cut** (a few seconds, MP4
  or WebM, under ~10 MB) if the project page or the README should show a
  silent loop. Anything longer belongs on YouTube.
- Project files from an editor (`.prproj`, `.kdenlive`, raw footage) do not
  belong in this repository at all.

Length guidance, from what the listing does with it: the video sits next to the
screenshots and most people give it a few seconds before deciding. Around 30–60
seconds is the usual working range — long enough to show a capture, an
annotation and the finished report, short enough that the point lands.

## Naming

Lowercase, hyphens, no spaces: `sticky-notes-editor.png`, not `Sticky Notes 2.PNG`.
Spaces break raw URLs and shell commands, and case matters on Linux servers even
though it does not on macOS.

## Not to be confused with

- `docs/manual/images/` — screenshots generated automatically from the real
  extension by `scripts/make-docs-shots.mjs`, used by the user guide. Those are
  regenerated on every UI change; do not hand-edit them.
- `docs/store-assets/` — the promo tile required by the store listing.
