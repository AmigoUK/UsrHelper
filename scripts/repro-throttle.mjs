/**
 * Repro: record ~12 s with the recorder tab HIDDEN (real-Chrome conditions —
 * Playwright's throttling-disabling flags removed). Before the worker-
 * compositor fix the clip freezes (few frames); after it, frames flow.
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const EXT_PATH = resolve(process.env.EXT_PATH ?? '.output/chrome-mv3');
const WORK = join(tmpdir(), `usrhelper-repro-${Date.now()}`);
mkdirSync(join(WORK, 'downloads'), { recursive: true });

const context = await chromium.launchPersistentContext(join(WORK, 'profile'), {
  headless: false,
  viewport: { width: 1280, height: 800 },
  ignoreDefaultArgs: [
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
  ],
  args: [
    `--disable-extensions-except=${EXT_PATH}`,
    `--load-extension=${EXT_PATH}`,
    '--auto-select-desktop-capture-source=Entire screen',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--no-sandbox',
  ],
});
const cdp = await context.browser()?.newBrowserCDPSession?.();
if (cdp) await cdp.send('Browser.setDownloadBehavior', { behavior: 'allowAndName', downloadPath: join(WORK, 'downloads'), eventsEnabled: false }).catch(() => {});

let [sw] = context.serviceWorkers();
if (!sw) sw = await context.waitForEvent('serviceworker');
const EXT_ID = new URL(sw.url()).host;

const recorder = await context.newPage();
recorder.on('console', (m) => console.log(`[page:${m.type()}] ${m.text()}`));
recorder.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
await recorder.goto(`chrome-extension://${EXT_ID}/recorder.html`);
await recorder.waitForSelector('button:has-text("Start recording")');

// Pipeline probe: does worker-composited generator produce frames at all?
if (!process.env.SKIP_PROBE) {
const probeResult = await recorder.evaluate(async () => {
  try {
    const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const track = display.getVideoTracks()[0];
    const processor = new MediaStreamTrackProcessor({ track });
    const generator = new MediaStreamTrackGenerator({ kind: 'video' });
    const worker = new Worker(chrome.runtime.getURL('/compositor-worker.js'));
    const errors = [];
    worker.onerror = (e) => errors.push(`worker error: ${e.message}`);
    worker.postMessage(
      { readable: processor.readable, writable: generator.writable, timestamp: true },
      [processor.readable, generator.writable],
    );
    const counter = new MediaStreamTrackProcessor({ track: generator });
    const reader = counter.readable.getReader();
    let frames = 0;
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const result = await Promise.race([
        reader.read(),
        new Promise((r) => setTimeout(() => r({ value: null, done: false }), 500)),
      ]);
      if (result.done) break;
      if (!result.value) continue; // timed out — no frame in 500 ms
      result.value.close();
      frames++;
    }
    worker.postMessage({ type: 'stop' });
    track.stop();
    return { frames, errors };
  } catch (err) {
    return { frames: -1, errors: [String(err)] };
  }
});
console.log(`RESULT: probe frames in 3s = ${JSON.stringify(probeResult)}`);
}
await recorder.locator('button:has-text("Start recording")').click();
await recorder.waitForTimeout(3500);

// Hide the recorder tab for the whole recording — like a real user demoing an app.
const other = await context.newPage();
await other.goto('about:blank');
await other.bringToFront();
await other.waitForTimeout(12000);

await recorder.bringToFront();
await recorder.locator('button:has-text("Stop")').click();
await recorder.waitForSelector('text=Recording saved', { timeout: 20000 });
await recorder.waitForTimeout(1500);

const allDownloads = await sw.evaluate(
  () => new Promise((r) => chrome.downloads.search({ orderBy: ['-startTime'], limit: 10 }, (i) => r(i.map((d) => ({ state: d.state, filename: d.filename, error: d.error, bytes: d.bytesReceived, total: d.totalBytes }))))),
);
console.log(`RESULT: all downloads = ${JSON.stringify(allDownloads)}`);
// Playwright renames downloads to bare GUIDs — identify the video by probing.
const items = allDownloads.filter((d) => d.state === 'complete' && d.bytes > 5000).map((d) => d.filename);
if (!items.length) {
  console.log('RESULT: no clip saved at all');
} else {
  for (const f of items) {
    try {
      const probe = execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames,r_frame_rate', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' });
      console.log(`RESULT: video=${f} fps,frames,duration = ${probe.replaceAll('\n', ' ')}`);
    } catch {
      console.log(`RESULT: ${f} is not probeable video`);
    }
  }
}
await context.close();
process.exit(0);
