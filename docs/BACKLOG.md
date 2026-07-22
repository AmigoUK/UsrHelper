# Backlog

Ideas accepted but not built yet. The public, votable roadmap lives on the
[project page](https://attv.uk/projects/usrhelper.html); this file is the
in-repo record of what was agreed and why, so the reasoning is not lost between
sessions.

## Project profiles — export / import as JSON

**Why.** A developer running a deployment prepares one profile — recipients, CC,
subject prefix, Downloads subfolder, description template, project domains, clip
limits — and sends a single file to every tester. The tester imports it instead
of typing five fields correctly by hand. Today each tester configures Settings
themselves, which is the most likely source of a misfiled report: right bug,
wrong recipient or wrong folder.

**Shape.** Settings gains **Export profile**, which saves the active profile as
`usrhelper-profile.json` through the existing `chrome.downloads` path, and
**Import profile**, which reads a file and adds it as a *new* profile rather
than overwriting the current one.

**Scope.** Profiles only. Reporter details (name, customer number, AnyDesk) are
per-person and must never travel in a shared file, and report history never
leaves the machine.

**Design note, to settle before building.** An imported profile sets the email
recipients, so a file from an untrusted source could quietly redirect finished
reports to a stranger. Import must therefore show what it is about to add —
recipients above all — and require an explicit confirmation, rather than
applying the file silently. The file is also user-supplied input: every field
needs validating and clamping (unknown keys dropped, clip limits bounded,
subfolder sanitised through the existing `buildDownloadPath` rules) before it
reaches storage.

**Open questions.** Whether one file may carry several profiles, and whether an
imported profile should become the active one immediately or wait to be picked.
