/** Verifies the text-tool fixes: on-screen input box + wrapped canvas text. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const server = createServer((_, res) => {
  res.setHeader('content-type', 'text/html');
  res.end('<!doctype html><meta charset="utf-8"><title>Probe</title><body style="background:#e2e8f0;font:16px sans-serif;padding:40px"><h1>Text probe page</h1></body>');
});
await new Promise((r) => server.listen(8125, r));

const EXT_PATH = resolve('.output/chrome-mv3');
const WORK = join(tmpdir(), `usrhelper-text-${Date.now()}`);
mkdirSync(WORK, { recursive: true });
const SHOTS = process.env.SHOTS ?? WORK;

const context = await chromium.launchPersistentContext(join(WORK, 'profile'), {
  headless: false,
  viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`, '--no-sandbox', '--disable-gpu'],
});
let [sw] = context.serviceWorkers();
if (!sw) sw = await context.waitForEvent('serviceworker');
const EXT_ID = new URL(sw.url()).host;

const site = await context.newPage();
await site.goto('http://127.0.0.1:8125/');
await site.bringToFront();
const options = await context.newPage();
await options.goto(`chrome-extension://${EXT_ID}/options.html`);
await site.bringToFront();
const editorPromise = context.waitForEvent('page', { predicate: (p) => p.url().includes('editor.html'), timeout: 15000 });
const resp = await options.evaluate(() => chrome.runtime.sendMessage({ type: 'capture', mode: 'visible' }));
console.log(`RESULT: capture response = ${JSON.stringify(resp)}`);
const editor = await editorPromise;
await editor.waitForSelector('canvas');
await editor.waitForTimeout(600);

// Click the Text tool near the RIGHT edge of the canvas.
await editor.locator('.toolbar button[title="Text"]').click();
const box = await editor.locator('canvas').boundingBox();
await editor.mouse.click(box.x + box.width - 20, box.y + 60);
await editor.waitForSelector('.editor-text-input');
const LONG = 'This is a very long annotation text that previously ran off the screen in one endless line and was impossible to read for anyone reviewing the report screenshot afterwards';
await editor.keyboard.type(LONG);

const inputBox = await editor.locator('.editor-text-input').boundingBox();
const onScreen = inputBox.x >= 0 && inputBox.x + inputBox.width <= 1280 && inputBox.width <= 340;
console.log(`RESULT: input box x=${Math.round(inputBox.x)} w=${Math.round(inputBox.width)} onScreen=${onScreen}`);
await editor.screenshot({ path: join(SHOTS, 'text-input.png') });

await editor.keyboard.press('Enter');
await editor.waitForTimeout(300);
// The wrapped text must not extend past the canvas right edge: sample pixels.
const wrapped = await editor.evaluate(() => {
  const c = document.querySelector('canvas');
  const ctx = c.getContext('2d');
  // Any non-background-coloured pixels within 5px of the right edge at text height?
  const d = ctx.getImageData(c.width - 5, 40, 5, 300).data;
  let coloured = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (Math.abs(d[i] - d[i + 1]) > 40 || Math.abs(d[i] - d[i + 2]) > 40) coloured++;
  }
  return { colouredEdgePixels: coloured };
});
console.log(`RESULT: coloured pixels at right edge=${wrapped.colouredEdgePixels} (0 = text wrapped, none clipped)`);
await editor.screenshot({ path: join(SHOTS, 'text-wrapped.png') });
console.log(`RESULT: shots in ${SHOTS}`);
await context.close();
server.close();
process.exit(0);
