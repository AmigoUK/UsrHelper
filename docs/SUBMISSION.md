# Chrome Web Store — submission pack (v0.9.1 update)

The extension is **already published**; this is an update to the existing item,
not a new submission. File to upload: `.output/usrhelper-0.9.1-chrome.zip`
(rebuild with `npm run zip` if needed).

**The single most important fact for this review: the permission set is
unchanged from the published version.** Verified against the published package:

| | Published | v0.9.1 |
|---|---|---|
| `permissions` | activeTab, tabs, downloads, storage, scripting | identical |
| `host_permissions` | `<all_urls>` | identical |
| `optional_permissions` | none | none |

No new permissions means no re-consent prompt for existing users, and no new
permission justifications to write. One content script was added
(`consolescope.js`, isolated world, `document_start`); it **narrows** behaviour
rather than extending it — see the reviewer note in section 5.

---

## 1. Account

Already done: developer account paid, 2-Step Verification on, **Non-Trader**
status set, contact email verified. Nothing to change.

## 2. Package tab

**Package → Upload new package** → `usrhelper-0.9.1-chrome.zip`.

The version in `manifest.json` (0.9.1) must be higher than the published one, or
the upload is rejected. It is.

## 3. Store listing tab

Title, summary, category and language are unchanged:

| Field | Value |
|---|---|
| Title | `UsrHelper` |
| Summary (≤132) | `Deployment feedback made easy: annotated screenshots and voice screencasts, saved locally or sent by email. No accounts, no cloud.` (130 chars — the previous wording in this file was 133 and would have been rejected) |
| Category | `Developer Tools` |
| Language | `English` |

**Detailed description — replace the published text with this. It opens with a
short lead (what it is for, why it exists, who it is for) before any feature
list, covers every shipped feature in plain English, and states advantages as
verifiable facts without naming or disparaging any other product. Length: 10543 of
the 16000 characters allowed.**

```
WHAT IT IS FOR

UsrHelper is for reporting problems in software you are testing. You take a screenshot or record your screen, mark what is wrong, and you get a finished report: the picture, your notes, and the technical details a developer needs to reproduce the problem.

WHY IT EXISTS

Most bug reports arrive as "it does not work". Then come the questions. Which page? Which browser? What did you click before it broke? Each round of questions costs a day, and the person who found the bug has usually forgotten the details by then.

UsrHelper collects those answers while the problem is still on screen — the page address, the exact browser and system, your last clicks, the errors the page printed — and puts them next to your screenshot. Nobody has to ask.

The second reason is where your screenshots go. Screens from software under test often show customer names, invoices, or health data. Tools that upload your captures to their own servers make that somebody else's problem to guard. UsrHelper never uploads anything: the files land in your Downloads folder and stay there.

WHO IT IS FOR

• Testers and end users who report problems during a deployment, and who should not have to learn a bug tracker to do it.
• Support staff who need to show a developer what a customer sees.
• Developers and teams who receive those reports and are tired of asking the same three questions every time.

You do not need an account, a team, or any technical knowledge to use it. If you can take a screenshot, you can file a complete report.

HOW IT WORKS IN PRACTICE

You press a button in the toolbar, choose what to capture, mark it up, and press Save. The files go to your Downloads folder. If you want, Save and Email opens a ready-made message to your developer with everything filled in except the attachment.

Everything happens on your own computer. There is no account to create, no server to upload to, and nothing is sent anywhere.


WHY PEOPLE CHOOSE IT

• No account, no sign-in, no team to join. You install it and use it.

• Nothing is uploaded. Your screenshots stay in your own Downloads folder. This matters when the software you test shows customer names, invoices, or health data on screen.

• It works offline. There is no service that can be slow, down, or shut down later.

• It is free. The full source code is public on GitHub, so anyone can check what it does.

• You hide sensitive data before the file exists. The mosaic brush is painted into the exported image itself. The hidden part is gone for good — it is not a layer that someone could switch off later.

• Recording keeps running when you switch to another tab. Browsers slow down background tabs, which can freeze a recording. UsrHelper does the recording work in a separate worker, so your video keeps its frames while you move around the app you are testing.

• The report describes your real computer. Browsers now hide the true system version, and every Mac with an Apple chip still reports itself as an Intel Mac. UsrHelper reads the accurate values instead, so your developer sees "macOS 15.3.0, arm64, Chrome 150.0.7827.55" and not a placeholder from 2020.

• Your written notes come back as text, not only as pixels. Sticky notes are numbered on the image, and the same numbers and text are saved in the report file. Your developer can copy a sentence instead of retyping it from a picture.

• One person can set it up for everybody. A developer prepares one profile and sends a small file. Testers import it in two clicks and are done — no explaining which address to type where.


TAKING A SCREENSHOT

Three ways to capture, all from the toolbar button:

• Visible area — what you see right now.
• Full page — the extension scrolls the page, takes several shots, and joins them into one tall image. A sticky header appears once at the top instead of repeating on every slice.
• Selected region — drag a rectangle over the part that matters.

The extension tells you when a page cannot be captured, such as browser settings pages, so you are never left guessing why nothing happened.


MARKING WHAT IS WRONG

The editor opens right after the capture. Tools:

• Marker — draw freehand.
• Rectangle and ellipse — frame the element.
• Arrow — point at the problem.
• Text — a short label. Type it and press Enter.
• Sticky note — a yellow note for a sentence or two. Press Enter for a new line and Ctrl+Enter to place it. Notes are numbered on the image. Their size adapts to the picture, so a note stays readable on a small cut-out and on a high-resolution screenshot alike.
• Step marker — each click drops a numbered circle. Good for "do this, then this, then this".
• Anonymize — paint a pixel mosaic over anything private.
• Crop — keep only the part that matters.

You also get eight colours, a thickness slider, and full undo and redo, with Ctrl+Z and Ctrl+Y. Click an annotation with the Select tool to move it, or press Delete to remove it.

One more button adds your click path: the last ten places you clicked before capturing appear on the image as numbered markers. It answers "what did you do before it broke" without you having to remember.

A timestamp can be stamped into the corner of the image, so the picture itself says when it was taken.


RECORDING YOUR SCREEN

• Choose what to record: one tab, a window, or the whole screen.
• Speak while you record. A level meter shows that your microphone is actually working before you start.
• A 3-2-1 countdown gives you a moment to get ready.
• Pause and resume as needed. A timer shows how long you have been recording.
• Optional camera bubble in the corner.
• Optional clock burned into the video.
• Your clicks show up as ripples, so viewers see where you pressed.
• Keyboard shortcuts appear as captions, for example "Ctrl + B". Ordinary typing is never shown — if you type a password during a recording, it does not appear on screen.
• Long recordings are split into separate clips automatically. The default is five minutes per clip and thirty minutes in total, and you can change both. Each clip is a complete file you can play on its own, so a long session never becomes one giant attachment.


WHAT A FINISHED REPORT CONTAINS

Files are saved to a folder of your choice inside Downloads, with the date and time in the file name:

• The image, as PNG, with everything you drew on it.
• Recording clips, as WEBM.
• A companion file with the details, as JSON.

The details file holds your description and who is reporting: name, company, customer number and AnyDesk number, as far as you filled them in. It also holds the exact time, the page address and title, your sticky notes with their numbers, your click path, and recent JavaScript errors from the page.

Last comes the environment: operating system and version, processor type, exact browser version, screen size and window size.

That gives the person fixing the bug the answers to "where", "when", "on what" and "what did you press" without a single follow-up question.

The timestamp appears in three places: the file name, visibly on the image or video, and inside the details file. That makes it easy to line the report up with server logs.


SENDING IT

Press Save and the files are written to your Downloads folder. Press Save and Email and your normal mail program opens with a new message: the recipients, the subject and the whole description are already filled in. You attach the files yourself — the extension shows you the exact path, and your file manager can be opened on them with one click. Email programs are not allowed to attach files on their own, so this last step is yours.

Recent reports stay in a list inside the extension, with small previews. From there you can open a file again or send the same report to somebody else later.


SETTINGS AND PROJECT PROFILES

A profile holds everything that changes between projects:

• Who receives the report, and who is copied in.
• A subject prefix, for example "[Project X]".
• The subfolder inside Downloads where files are saved.
• A description template, so testers are asked the right questions.
• The domains of the application you are testing.
• Clip length and maximum recording length.

Switch profiles from the extension popup. Everything you capture afterwards uses the profile you picked.

You can export a profile to a small file and send it to your testers. When they import it, they first see what the file would add — the recipient addresses above all, because that decides where their reports will go — and nothing is saved until they agree. The file carries project settings only: never someone's name, customer number or AnyDesk number, and never anyone's report history.

Your own details are entered once in the settings and are added to every report after that.

The interface is available in English and Polish.


PRIVACY

• The extension has no server of its own. There is no code in it that sends anything anywhere.
• There is no analytics, no tracking, and no advertising.
• Screenshots, recordings and report files are written to your Downloads folder and nowhere else.
• Your settings live in your own Chrome profile.
• Errors that a page prints to its console are collected only for the domains you list in your project profile. That list is empty until you fill it in, so on every other website the extension does not touch the page's console at all.
• Anonymized areas are destroyed in the saved file, not hidden behind something.

Privacy policy: https://amigouk.github.io/UsrHelper/privacy.html


WHY IT ASKS FOR PERMISSIONS

• Access to the page you are on — to take the picture.
• Tabs — to read the address and title of the page for the report, and to notice pages that cannot be captured.
• Downloads — to save the image, the clips and the details file.
• Storage — to keep your settings, your profiles and the recent-reports list.
• Access to all sites. Three things need it:
  – The click path and the error context are collected in the seconds before you decide to capture. They have to be there already, or there is nothing to save.
  – During a recording, the click ripples and key captions follow you into every tab you open.
  – Region selection and full-page capture must work on whatever site you are testing, and nobody can know that site in advance.

All of it is processed on your computer.


HELP AND FEEDBACK

Guide with pictures, in English and Polish: https://amigouk.github.io/UsrHelper/
Ideas and problem reports: https://attv.uk/projects/usrhelper.html
Source code: https://github.com/AmigoUK/UsrHelper
```

**Graphics — the owner supplies the screenshots for this update:**

| Asset | File |
|---|---|
| Store icon 128×128 | `public/icon/128.png` (unchanged) |
| Screenshots | Owner's own set: `annotations.jpg`, `click path.jpg`, `features.jpg`, `json.jpg` — these **replace** the generated set, decided 2026-07-22. Each file must be exactly 1280×800 or 640×400, PNG or JPEG, or the dashboard refuses it. |
| Small promo tile 440×280 | `docs/store-assets/promo-tile-440x280.png` (unchanged) |

The generated screenshots in `docs/manual/images/` stay in the repository for
the user guide; they are simply not used in the listing any more.

## 4. Privacy tab

Single purpose and permission justifications are **unchanged** — the permissions
themselves did not change, so leave the existing text in place:

```
Capturing deployment feedback: the extension's only purpose is letting users create annotated screenshots and narrated screen recordings of the software they are testing, saved locally and handed off by email.
```

**Data usage declarations** — keep **Website content** ticked, and update the
description to match the narrowed capture:

```
Screenshots and recordings the user explicitly starts, the page URL and title, and JavaScript errors. Messages logged through console.error are captured only on domains the user configured in their project profile; that list is empty by default. All processing is local, nothing is transmitted, sold, or shared.
```

Privacy policy URL is unchanged: `https://amigouk.github.io/UsrHelper/privacy.html`

## 5. Note for the reviewer (optional field, worth filling in)

```
This update adds annotation features and profile sharing. It requests no new permissions — the permission set is byte-identical to the published version.

One content script was added (consolescope.js, isolated world). It exists to REDUCE what the extension touches: previously the extension wrapped console.error on every page in order to include recent errors in a bug report. It now does so only on domains the user has explicitly listed in their project profile, which is empty by default. On every other site the extension no longer enters the page's console call path at all.

All processing remains local; the extension has no backend and transmits nothing.
```

## 6. Distribution tab

**Nothing to change.** The item is already **Public** (confirmed by the owner on
2026-07-22), which is the intended state. Leave visibility alone — changing it
triggers a re-review for no benefit.

## 7. Submit

- **Submit for review.** An update still goes through review; with no permission
  change it is usually faster than the first submission.
- The published version stays live for existing users until the update is
  approved, so a slow review costs nothing.
- If rejected, the email carries a colour+element code — fix and resubmit, or
  file one substantiated appeal.

## 8. What ships in this update (v0.4.4 → v0.9.1)

Six releases have accumulated since the published build:

- **v0.4.4** — a text annotation was added twice for one text box (user report);
  every text box after the first opened unfocused; Escape left a box behind that
  blocked every drawing tool.
- **v0.4.5** — all 16 Dependabot alerts closed; build toolchain upgraded.
- **v0.5.0** — `console.error` capture narrowed to project domains.
- **v0.5.1** — the "track click path" switch was doing nothing; duplicate labels
  in Settings.
- **v0.6.0** — reports named the wrong machine (`MacIntel` on Apple Silicon,
  macOS frozen at 10_15_7); now read from User-Agent Client Hints.
- **v0.7.0** — version shown next to the app name; feedback footer.
- **v0.8.0** — yellow sticky notes.
- **v0.9.0 / v0.9.1** — profile export/import; the text box no longer swallows
  the first characters typed into it.
