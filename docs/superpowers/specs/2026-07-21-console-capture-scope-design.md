# Scoping console-error capture to project domains

**Date:** 2026-07-21
**Status:** approved
**Supersedes:** nothing. Refines the error-capture section of
`2026-07-17-usrhelper-extension-design.md`.

## Problem

`entrypoints/errors.content.ts` runs in the page's MAIN world on `<all_urls>` at
`document_start` and replaces `console.error` with a wrapper. The wrapper is
therefore a frame in the call stack of every `console.error` on every site the
user visits.

Observed in the wild on facebook.com: Facebook's own error reporter walked the
stack of one of its Relay/Suspense errors, found
`chrome-extension://<id>/content-scripts/errors.js:1`, and shipped that frame to
Facebook's servers. The extension did not cause the error and transmitted
nothing itself — but its presence made the *page* report the extension's ID to a
third party. Two consequences:

1. Every site with client-side error telemetry learns that this user has
   UsrHelper installed — a fingerprinting bit about the user, which sits badly
   next to the product's "nothing leaves your machine" promise.
2. Site owners see an extension named in stack traces of their own errors.

This is not a Chrome Web Store compliance gap: `PRIVACY.md` and
`docs/STORE_LISTING.md` already declare console-error collection and justify
`<all_urls>`. It is a design decision that was never made deliberately.

The passive `error` and `unhandledrejection` listeners in the same file do **not**
appear in stack traces — only the `console.error` wrapper does.

## Goal

Install the `console.error` wrapper only on the domains the user is actually
testing. Everywhere else UsrHelper stays out of the call stack.

## Design

### Data

`ProjectProfile` gains `domains: string[]`, defaulting to `[]`.

No migration. A profile stored by an older version has no `domains` key, which
reads as an empty list, which disables the wrapper. Existing installs — including
those from the Chrome Web Store — are therefore safe by default from the first
minute after the update.

### Pure logic — `lib/domainScope.ts`

Covered by `tests/domainScope.test.ts`, per the project rule that pure logic in
`lib/` must have Vitest coverage.

- `parseDomainList(input: string): string[]` — splits on commas and newlines,
  trims, lowercases, drops empties and entries rejected by the guard below.
- `isDomainAllowed(hostname: string, patterns: string[]): boolean` — exact match,
  plus `*.example.com`, which matches `example.com` and any subdomain of it.
- Guard: patterns that would restore all-sites scope are rejected — `*`, `*.`,
  `*.com` and any entry without a dot. `localhost` is explicitly allowed; it has
  no dot but is a developer's everyday target.

### Flow

1. `entrypoints/consolescope.content.ts` — new, isolated world, `<all_urls>`,
   `document_start`. Its single job: read the active profile and, if
   `isDomainAllowed(location.hostname, profile.domains)`, dispatch
   `CustomEvent('usrhelper:enableconsolecapture')`.
2. `entrypoints/errors.content.ts` — MAIN world, unchanged registration. It
   registers the passive `error` / `unhandledrejection` listeners immediately and
   everywhere, and installs the `console.error` wrapper only on receiving that
   event, at most once.

The gate lives in its own entrypoint rather than in `content.ts` because
`content.ts` runs at `document_idle` — a gate there would arrive after page load
and miss most load-time errors. Storage reads are still asynchronous, so the
first few milliseconds of a page are covered by the passive listeners only. That
is an accepted, documented limitation: uncaught errors and rejections are never
lost, only errors an application logged itself through `console.error` in that
window.

### Settings UI

A "Project domains" field per profile, following the existing comma-separated
list pattern used by Email to / CC. Hint text states plainly: empty means
`console.error` is not captured anywhere, while uncaught errors are always
captured. Keys added to `lib/i18n/en.json` and `pl.json`.

### Compliance documents

`PRIVACY.md` and `docs/STORE_LISTING.md` are protected files and this changes a
data flow, so both must state that console errors are collected only on
user-configured domains. The `<all_urls>` justification itself is unchanged —
click path, recording overlays and region capture still need it.

### Testing

- Vitest: parsing, exact and wildcard matching, guard rejections, `localhost`,
  hostnames with ports.
- E2E: with no domains configured a `console.error` on the test page must **not**
  reach the companion JSON; with the test host configured it must. An uncaught
  error must reach the JSON in both cases, proving the passive path is untouched.

### Release

Minor bump to **v0.5.0**. The CHANGELOG entry goes under `### Changed` with a
**BREAKING** prefix: existing users stop collecting `console.error` until they
fill in a domain.
