import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EXT_PATH = process.env.EXT_PATH;
const WORK = join(tmpdir(), `usrhelper-opt-${Date.now()}`);
mkdirSync(WORK, { recursive: true });

const context = await chromium.launchPersistentContext(join(WORK, 'profile'), {
  headless: false,
  args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`, '--no-sandbox'],
});
let [sw] = context.serviceWorkers();
if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 10000 }).catch(() => null);
if (!sw) {
  console.log('RESULT: service worker NEVER started — extension failed to load');
  process.exit(1);
}
const EXT_ID = new URL(sw.url()).host;
console.log(`RESULT: extension loaded, id=${EXT_ID}`);

const page = await context.newPage();
page.on('console', (m) => console.log(`[page:${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
const resp = await page.goto(`chrome-extension://${EXT_ID}/options.html`).catch((e) => {
  console.log(`RESULT: goto failed: ${e.message}`);
  return null;
});
await page.waitForTimeout(2000);
const h1 = await page.textContent('h1').catch(() => null);
const bodyLen = await page.evaluate(() => document.body.innerHTML.length).catch(() => -1);
console.log(`RESULT: status=${resp?.status()} h1="${h1}" bodyHtmlLen=${bodyLen}`);

// User flow: chrome://extensions/?options=<id> — with open_in_tab the options
// page must open as a real tab.
const optionsTab = context.waitForEvent('page', { predicate: (p) => p.url().includes('options.html'), timeout: 8000 });
await page.goto(`chrome://extensions/?options=${EXT_ID}`).catch((e) => console.log(`RESULT: chrome page goto failed: ${e.message}`));
let tab = await optionsTab.catch(() => null);
if (!tab) {
  // The ?options= param no longer auto-opens; click the "Extension options"
  // row on the details page like a real user.
  const row = page.locator('text=Extension options').first();
  const rowVisible = await row.isVisible().catch(() => false);
  console.log(`RESULT: ?options= param did nothing; "Extension options" row visible=${rowVisible}`);
  if (rowVisible) {
    const tabPromise = context.waitForEvent('page', { predicate: (p) => p.url().includes('options.html'), timeout: 8000 });
    await row.click();
    tab = await tabPromise.catch(() => null);
  }
}
if (tab) {
  await tab.waitForSelector('h1');
  console.log(`RESULT: options OPENED IN TAB, h1="${await tab.textContent('h1')}"`);
} else {
  console.log('RESULT: options tab did NOT open');
}
await page.screenshot({ path: process.env.SHOT ?? '/tmp/options-dialog.png' });
console.log(`RESULT: screenshot saved`);
await context.close();
