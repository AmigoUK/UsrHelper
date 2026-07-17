# UsrHelper — Privacy Policy

_Last updated: 2026-07-17_

UsrHelper is designed to keep every byte of your data on your machine.

## What the extension processes

- **Screenshots and screen recordings** you explicitly start. They are processed in your browser and saved only to your local `Downloads/` folder.
- **Report context** (page URL, page title, recent clicks on the page, recent JavaScript console errors, browser/OS version, screen resolution) is gathered at capture time and written into a local companion `.json` file so developers can reproduce your report.
- **Settings and project profiles** (email recipients, folder names, templates) are stored in Chrome's extension storage, synced only through your own Chrome profile (`chrome.storage.sync`).
- **Report history** (file names, thumbnails, descriptions) is stored locally (`chrome.storage.local`).

## What the extension does NOT do

- It does **not** transmit any data to the developer or any third-party server. There is no backend.
- It does **not** track you, run analytics, or use cookies.
- It does **not** read pages in the background; content is captured only when you click a capture or record button.
- Email sending uses your own mail client via a `mailto:` link — the extension never sends email itself.

## Data removal

Uninstalling the extension removes all its stored settings and history. Files saved to your `Downloads/` folder remain yours to keep or delete.

## Chrome Web Store compliance

The use of information received from Google APIs adheres to the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), including the Limited Use requirements. UsrHelper collects website content (screenshots, page URL/title, recent console errors) solely to produce the report the user explicitly requests; this data is never sold, never transferred to third parties, and never used for any purpose unrelated to the extension's single purpose.

## Contact

Questions: [dev@attv.uk](mailto:dev@attv.uk)
