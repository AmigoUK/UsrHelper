# Copy the report to the clipboard as Markdown

**Date:** 2026-07-24
**Status:** approved

## Problem

UsrHelper hands a finished report over one way: `mailto:`. That fits a report
mailed to a developer, and misses the way most teams actually take bug reports —
Jira, GitHub or GitLab issues, a Teams channel. A tester filing there has to
retype by hand what the extension already collected: the description, the page
address, the environment, the console errors, the text of the sticky notes.

Retyping loses the least memorable fields first, and those are the ones
`lib/environment.ts` exists to get right: the true OS version, the CPU
architecture, the full browser version. A report that says "Chrome, Mac" is the
report the extension was built to stop producing.

## Goal

A third hand-off next to Save and Save + Email: one click writes the same report
as Markdown into the clipboard, ready to paste into an issue tracker.

## Constraints

- **No new permission.** `navigator.clipboard.writeText()` works in an extension
  page that holds focus — the editor and the recorder are ordinary focused
  documents. The `clipboardWrite` permission covers `document.execCommand` in
  contexts without a document, which is not this case. The permission set stays
  byte-identical to the published version, so the store update carries no new
  consent screen and no new justifications.
- **Nothing leaves the machine.** The clipboard is local and the write happens
  only on an explicit click. The privacy model is unchanged.
- **One format.** GitHub-flavoured Markdown, no per-profile switch. Jira Cloud's
  editor converts pasted Markdown, GitLab and Teams accept it directly. A format
  selector would mean a renderer, a test file, a profile field and a validation
  branch in `lib/profileFile.ts` for each flavour — bought before anyone asked.

## Design

### Placement

Editor and recorder only. The popup history keeps its existing "Email again"
button: `HistoryEntry` stores the description, URL and file paths, but not the
environment, the console errors or the notes, so Markdown built from it would be
visibly poorer than Markdown built from the same click that produced the files.

### The renderer — `lib/markdownReport.ts`

```ts
export function buildMarkdownReport(meta: ReportMetadata, t: Translate): string
```

The same input as `buildReportBody()` in `lib/mailto.ts`, the same `Translate`
type, a different output format. A separate module rather than a format flag on
`buildReportBody()`: each function keeps one job and gets its own test file, and
`lib/mailto.ts` does not become responsible for two syntaxes.

Output:

````markdown
## Screenshot report — Cart totals

Button does nothing after the second click.

| Field | Value |
|---|---|
| Reporter | Jan Kowalski · ACME · #1234 |
| Page URL | <https://shop.example/cart> |
| Captured at | 2026-07-24T10:12:33.000Z |
| Environment | macOS 15.3.0 · arm64 · Chrome 150.0.7827.55 · screen 3456x2234 · viewport 1512x857 |
| User agent | `Mozilla/5.0 …` |
| UsrHelper | 0.10.0 |

### Sticky notes
1. Total goes negative here

### Recent console errors

```text
[2026-07-24T10:12:30.000Z] TypeError: x is not a function
```

### Files
- `UsrHelper/usrhelper-2026-07-24_10-12-33.png`
- `UsrHelper/usrhelper-2026-07-24_10-12-33.json`

Remember to attach: UsrHelper/usrhelper-2026-07-24_10-12-33.png, …
````

Rules:

- Row labels reuse the existing i18n keys `meta.reporter`, `meta.pageUrl`,
  `meta.capturedAt`, `meta.environment`, `meta.userAgent`, `meta.notes`,
  `meta.consoleErrors`. All of them are already present in both `en.json` and
  `pl.json`, so the Markdown follows the UI language like the email body does.
- The heading reuses `mailto.subject.screenshot` / `mailto.subject.screencast`.
- `|` and backticks in user-supplied text (description, notes, page title,
  console messages) are escaped. An unescaped `|` in a description would split
  the table row and the reader would see a broken grid instead of the report.
- Newlines survive in the description, which sits above the table; inside a table
  cell a newline becomes a space, because a Markdown cell cannot hold one.
- Empty sections are dropped — no description, no notes, no console errors means
  no heading, matching `buildReportBody`.
- Console errors are capped at the last 10, the same cap the email body uses.
- The click path is left out, as it is in the email: it is already burned onto
  the image and recorded in the companion `.json`.
- The extension version gets a row of its own. The email body omits it; in a
  tracker it matters, because the tester and the developer may be on different
  builds of the extension.

### The clipboard write — `lib/clipboard.ts`

```ts
export async function copyText(text: string): Promise<boolean>
```

A `try/catch` around `navigator.clipboard.writeText()` returning success. Two
entrypoints call it, so the failure handling is written once.

### The flow

`save(withEmail: boolean)` in the editor and `saveReport(withEmail)` in the
recorder become `save(handoff: 'none' | 'email' | 'clipboard')`. Everything
before the hand-off — exporting the image, `saveBlob`, `saveJson`,
`addHistoryEntry`, `deleteCapture` — is untouched; only the final branch changes.
Copying saves first, so the file names printed in the Markdown name files that
exist, and so a copied report always leaves a trace on disk and in the history.

### When the clipboard refuses

If `copyText()` returns `false` — a document that lost focus, a policy that
blocks the write — the editor shows an error card holding a read-only
`<textarea>` with the finished Markdown, its content selected, so the reporter
copies it by hand. The files are already saved at that point, so nothing is lost
either way. Silently swallowing the failure would leave the user pasting whatever
was in the clipboard before.

## Testing

`tests/markdownReport.test.ts`, Vitest, no browser — matching the rule that pure
logic in `lib/` carries unit coverage:

- a `|` in the description and in the page title does not break the table
- missing description / notes / console errors drop their headings
- 15 console errors in, 10 out
- recorder metadata (empty `pageUrl`, `pageTitle`, `notes`) renders without empty
  table rows
- the file names appear both in the Files section and in the attach reminder

One added E2E check in `scripts/e2e.mjs`: grant `clipboard-read` and
`clipboard-write` to the context, click the new button in the existing editor
scenario, read the clipboard back and assert the text starts with `## ` and names
the saved file.

## Out of scope

- Copying the image itself to the clipboard. One clipboard cannot carry text and
  an image such that the recipient gets both, and the file name in the text
  matches how `mailto:` already works.
- A Jira wiki-markup or plain-text variant.
- A Markdown button in the popup history.
