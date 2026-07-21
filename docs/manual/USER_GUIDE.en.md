# UsrHelper — User Guide

> Extension version: 0.4.1+ · [Wersja polska](USER_GUIDE.pl.md)

**UsrHelper** is a Chrome extension that makes reporting issues during software deployments effortless. Take an annotated screenshot or record a screencast with voice narration — the finished report is saved on your disk and handed to email in one click. Everything stays on your machine; the extension sends no data to any server.

---

## Table of contents

1. [Installation](#1-installation)
2. [First-time setup](#2-first-time-setup)
3. [Screenshots](#3-screenshots)
4. [Annotation editor](#4-annotation-editor)
5. [Recording screencasts](#5-recording-screencasts)
6. [History and project profiles](#6-history-and-project-profiles)
7. [What a report contains](#7-what-a-report-contains)
8. [Troubleshooting (FAQ)](#8-troubleshooting-faq)

---

## 1. Installation

**The easy way — [install from the Chrome Web Store](https://chromewebstore.google.com/detail/usrhelper/hmmlhdogplekofonkkmhacfolcfgejic).** One click, automatic updates, nothing else to do. Then skip to [First-time setup](#2-first-time-setup).

The rest of this section covers the manual install, which you only need if your organisation blocks the Web Store or you want to run a specific build.

1. Download the latest `usrhelper-X.Y.Z-chrome.zip` from [GitHub Releases](https://github.com/AmigoUK/UsrHelper/releases/latest).
2. Unpack the archive into a permanent folder (e.g. `C:\UsrHelper` or `~/UsrHelper`). **The folder must stay on disk** — Chrome loads the extension from there.
3. Open `chrome://extensions` and enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the unpacked folder (the one containing `manifest.json`).
5. Pin the **U** icon to the toolbar: puzzle-piece icon → pin next to "UsrHelper".

![chrome://extensions page with the extension loaded](images/install-extensions-page.png)

**Updating:** download the new zip, replace the folder contents, and click ⟳ (Reload) next to the extension on `chrome://extensions`.

## 2. First-time setup

Open the settings: click the **U** icon → **⚙ Settings** (or `chrome://extensions` → UsrHelper → Details → Extension options).

![Settings page](images/settings.png)

Configure top to bottom:

| Section | What to enter |
|---|---|
| **Language** | English (default) or Polski. |
| **Reporter details** | Customer no., company, first and last name, AnyDesk number — included in every report and email so the developer knows who is reporting and how to connect. |
| **Project profiles** | Recipient addresses (**Email to**) and carbon copy (**CC**), comma-separated; email subject prefix (e.g. `[Project X]`); the **subfolder in Downloads** where files land; an optional description template; and recording limits (clip length / maximum total). |
| **Toggles** | Click/keystroke visualization on recordings, timestamp overlay, camera bubble, click-path tracking, console error capture. |

Every change saves automatically (green "Settings saved" toast).

## 3. Screenshots

Click the **U** icon in the toolbar:

![Extension popup](images/popup.png)

Three capture modes are available:

- **📷 Capture visible area** — instant capture of what you see in the window.
- **📜 Capture full page** — the extension scrolls the page top to bottom and stitches one tall image (sticky headers appear only once).
- **✂ Capture selected region** — the cursor becomes a crosshair; drag a rectangle over the page. `Esc` cancels.

Each capture opens the **annotation editor** in a new tab.

> Note: browser-internal pages (`chrome://…`, Chrome Web Store) cannot be captured — the buttons will be greyed out there.

## 4. Annotation editor

![Annotation editor with sample markup](images/editor.png)

Tools (right-hand panel):

| Tool | What it does |
|---|---|
| **Select** | Click an annotation to select; drag to move; `Delete` removes it. |
| **Marker** | Freehand drawing. |
| **Rectangle / Ellipse** | Frame the relevant element. |
| **Arrow** | Point at the problem. |
| **Text** | Click on the image, type, confirm with `Enter` (`Esc` cancels). |
| **Step marker** | Each click drops a numbered circle (1, 2, 3…) — perfect for step-by-step instructions. |
| **Anonymize (mosaic)** | Paint over sensitive data (names, amounts, tokens) — the area is **irreversibly** turned into a pixel mosaic in the saved file. |
| **Crop** | Drag a rectangle and click "Apply crop". |

Plus: **color** and **size** pickers, full **Undo / Redo** (`Ctrl+Z` / `Ctrl+Y`), and the **"Add click path"** button — it stamps orange numbered markers where you clicked on the page before capturing.

Describe the issue in the **Description** field, then:

- **💾 Save** — a PNG plus a `.json` metadata file land in `Downloads/<subfolder>/` with a timestamp in the name (e.g. `UsrHelper_2026-07-17_14-32-05.png`);
- **✉ Save + Email** — additionally opens a new message in your mail client with recipients, subject, and description pre-filled. **You attach the file manually** — the extension shows the exact path of the saved file.

![Save confirmation with the attach reminder](images/editor-saved.png)

## 5. Recording screencasts

Click **🎥 Record screencast** in the popup. The recording panel opens:

![Panel before recording — mic level meter and camera bubble toggle](images/recorder-setup.png)

1. **Check the microphone** — the green bar moves when you speak. No movement = no audio on the recording.
2. Optionally enable the **camera bubble** (your face in a circle, Loom-style).
3. Click **Start recording** and pick what to share in Chrome's dialog: **tab / window / entire screen**.
4. After the **3-2-1** countdown the recording starts — switch freely between tabs and applications.

![Panel while recording — elapsed timer and clip number](images/recorder-recording.png)

While recording, pages show: **yellow ripples** on clicks (blue for right-click), **key captions** (e.g. `Ctrl + S` — plain typing is never shown, for privacy), and a **clock** in the corner:

![A page during recording — click ripple and key caption](images/recording-overlay.png)

**Pause / Resume** stops the clock and the recording. **⏹ Stop & save** ends the session. The recording splits automatically into **standalone clips** (default: 5 minutes each, 30-minute total cap — configurable per profile). Each clip is a separate `.webm` file (`…_part-01.webm`, `…_part-02.webm`).

![Panel after recording — clip list and description](images/recorder-done.png)

After stopping, add a description and click **💾 Save** (writes the `.json` metadata) or **✉ Save + Email**.

## 6. History and project profiles

The popup lists your **recent reports** with thumbnails:

- **Show file** — opens the file manager with the file selected;
- **Email again** — opens a new email message with the report details.

If you have several **project profiles** (different recipients, folders, limits), switch them in the popup with a single dropdown — all subsequent reports use the active profile.

## 7. What a report contains

Every report is a set of files in `Downloads/<subfolder>/`:

| File | Contents |
|---|---|
| `UsrHelper_<date>_<time>.png` | The annotated screenshot with a timestamp in the corner. |
| `UsrHelper_<date>_<time>_part-NN.webm` | Recording clips (with the burned-in clock and camera bubble). |
| `UsrHelper_<date>_<time>.json` | Description, reporter details, exact time, page URL and title, environment (browser, OS, resolution), recent JavaScript console errors, click path, file list. |

The timestamp lives in three places: the file name, visibly on the image/recording, and in the `.json` — easy to correlate with server logs.

## 8. Troubleshooting (FAQ)

**The capture buttons are greyed out.** You are on a browser-internal page (`chrome://…`) or the Chrome Web Store — these cannot be captured. Switch to a regular page.

**The recording has no audio.** Chrome blocked the microphone for the extension. Click the lock/permissions icon in the recorder tab's address bar and allow the microphone, or check your system microphone. The panel warns before starting when no mic is available.

**The recording stopped by itself.** You hit the maximum length (default 30 min). All clips up to that point are saved. Change the limit in the profile settings.

**Where are my files?** In `Downloads/<subfolder>/` (set the subfolder in the profile; default `UsrHelper`). Fastest route: popup → **Show file**.

**The email opens without the attachment.** That is a `mailto:` limitation — no mail client lets an extension attach files automatically. The extension shows the exact path; drag the file into the message.

**Is the mosaic really safe?** Yes. The mosaic is baked into the PNG's pixel data at save time — the original pixels cannot be recovered from the exported file.

---

*UsrHelper · [github.com/AmigoUK/UsrHelper](https://github.com/AmigoUK/UsrHelper) · Project & Development: Tomasz 'Amigo' Lewandowski · [dev@attv.uk](mailto:dev@attv.uk) · [www.attv.uk](https://www.attv.uk)*
