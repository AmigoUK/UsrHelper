/**
 * lib/save.ts attaches its chrome.downloads.onChanged listener only AFTER
 * chrome.downloads.download() resolves. If a download reaches "complete" in
 * that window the event is missed and waitForDownload() never settles — the
 * editor would sit on "saving" forever. This probe measures how often a small
 * file is already complete by the time the download() promise resolves.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const EXT_PATH = resolve('.output/chrome-mv3');
const WORK = join(tmpdir(), `usrhelper-dlrace-${Date.now()}`);
mkdirSync(join(WORK, 'downloads'), { recursive: true });

const context = await chromium.launchPersistentContext(join(WORK, 'profile'), {
  headless: false,
  viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`, '--no-sandbox', '--disable-gpu'],
});
const cdp = await context.browser()?.newBrowserCDPSession?.();
if (cdp) {
  await cdp
    .send('Browser.setDownloadBehavior', { behavior: 'allowAndName', downloadPath: join(WORK, 'downloads'), eventsEnabled: false })
    .catch(() => {});
}
let [sw] = context.serviceWorkers();
if (!sw) sw = await context.waitForEvent('serviceworker');
const EXT_ID = new URL(sw.url()).host;

const page = await context.newPage();
await page.goto(`chrome-extension://${EXT_ID}/options.html`);
await page.waitForSelector('h1');

// Small JSON, exactly like the companion file the editor writes.
const results = await page.evaluate(async () => {
  const states = [];
  for (let i = 0; i < 20; i++) {
    const blob = new Blob([JSON.stringify({ probe: i })], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const id = await chrome.downloads.download({
      url,
      filename: `usrhelper-probe/probe-${i}.json`,
      saveAs: false,
      conflictAction: 'uniquify',
    });
    // State at the exact moment lib/save.ts would attach its listener.
    const [item] = await chrome.downloads.search({ id });
    states.push(item?.state ?? 'unknown');
    URL.revokeObjectURL(url);
  }
  return states;
});

const missed = results.filter((s) => s !== 'in_progress').length;
console.log(`states: ${JSON.stringify(results)}`);
console.log(`RESULT: ${missed}/${results.length} downloads already settled before a listener could attach`);
await context.close();
process.exit(0);
