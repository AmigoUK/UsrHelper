/**
 * Generates the user-guide screenshots (docs/manual/images/) from the real
 * extension in Chromium. Rerun after UI changes:
 *
 *   npm run build && xvfb-run -a node scripts/make-docs-shots.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const EXT_PATH = resolve('.output/chrome-mv3');
const OUT = resolve('docs/manual/images');
mkdirSync(OUT, { recursive: true });
const WORK = join(tmpdir(), `usrhelper-shots-${Date.now()}`);
const PORT = 8124;

const DEMO_PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>ACME Orders — Demo App</title><style>
  body { font: 15px/1.5 system-ui, sans-serif; margin: 0; background: #f1f5f9; color: #0f172a; }
  header { background: #1d4ed8; color: #fff; padding: 14px 28px; font-size: 19px; font-weight: 600; }
  main { max-width: 860px; margin: 28px auto; background: #fff; border-radius: 10px; padding: 24px 28px; box-shadow: 0 1px 4px rgba(0,0,0,.1); }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; }
  th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
  th { background: #f8fafc; }
  .btn { background: #1d4ed8; color: #fff; border: 0; border-radius: 7px; padding: 9px 18px; font-size: 14px; cursor: pointer; }
  .total { font-weight: 700; color: #dc2626; }
</style></head><body>
<header>ACME Orders — internal panel</header>
<main>
  <h2 style="margin:0">Orders — July 2026</h2>
  <table>
    <tr><th>#</th><th>Customer</th><th>Product</th><th>Amount</th><th>Status</th></tr>
    <tr><td>1041</td><td>Novak Ltd</td><td>Licence PRO</td><td>£1,200.00</td><td>Paid</td></tr>
    <tr><td>1042</td><td>Baker &amp; Co</td><td>Support 12m</td><td>£640.00</td><td>Pending</td></tr>
    <tr><td>1043</td><td>Kowalski JDG</td><td>Licence PRO</td><td class="total">£−320.00</td><td>Error</td></tr>
  </table>
  <p style="margin-top:18px"><button class="btn">Generate invoice</button></p>
</main>
</body></html>`;

const server = createServer((_, res) => {
  res.setHeader('content-type', 'text/html');
  res.end(DEMO_PAGE);
});
await new Promise((r) => server.listen(PORT, r));

const context = await chromium.launchPersistentContext(join(WORK, 'profile'), {
  headless: false,
  viewport: { width: 1280, height: 800 },
  args: [
    `--disable-extensions-except=${EXT_PATH}`,
    `--load-extension=${EXT_PATH}`,
    '--auto-select-desktop-capture-source=Entire screen',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--no-sandbox',
    '--disable-gpu',
  ],
});
let [sw] = context.serviceWorkers();
if (!sw) sw = await context.waitForEvent('serviceworker');
const EXT_ID = new URL(sw.url()).host;
const extUrl = (p) => `chrome-extension://${EXT_ID}/${p}`;
const shot = (page, name) => page.screenshot({ path: join(OUT, name) });
console.log(`Extension: ${EXT_ID}`);

// ---- 1. chrome://extensions card (installation section)
const extPage = await context.newPage();
await extPage.goto('chrome://extensions');
await extPage.waitForTimeout(800);
await shot(extPage, 'install-extensions-page.png');
await extPage.close();

// ---- 2. Settings, filled with sample data
const options = await context.newPage();
await options.goto(extUrl('options.html'));
await options.waitForSelector('h1');
const setField = async (label, value) => {
  const input = options.locator(`label:has-text("${label}")`).first().locator('xpath=following-sibling::*[self::input or self::textarea][1]');
  await input.fill(String(value));
  await input.dispatchEvent('change');
};
await setField('Customer no.', 'C-102');
await setField('Company', 'ACME Ltd');
await setField('First name', 'Jan');
await setField('Last name', 'Kowalski');
await setField('AnyDesk no.', '123 456 789');
await setField('Email to', 'dev@yourcompany.com');
await setField('CC', 'pm@yourcompany.com');
await setField('Subfolder in Downloads', 'UsrHelper/my-project');
await options.waitForTimeout(1800); // let the "saved" toast disappear
await shot(options, 'settings.png');

// ---- 3. Demo page + visible capture → editor with annotations
const site = await context.newPage();
await site.goto(`http://127.0.0.1:${PORT}/`);
await site.waitForTimeout(400);
await site.mouse.click(640, 420);
await site.bringToFront();
const editorPromise = context.waitForEvent('page', { predicate: (p) => p.url().includes('editor.html'), timeout: 15000 });
await options.evaluate(() => chrome.runtime.sendMessage({ type: 'capture', mode: 'visible' }));
const editor = await editorPromise;
await editor.waitForSelector('canvas');
await editor.waitForTimeout(800);

const box = await editor.locator('canvas').boundingBox();
const at = (fx, fy) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });
const drag = async (from, to) => {
  await editor.mouse.move(from.x, from.y);
  await editor.mouse.down();
  for (let i = 1; i <= 8; i++) await editor.mouse.move(from.x + ((to.x - from.x) * i) / 8, from.y + ((to.y - from.y) * i) / 8);
  await editor.mouse.up();
};
const tool = (name) => editor.locator(`.toolbar button[title="${name}"]`).click();

// Coordinates are fractions of the captured viewport; the demo table rows sit
// at y≈0.22/0.26/0.30, amount column x≈0.46-0.55, customer column x≈0.14-0.24.
await tool('Rectangle');
await drag(at(0.44, 0.295), at(0.56, 0.335)); // around the wrong amount
await tool('Arrow');
await drag(at(0.63, 0.42), at(0.545, 0.335));
await tool('Step marker');
await editor.mouse.click(at(0.125, 0.225).x, at(0.125, 0.225).y);
await editor.mouse.click(at(0.125, 0.3).x, at(0.125, 0.3).y);
await tool('Text');
await editor.mouse.click(at(0.575, 0.435).x, at(0.575, 0.435).y);
await editor.waitForSelector('.editor-text-input');
await editor.keyboard.type('Negative total?!');
await editor.keyboard.press('Enter');
await tool('Anonymize (mosaic)');
await drag(at(0.15, 0.3), at(0.25, 0.3));
await editor.locator('.editor-sidebar textarea').last().fill('Order #1043 shows a negative total after applying the discount.');
await editor.waitForTimeout(300);
await shot(editor, 'editor.png');

// Save so the popup history has an entry.
await editor.locator('button:has-text("💾")').click();
await editor.waitForSelector('text=Saved to Downloads/', { timeout: 15000 }).catch(() => {});
await editor.waitForTimeout(500);
await shot(editor, 'editor-saved.png');
await editor.close();

// ---- 4. Recorder: setup + recording states
const recorder = await context.newPage();
await recorder.goto(extUrl('recorder.html'));
await recorder.waitForSelector('h1');
await recorder.waitForTimeout(1200);
await shot(recorder, 'recorder-setup.png');

await recorder.locator('button:has-text("Start recording")').click();
await recorder.waitForTimeout(4500); // countdown + first second
await shot(recorder, 'recorder-recording.png');

// Overlay on the demo page while recording (ripple + key caption).
await site.bringToFront();
await site.waitForTimeout(600);
await site.mouse.click(500, 340);
await site.keyboard.press('Control+s');
await site.waitForTimeout(350);
await shot(site, 'recording-overlay.png');

await recorder.bringToFront();
await recorder.waitForTimeout(2000);
await recorder.locator('button:has-text("Stop")').click();
await recorder.waitForSelector('text=Recording saved', { timeout: 20000 });
await recorder.locator('.card textarea').fill('Short walkthrough of the order error.');
await recorder.waitForTimeout(300);
await shot(recorder, 'recorder-done.png');
await recorder.close();

// ---- 5. Popup with history (narrow viewport like the real popup)
const popup = await context.newPage();
await popup.setViewportSize({ width: 360, height: 640 });
await popup.goto(extUrl('popup.html'));
await popup.waitForTimeout(800);
// Docs-only: restore the state the user sees over a normal page (the popup is
// opened here as an extension tab, which triggers the restricted-page notice).
await popup.evaluate(() => {
  document.querySelectorAll('button[disabled]').forEach((b) => b.removeAttribute('disabled'));
  document.querySelectorAll('.hint').forEach((h) => {
    if (h.textContent?.includes('cannot be captured')) h.remove();
  });
});
await popup.waitForTimeout(200);
await shot(popup, 'popup.png');

await context.close();
server.close();
console.log(`Screenshots written to ${OUT}`);
