# Backlog

Ideas accepted but not built yet. The public, votable roadmap lives on the
[project page](https://attv.uk/projects/usrhelper.html); this file is the
in-repo record of what was agreed and why, so the reasoning is not lost between
sessions.

_Nothing pending right now._

## Shipped

- **Copy the report to the clipboard as Markdown** — shipped in v0.10.0. For
  teams who take bug reports in a tracker rather than by email, where the tester
  otherwise retypes what the extension already collected — and drops the browser
  version and CPU architecture first, the very fields `lib/environment.ts` exists
  to get right. One format (GitHub-flavoured Markdown), no per-profile switch,
  and no clipboard permission: `navigator.clipboard.writeText()` needs none from
  an extension page that holds focus.
- **Project profiles — export / import as JSON** — shipped in v0.9.0. The import
  shows the recipients for confirmation before storing anything, because a file
  from an untrusted source could otherwise redirect finished reports; every
  field from the file is validated and clamped before it reaches storage.
