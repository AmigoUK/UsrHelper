# Sticky notes as an annotation tool

**Date:** 2026-07-22
**Status:** approved

## Problem

The Text tool draws bare text on the screenshot. It is right for a one-word
label next to an arrow, and wrong for a reviewer's comment: the text competes
with the page underneath, and its size hangs off the shared "Size" slider, so a
slider left thick for arrows turns a comment into a wall of letters.

Reports also lose the comment as *text*. Whatever the reporter wrote is burned
into the PNG, so the developer reading the companion `.json` cannot search,
quote or copy it.

## Goal

A yellow sticky note: a compact block of readable text that sits above the page
content, numbered, with its number and content repeated in the report.

## Design

### Sizing — proportion with a floor

A plain percentage of the image width breaks on region captures: 1.1% of a
240 px crop is 2.6 px. The rule is therefore proportional **with a floor**:

- `noteFontSize(width) = max(12, width * 0.011)`
- `noteBoxWidth(width) = clamp(width * 0.22, 150, width - 24)`

| Capture | Computed | Used |
|---|---|---|
| Region, 240 px | 2.6 px | **12 px** (floor) |
| Window, 1280 px | 14 px | 14 px |
| Retina, 2560 px | 28 px | 28 px — displayed at 50%, reads as 14 px |

No upper cap: above 2560 px the proportion is the correct answer, and a cap
would make notes shrink on 4K captures.

On a small crop the note takes a large share of the frame. That is intended —
on a 240 px crop a comment that does not dominate cannot be read at all.

The "Size" slider does not apply to notes.

### Typography

`500 <size>px system-ui, sans-serif`, near-black ink (`#1c1917`) on `#fde68a`.

A bundled pixel font was considered and rejected. Pixel fonts are sharp only
when rendered 1:1 at their native size, and report screenshots are viewed at
arbitrary zoom — a retina capture is displayed at 50%, which destroys exactly
what a pixel font is for. It would also add a font file to the store package and
a silent failure mode: canvas falls back to a default font if the `FontFace` is
not loaded before the first `fillText`, in both the preview and the export path.

### One layout function

`render.ts` currently measures text with `ctx.measureText` against a 40%-width
limit, while `annotationBounds` in `EditorApp` estimates `length * fontSize *
0.55` against a `fontSize * 20` limit. The two disagree, which is why the
selection box around a text annotation does not always match what is drawn.

Notes will not repeat that. `layoutNote(text, imageWidth, measure)` in
`lib/annotations/note.ts` returns the lines, box size, padding and line height,
and is the only place that decides them. The renderer calls it with the canvas
`measureText`; the hit test calls it with a cheap estimator. Same rules, two
measures.

### Model

```ts
export interface NoteAnnotation extends AnnotationBase {
  kind: 'note';
  x: number;
  y: number;
  text: string;
}
```

`color` holds the paper colour (always `#fde68a`; the colour palette does not
apply to notes). `size` is unused — the size comes from the image width.

### Numbering — derived, never stored

A note's index is its position among the notes in the annotation list, which is
creation order. Deleting the middle note renumbers the rest, on the image and in
the report alike, because both read the same list. The image and the JSON
therefore cannot disagree; it is not a rule to be maintained but an impossible
state.

Step markers keep their own separate sequence. Mixing "step 2" and "note 2" into
one counter would turn the report into a puzzle.

### Report

`ReportMetadata` gains `notes`:

```json
"notes": [
  { "index": 1, "text": "This button does nothing when clicked." },
  { "index": 2, "text": "Amount is missing its thousands separator." }
]
```

The email body lists them in their own section, next to the existing console
errors section — otherwise the recipient sees numbered notes in the image and
has to open the JSON to read them.

`PRIVACY.md` lists what the companion `.json` contains, so it gains sticky-note
text. It is a protected file and this adds a field to the report.

### Editing

A new `note` tool sits next to Text in the toolbar. Clicking opens the same
textarea, in note mode:

- **Enter** inserts a newline — notes are two or three sentences, not labels.
- **Ctrl/Cmd+Enter**, or clicking outside, commits.
- **Escape** discards.

A hint under the field states how to commit, so nobody has to guess. The commit
runs through the synchronous `textAnchor` gate added in v0.4.4, so notes cannot
inherit the double-commit bug that gate exists to prevent.

Selecting, moving and deleting reuse `annotationBounds` and `moveAnnotation`.
`annotationBounds` gains an image-width parameter, which notes need and the
other kinds ignore.

### Testing

Vitest, in `tests/note.test.ts`:
- floor applied on a 240 px crop; proportion on 1280 px and 2560 px
- box width clamped by the floor and by a narrow image
- `layoutNote` line count, height, and hard-breaking of an over-long word
- `collectNotes` renumbers after a middle note is removed, and ignores steps

E2E: place a note, commit with Ctrl+Enter, and assert that yellow pixels appear
in that part of the canvas, that the companion JSON carries
`notes[0].index === 1` with the typed text, and that a **single** Undo removes
the note — the same regression class caught in v0.4.4.

### Release

Minor bump to **v0.8.0**: a new tool and a new annotation kind in the report
schema.
