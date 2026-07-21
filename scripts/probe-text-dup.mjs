/**
 * Reproduces the duplicated text-annotation report: committing a text box with
 * Enter (or cancelling it with Escape) must add exactly ONE annotation, and a
 * single Undo must remove it completely.
 *
 * Chrome fires `blur` when the focused element is removed from the DOM, so the
 * Enter handler and the onBlur handler both fired commitText() against the same
 * not-yet-cleared state.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const server = createServer((_, res) => {
  res.setHeader('content-type', 'text/html');
  res.end('<!doctype html><meta charset="utf-8"><title>Probe</title><body style="background:#e2e8f0;font:16px sans-serif;padding:40px"><h1>Text duplication probe</h1></body>');
});
await new Promise((r) => server.listen(8126, r));

const EXT_PATH = resolve('.output/chrome-mv3');
const WORK = join(tmpdir(), `usrhelper-textdup-${Date.now()}`);
mkdirSync(WORK, { recursive: true });

const context = await chromium.launchPersistentContext(join(WORK, 'profile'), {
  headless: false,
  viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`, '--no-sandbox', '--disable-gpu'],
});
let [sw] = context.serviceWorkers();
if (!sw) sw = await context.waitForEvent('serviceworker');
const EXT_ID = new URL(sw.url()).host;

const site = await context.newPage();
await site.goto('http://127.0.0.1:8126/');
await site.bringToFront();
const options = await context.newPage();
await options.goto(`chrome-extension://${EXT_ID}/options.html`);
await site.bringToFront();
const editorPromise = context.waitForEvent('page', { predicate: (p) => p.url().includes('editor.html'), timeout: 15000 });
await options.evaluate(() => chrome.runtime.sendMessage({ type: 'capture', mode: 'visible' }));
const editor = await editorPromise;
editor.on('console', (m) => { if (m.text().includes('[PROBE]')) console.log('  console>', m.text()); });
await editor.waitForSelector('canvas');
await editor.waitForTimeout(600);

const box = await editor.locator('canvas').boundingBox();
const at = (fx, fy) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });
const undoBtn = editor.locator('button:has-text("Undo")');
/** Coloured (non-greyscale) pixels in a patch — text is drawn in the accent colour. */
const textPixels = (fx, fy) =>
  editor.evaluate(([x, y]) => {
    const c = document.querySelector('canvas');
    const d = c.getContext('2d').getImageData(Math.round(c.width * x), Math.round(c.height * y) - 20, 400, 120).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i] - d[i + 1]) > 40 || Math.abs(d[i] - d[i + 2]) > 40) n++;
    }
    return n;
  }, [fx, fy]);

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` — ${detail}` : ''}`);
};

// --- Case 1: Enter commits exactly one annotation -------------------------
await editor.locator('.toolbar button[title="Text"]').click();
await editor.mouse.click(at(0.15, 0.4).x, at(0.15, 0.4).y);
await editor.waitForSelector('.editor-text-input');
await editor.keyboard.type('Duplicate me');
await editor.keyboard.press('Enter');
await editor.waitForTimeout(300);
const afterCommit = await textPixels(0.15, 0.4);
check('Text box closes after Enter', (await editor.locator('.editor-text-input').count()) === 0);
check('Enter draws the text', afterCommit > 50, `coloured px=${afterCommit}`);

await undoBtn.click();
await editor.waitForTimeout(300);
const afterOneUndo = await textPixels(0.15, 0.4);
check('One Undo removes the whole text (no duplicate underneath)', afterOneUndo < 10, `coloured px=${afterOneUndo}`);
check('Undo history holds a single entry for one text', await undoBtn.isDisabled());

// --- Case 2: Escape discards, it must not commit ---------------------------
await editor.locator('.toolbar button[title="Text"]').click();
await editor.mouse.click(at(0.15, 0.7).x, at(0.15, 0.7).y);
await editor.waitForSelector('.editor-text-input');
await editor.keyboard.type('Discard me');
await editor.keyboard.press('Escape');
await editor.waitForTimeout(300);
const afterEscape = await textPixels(0.15, 0.7);
check('Escape discards the text instead of committing it', afterEscape < 10, `coloured px=${afterEscape}`);

check('Text box is gone from the DOM after Escape', (await editor.locator('.editor-text-input').count()) === 0);

// --- Case 3: drawing still works once the text box has been closed --------
// A leftover text box blocks onPointerDown, so every tool goes dead.
await editor.locator('.toolbar button[title="Marker"]').click();
await editor.mouse.move(at(0.3, 0.2).x, at(0.3, 0.2).y);
await editor.mouse.down();
for (let i = 1; i <= 8; i++) await editor.mouse.move(at(0.3 + 0.03 * i, 0.2).x, at(0.3, 0.2).y);
await editor.mouse.up();
await editor.waitForTimeout(300);
const inkStroke = await textPixels(0.3, 0.2);
check('Drawing tools still work after a text box was used', inkStroke > 50, `coloured px=${inkStroke}`);

await editor.screenshot({ path: join(WORK, 'text-dup.png') });
console.log(`shots in ${WORK}`);
await context.close();
server.close();
process.exit(failures === 0 ? 0 : 1);
