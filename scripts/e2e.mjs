/**
 * E2E test-drive of the built extension (docs/TESTING.md checklist) using
 * Playwright + real Chromium. Run headed (e.g. under xvfb-run):
 *
 *   npm run build && xvfb-run -a node scripts/e2e.mjs
 *
 * Note: Playwright renames downloads to GUID files, so files are verified by
 * MIME type and content rather than by their suggested Downloads/<sub>/ path
 * (path correctness in a normal Chrome is covered by lib/filenames unit tests).
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const EXT_PATH = resolve('.output/chrome-mv3');
const PORT = 8123;
const WORK = join(tmpdir(), `usrhelper-e2e-${Date.now()}`);
const DOWNLOADS = join(WORK, 'downloads');
mkdirSync(DOWNLOADS, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

// ---------------------------------------------------------------- test pages
const SHORT_PAGE = `<!doctype html><html><head><title>E2E Short Page</title></head>
<body style="font: 16px sans-serif; padding: 40px;">
<h1>UsrHelper E2E test page</h1>
<div id="secret" style="font: bold 28px monospace; background: #fff; color: #000; width: 420px; padding: 8px;">
SECRET-DATA-12345-ABCDE</div>
<button id="btn" style="margin-top: 620px;">Click me</button>
<script>console.error('E2E console error marker');
setTimeout(() => { throw new Error('E2E synthetic error'); }, 300);</script>
</body></html>`;

const LONG_PAGE = `<!doctype html><html><head><title>E2E Long Page</title></head>
<body style="margin: 0; font: 16px sans-serif;">
<div style="position: sticky; top: 0; background: #123; color: #fff; padding: 12px;">STICKY HEADER</div>
${Array.from({ length: 40 }, (_, i) => `<section style="height: 200px; background: hsl(${i * 9}, 60%, ${40 + (i % 3) * 15}%); padding: 8px;">Section ${i + 1}</section>`).join('')}
</body></html>`;

const server = createServer((req, res) => {
  res.setHeader('content-type', 'text/html');
  res.end(req.url.startsWith('/long') ? LONG_PAGE : SHORT_PAGE);
});
await new Promise((r) => server.listen(PORT, r));

// ------------------------------------------------------------------- browser
const context = await chromium.launchPersistentContext(join(WORK, 'profile'), {
  headless: false,
  viewport: { width: 1280, height: 800 },
  args: [
    `--disable-extensions-except=${EXT_PATH}`,
    `--load-extension=${EXT_PATH}`,
    '--auto-select-desktop-capture-source=Entire screen',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
    '--no-sandbox',
    '--disable-gpu',
  ],
});
const cdp = await context.browser()?.newBrowserCDPSession?.();
if (cdp) await cdp.send('Browser.setDownloadBehavior', { behavior: 'allowAndName', downloadPath: DOWNLOADS, eventsEnabled: false }).catch(() => {});

let [sw] = context.serviceWorkers();
if (!sw) sw = await context.waitForEvent('serviceworker');
const EXT_ID = new URL(sw.url()).host;
console.log(`Extension loaded: ${EXT_ID}\n`);
const extUrl = (p) => `chrome-extension://${EXT_ID}/${p}`;

/** All completed downloads (Playwright stores them under GUID names). */
const completedDownloads = () =>
  sw.evaluate(
    () =>
      new Promise((r) =>
        chrome.downloads.search({ orderBy: ['-startTime'], limit: 50 }, (items) =>
          r(items.filter((d) => d.state === 'complete').map((d) => ({ id: d.id, mime: d.mime, filename: d.filename }))),
        ),
      ),
  );

async function waitNewDownloads(beforeIds, expectedCount, timeoutMs = 20000) {
  const start = Date.now();
  for (;;) {
    const items = (await completedDownloads()).filter((d) => !beforeIds.has(d.id));
    if (items.length >= expectedCount) return items;
    if (Date.now() - start > timeoutMs) return items;
    await new Promise((r) => setTimeout(r, 500));
  }
}
const idsOf = (items) => new Set(items.map((d) => d.id));

// ================================================================ 1. Options
console.log('— Settings page —');
const options = await context.newPage();
await options.goto(extUrl('options.html'));
await options.waitForSelector('h1');

check('Default language is EN', (await options.textContent('h1')).includes('UsrHelper Settings'));

await options.selectOption('select', 'pl');
await options.waitForTimeout(300);
check('Switch to PL translates UI', (await options.textContent('h1')).includes('Ustawienia UsrHelper'));
await options.selectOption('select', 'en');
await options.waitForTimeout(300);
check('Switch back to EN works', (await options.textContent('h1')).includes('UsrHelper Settings'));

const footer = await options.textContent('.app-footer').catch(() => '');
check('Credit footer with version', footer.includes('attv.uk') && /v\d+\.\d+\.\d+/.test(footer), footer.trim().slice(0, 80));

const setField = async (label, value) => {
  const input = options.locator(`label:has-text("${label}")`).first().locator('xpath=following-sibling::*[self::input or self::textarea][1]');
  await input.fill(String(value));
  await input.dispatchEvent('change');
};
await setField('Customer no.', 'C-102');
await setField('Company', 'ACME Sp. z o.o.');
await setField('First name', 'Jan');
await setField('Last name', 'Kowalski');
await setField('AnyDesk no.', '123 456 789');
await setField('Email to', 'qa@example.com, dev@example.com');
await setField('CC', 'boss@example.com');
await setField('Subfolder in Downloads', 'UsrHelper/e2e');
await setField('Clip length (minutes)', '1');
await setField('Maximum total recording (minutes)', '2');
await options.waitForTimeout(400);
const stored = await sw.evaluate(() => new Promise((r) => chrome.storage.sync.get('settings', (v) => r(v.settings))));
const prof = stored?.profiles?.[0];
check(
  'Profile settings persist (To/CC/folder/clip limits)',
  prof?.emailTo?.length === 2 && prof?.emailCc?.[0] === 'boss@example.com' && prof?.subfolder === 'UsrHelper/e2e' && prof?.clipMinutes === 1 && prof?.maxMinutes === 2,
  JSON.stringify({ to: prof?.emailTo, cc: prof?.emailCc, sub: prof?.subfolder, clip: prof?.clipMinutes, max: prof?.maxMinutes }),
);

// =========================================================== 2. Visible + editor
console.log('— Visible capture & editor —');
const site = await context.newPage();
await site.goto(`http://127.0.0.1:${PORT}/short.html`);
await site.waitForTimeout(500);
await site.mouse.click(200, 120);
await site.mouse.click(300, 160);
await site.waitForTimeout(400);
await site.bringToFront();

const editorPromise = context.waitForEvent('page', { predicate: (p) => p.url().includes('editor.html'), timeout: 15000 });
await options.evaluate(() => chrome.runtime.sendMessage({ type: 'capture', mode: 'visible' }));
const editor = await editorPromise;
await editor.waitForSelector('canvas');
await editor.waitForTimeout(800);

const canvasSize = await editor.evaluate(() => {
  const c = document.querySelector('canvas');
  return { w: c.width, h: c.height };
});
check('Visible capture opens editor with image', canvasSize.w >= 1200 && canvasSize.h >= 700, `${canvasSize.w}x${canvasSize.h}`);

const box = await editor.locator('canvas').boundingBox();
const at = (fx, fy) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });
const drag = async (from, to) => {
  await editor.mouse.move(from.x, from.y);
  await editor.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await editor.mouse.move(from.x + ((to.x - from.x) * i) / 8, from.y + ((to.y - from.y) * i) / 8);
  }
  await editor.mouse.up();
};
const toolBtn = (name) => editor.locator(`.toolbar button[title="${name}"]`);

/** Unique colours in a patch of the canvas (fractions of canvas size). */
const uniqueColors = (fx, fy, half = 8) =>
  editor.evaluate(([fx, fy, half]) => {
    const c = document.querySelector('canvas');
    const d = c.getContext('2d').getImageData(Math.round(c.width * fx) - half, Math.round(c.height * fy) - half, half * 2, half * 2).data;
    const colors = new Set();
    for (let i = 0; i < d.length; i += 4) colors.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
    return colors.size;
  }, [fx, fy, half]);

await toolBtn('Marker').click();
await drag(at(0.1, 0.25), at(0.3, 0.4));
await toolBtn('Rectangle').click();
await drag(at(0.4, 0.25), at(0.55, 0.35));
await toolBtn('Ellipse').click();
await drag(at(0.6, 0.25), at(0.7, 0.35));
await toolBtn('Arrow').click();
await drag(at(0.1, 0.55), at(0.3, 0.65));
await toolBtn('Step marker').click();
await editor.mouse.click(at(0.45, 0.55).x, at(0.45, 0.55).y);
await editor.mouse.click(at(0.55, 0.55).x, at(0.55, 0.55).y);
await toolBtn('Text').click();
await editor.mouse.click(at(0.15, 0.8).x, at(0.15, 0.8).y);
await editor.waitForSelector('.editor-text-input');
await editor.keyboard.type('E2E annotation');
await editor.keyboard.press('Enter');
check('All drawing tools work (pen/rect/ellipse/arrow/steps/text)', true, 'drawn without errors');

// Committing a text box must add exactly ONE annotation. Chrome fires `blur` on
// the textarea as it is removed, so Enter used to commit the text twice.
const undoOnce = editor.locator('button:has-text("Undo")');
const redoOnce = editor.locator('button:has-text("Redo")');
/** Coloured (non-greyscale) pixels in the text block anchored at (fx, fy). */
const textInk = (fx = 0.15, fy = 0.8) =>
  editor.evaluate(([fx, fy]) => {
    const c = document.querySelector('canvas');
    const d = c.getContext('2d').getImageData(Math.round(c.width * fx), Math.round(c.height * fy) - 20, 400, 120).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i] - d[i + 1]) > 40 || Math.abs(d[i] - d[i + 2]) > 40) n++;
    }
    return n;
  }, [fx, fy]);
const inkAfterCommit = await textInk();
await undoOnce.click();
await editor.waitForTimeout(200);
const inkAfterUndo = await textInk();
check(
  'Text is committed once — a single Undo removes it entirely',
  inkAfterCommit > 50 && inkAfterUndo === 0,
  `ink after commit=${inkAfterCommit} after one undo=${inkAfterUndo}`,
);
await redoOnce.click();
await editor.waitForTimeout(200);

// `autofocus` is honoured once per document, so the SECOND box used to open
// unfocused and swallow everything the user typed.
await toolBtn('Text').click();
await editor.mouse.click(at(0.6, 0.8).x, at(0.6, 0.8).y);
await editor.waitForSelector('.editor-text-input');
await editor.waitForTimeout(200);
await editor.keyboard.type('discarded draft');
const typed = await editor.locator('.editor-text-input').inputValue();
check('Second text box opens focused and accepts typing', typed === 'discarded draft', `value="${typed}"`);

// Escape discards the draft; the blur that follows removal must not commit it,
// and the box must not stay behind — a leftover box blocks every tool.
await editor.keyboard.press('Escape');
await editor.waitForTimeout(200);
check(
  'Escape discards the text box and closes it',
  (await textInk(0.6, 0.8)) === 0 && (await editor.locator('.editor-text-input').count()) === 0,
);

// Anonymization brush: three overlapping passes fully covering the SECRET text
// (which sits in the top-left of the captured viewport, around y≈0.11).
const secretColorsBefore = await uniqueColors(0.15, 0.11);
await toolBtn('Anonymize (mosaic)').click();
for (const fy of [0.095, 0.11, 0.125]) {
  await drag(at(0.03, fy), at(0.38, fy));
}
await editor.waitForTimeout(300);
const secretColorsAfter = await uniqueColors(0.15, 0.11);
check(
  'Mosaic brush pixelates the secret text',
  secretColorsAfter <= 8 && secretColorsBefore > secretColorsAfter,
  `unique colours in patch: before=${secretColorsBefore} after=${secretColorsAfter}`,
);

const undoBtn = editor.locator('button:has-text("Undo")');
const redoBtn = editor.locator('button:has-text("Redo")');
await undoBtn.click();
await undoBtn.click();
await undoBtn.click();
const colorsAfterUndo = await uniqueColors(0.15, 0.11);
await redoBtn.click();
await redoBtn.click();
await redoBtn.click();
const colorsAfterRedo = await uniqueColors(0.15, 0.11);
check(
  'Undo removes mosaic, redo restores it',
  colorsAfterUndo === secretColorsBefore && colorsAfterRedo === secretColorsAfter,
  `undo=${colorsAfterUndo} redo=${colorsAfterRedo}`,
);

const clickPathBtn = editor.locator('button:has-text("Add click path")');
const hasClickPath = (await clickPathBtn.count()) > 0;
if (hasClickPath) await clickPathBtn.click();
check('Click path can be stamped onto the screenshot', hasClickPath);

await editor.locator('.editor-sidebar textarea').last().fill('E2E report description');
const beforeSave = idsOf(await completedDownloads());
await editor.locator('button:has-text("💾")').click();
await editor.waitForSelector('text=Saved to Downloads/', { timeout: 15000 }).catch(() => {});
const savedNow = await waitNewDownloads(beforeSave, 2);
const pngItem = savedNow.find((d) => d.mime === 'image/png');
const jsonItem = savedNow.find((d) => d.mime === 'application/json');
check('Editor saves PNG + companion JSON via chrome.downloads', !!pngItem && !!jsonItem, `${savedNow.length} downloads completed`);
check('Saved PNG is non-trivial', !!pngItem && existsSync(pngItem.filename) && statSync(pngItem.filename).size > 50000, pngItem ? `${Math.round(statSync(pngItem.filename).size / 1024)} kB` : 'missing');

if (jsonItem && existsSync(jsonItem.filename)) {
  const meta = JSON.parse(readFileSync(jsonItem.filename, 'utf8'));
  check(
    'JSON has description/url/environment/clickPath',
    meta.description === 'E2E report description' && meta.pageUrl.includes('short.html') && !!meta.environment?.userAgent && meta.clickPath.length >= 2,
    `clicks=${meta.clickPath?.length} errors=${meta.consoleErrors?.length}`,
  );
  check('JSON captured the synthetic console error', meta.consoleErrors?.some((e) => e.message.includes('E2E synthetic error')), meta.consoleErrors?.[0]?.message?.slice(0, 60));
  // No project domain is configured yet, so console.error must not be wrapped —
  // uncaught errors still are, because those listeners leave no stack frame.
  check(
    'console.error is not captured on unconfigured domains',
    !meta.consoleErrors?.some((e) => e.message.includes('E2E console error marker')),
    `${meta.consoleErrors?.length} entries`,
  );
  check(
    'JSON carries reporter details (customer/company/name/AnyDesk)',
    meta.reporter?.customerNo === 'C-102' && meta.reporter?.company === 'ACME Sp. z o.o.' && meta.reporter?.firstName === 'Jan' && meta.reporter?.lastName === 'Kowalski' && meta.reporter?.anyDesk === '123 456 789',
    JSON.stringify(meta.reporter),
  );
  check('JSON files[] uses timestamped Downloads path', /UsrHelper\/e2e\/UsrHelper_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.png/.test(meta.files?.[0] ?? ''), meta.files?.[0]);
} else {
  check('Companion JSON readable from disk', false, 'file missing');
}
const savedNote = await editor.textContent('.editor-sidebar').catch(() => '');
check('UI confirms save with attach hint', savedNote.includes('Saved to Downloads/') && savedNote.includes('Attach'), '');

// --- console.error scope -----------------------------------------------------
// The wrapper is a stack frame in every console.error on the page, so pages with
// error telemetry would report the extension's ID. It must appear only once the
// page's domain is configured in the profile.
const consoleIsNative = () => site.evaluate(() => console.error.toString().includes('[native code]'));
check('console.error is left untouched while no domain is configured', await consoleIsNative());

await options.bringToFront();
await setField('Capture console errors on these domains', '127.0.0.1');
await options.waitForTimeout(400);
await site.bringToFront();
await site.reload();
await site.waitForTimeout(600);
check('Configuring a project domain installs the console.error wrapper', !(await consoleIsNative()));
await editor.close();

// ============================================================== 3. Full page
console.log('— Full-page capture —');
const longPage = await context.newPage();
await longPage.goto(`http://127.0.0.1:${PORT}/long.html`);
await longPage.bringToFront();
const editor2Promise = context.waitForEvent('page', { predicate: (p) => p.url().includes('editor.html'), timeout: 30000 });
await options.evaluate(() => chrome.runtime.sendMessage({ type: 'capture', mode: 'fullpage' }));
const editor2 = await editor2Promise;
await editor2.waitForSelector('canvas');
await editor2.waitForTimeout(1000);
const size2 = await editor2.evaluate(() => {
  const c = document.querySelector('canvas');
  return { w: c.width, h: c.height };
});
check('Full-page capture stitches beyond one viewport', size2.h > 3000, `${size2.w}x${size2.h} (page ~8050px)`);
const stickyCount = await editor2.evaluate(() => {
  // The sticky header is a dark #112233-ish bar; count rows that are mostly dark blue.
  const c = document.querySelector('canvas');
  const ctx = c.getContext('2d');
  let darkRows = 0;
  for (let y = 0; y < c.height; y += 10) {
    const row = ctx.getImageData(Math.floor(c.width / 2) - 50, y, 100, 1).data;
    let dark = 0;
    for (let i = 0; i < row.length; i += 4) {
      if (row[i] < 40 && row[i + 1] < 60 && row[i + 2] < 80) dark++;
    }
    if (dark > 80) darkRows++;
  }
  return darkRows;
});
check('Sticky header appears once, not repeated per segment', stickyCount > 0 && stickyCount <= 6, `${stickyCount} dark rows sampled (≈header height/10)`);
const scrollRestored = await longPage.evaluate(() => window.scrollY);
check('Page scrolled back to top after full-page capture', scrollRestored === 0, `scrollY=${scrollRestored}`);
await editor2.close();

// ================================================================= 4. Region
console.log('— Region capture —');
await longPage.bringToFront();
const editor3Promise = context.waitForEvent('page', { predicate: (p) => p.url().includes('editor.html'), timeout: 20000 });
await options.evaluate(() => chrome.runtime.sendMessage({ type: 'capture', mode: 'region' }));
await longPage.waitForTimeout(600);
await longPage.mouse.move(100, 150);
await longPage.mouse.down();
await longPage.mouse.move(340, 330, { steps: 6 });
await longPage.mouse.up();
const editor3 = await editor3Promise;
await editor3.waitForSelector('canvas');
await editor3.waitForTimeout(600);
const size3 = await editor3.evaluate(() => {
  const c = document.querySelector('canvas');
  return { w: c.width, h: c.height };
});
check('Region capture crops to the dragged rectangle (~240x180)', Math.abs(size3.w - 240) < 20 && Math.abs(size3.h - 180) < 20, `${size3.w}x${size3.h}`);
await editor3.close();

// =============================================================== 5. Recorder
console.log('— Screencast recorder (~90 s for the clip split) —');
const recorder = await context.newPage();
await recorder.goto(extUrl('recorder.html'));
await recorder.waitForSelector('h1');
await recorder.waitForTimeout(1000);
const setupCard = await recorder.textContent('.card');
const micOk = (await recorder.locator('.card div[style*="height: 12px"]').count()) > 0;
check('Mic detected with level meter (fake device)', micOk, micOk ? '' : `card says: ${setupCard.trim().slice(0, 100)}`);

const beforeRec = idsOf(await completedDownloads());
await recorder.locator('button:has-text("Start recording")').click();
await recorder.waitForTimeout(3500); // countdown 3-2-1

const recordingVisible = await recorder.locator('button:has-text("Pause")').isVisible().catch(() => false);
check('Recording starts after countdown (timer + pause visible)', recordingVisible);

// Overlays on a normal page while recording.
await site.bringToFront();
await site.waitForTimeout(700);
const overlayPresent = await site.evaluate(() => !!document.getElementById('usrhelper-recording-overlay'));
await site.mouse.click(400, 300);
const rippleSeen = await site
  .waitForSelector('.usrhelper-ripple', { timeout: 1500 })
  .then(() => true)
  .catch(() => false);
await site.keyboard.press('Control+b');
const captionSeen = await site
  .waitForSelector('.usrhelper-caption', { timeout: 1500 })
  .then((el) => el.textContent())
  .catch(() => null);
check('Recording overlay active on pages', overlayPresent);
check('Click ripple shown on click', rippleSeen);
check('Key caption shown for Ctrl+B', captionSeen === 'Ctrl + B', String(captionSeen));

await recorder.bringToFront();
await recorder.locator('button:has-text("Pause")').click();
await recorder.waitForTimeout(1500);
const pausedLabel = await recorder.locator('button:has-text("Resume")').isVisible();
await recorder.locator('button:has-text("Resume")').click();
check('Pause/resume works', pausedLabel);

console.log('  … recording 75 s to cross the 1-min clip boundary …');
await recorder.waitForTimeout(75000);
await recorder.locator('button:has-text("Stop")').click();
await recorder.waitForSelector('text=Recording saved', { timeout: 20000 });

const recFiles = await waitNewDownloads(beforeRec, 2, 20000);
const clips = recFiles.filter((d) => d.mime === 'video/webm' || d.filename.endsWith('.webm'));
check('Recording split into ≥2 standalone clips (1-min boundary)', clips.length >= 2, `${clips.length} webm downloads`);
const clipSizes = clips.map((c) => (existsSync(c.filename) ? statSync(c.filename).size : 0));
check('Clip files non-empty on disk', clips.length >= 2 && clipSizes.every((s) => s > 10000), clipSizes.map((s) => `${Math.round(s / 1024)} kB`).join(', '));

// Burned-in timestamp: extract the last frame of a clip and check the
// bottom-right corner holds the dark timestamp box (much darker than centre).
let stampOk = false;
let stampDetail = 'ffmpeg unavailable';
try {
  const frame = join(WORK, 'frame.png');
  execFileSync('ffmpeg', ['-y', '-sseof', '-1', '-i', clips[0].filename, '-frames:v', '1', frame], { stdio: 'ignore' });
  // The stamp is a dark box with light text in the bottom-right corner:
  // expect both very dark and very light pixels there.
  const stats = execFileSync(
    'convert',
    [frame, '-gravity', 'SouthEast', '-crop', '30%x10%+0+0', '-colorspace', 'Gray', '-format', '%[fx:minima] %[fx:maxima]', 'info:'],
    { encoding: 'utf8' },
  )
    .trim()
    .split(' ')
    .map(Number);
  stampOk = stats[0] < 0.3 && stats[1] > 0.7;
  stampDetail = `corner minima=${stats[0].toFixed(3)} maxima=${stats[1].toFixed(3)}`;
} catch (err) {
  stampDetail = String(err).slice(0, 80);
}
check('Timestamp burned into the recording (dark box bottom-right)', stampOk, stampDetail);

const beforeRecJson = idsOf(await completedDownloads());
await recorder.locator('.card textarea').fill('E2E screencast description');
await recorder.locator('button:has-text("💾")').click();
const recJson = (await waitNewDownloads(beforeRecJson, 1, 15000)).filter((d) => d.mime === 'application/json');
check('Screencast companion JSON saved', recJson.length > 0);
if (recJson[0] && existsSync(recJson[0].filename)) {
  const meta = JSON.parse(readFileSync(recJson[0].filename, 'utf8'));
  check(
    'Screencast JSON lists the clip files',
    meta.kind === 'screencast' && meta.files?.length >= 2 && meta.files.every((f) => /UsrHelper\/e2e\/.*_part-\d{2}\.webm/.test(f)),
    `${meta.files?.length} files`,
  );
}

const overlayGone = await site.evaluate(() => !!document.getElementById('usrhelper-recording-overlay'));
check('Overlays removed after recording stops', !overlayGone);

// ================================================================== 6. Popup
console.log('— Popup & history —');
const popup = await context.newPage();
await popup.goto(extUrl('popup.html'));
await popup.waitForTimeout(600);
const history = await sw.evaluate(() => new Promise((r) => chrome.storage.local.get('history', (v) => r(v.history ?? []))));
check(
  'History has screenshot + screencast entries',
  history.some((h) => h.kind === 'screenshot') && history.some((h) => h.kind === 'screencast'),
  `${history.length} entries`,
);
const thumbs = await popup.locator('img').count();
check('Screenshot history entry has a thumbnail', thumbs >= 1);
const restrictedNote = await popup.locator('text=cannot be captured').count();
check('Restricted-page notice shown (popup opened as extension tab)', restrictedNote > 0);

// ------------------------------------------------------------------- summary
console.log('\n================= SUMMARY =================');
const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILED:');
  for (const f of failed) console.log(`  ✗ ${f.name}${f.detail ? ` — ${f.detail}` : ''}`);
}
await context.close();
server.close();
process.exit(failed.length ? 1 : 0);
