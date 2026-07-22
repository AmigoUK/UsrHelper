# Backlog

Ideas accepted but not built yet. The public, votable roadmap lives on the
[project page](https://attv.uk/projects/usrhelper.html); this file is the
in-repo record of what was agreed and why, so the reasoning is not lost between
sessions.

_Nothing pending right now._

## Shipped

- **Project profiles — export / import as JSON** — shipped in v0.9.0. The import
  shows the recipients for confirmation before storing anything, because a file
  from an untrusted source could otherwise redirect finished reports; every
  field from the file is validated and clamped before it reaches storage.
