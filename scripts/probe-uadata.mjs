/**
 * navigator.platform reports "MacIntel" even on Apple Silicon and the UA string
 * freezes macOS at 10_15_7. This probe shows what User-Agent Client Hints give
 * instead, from a real extension page.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const EXT_PATH = resolve('.output/chrome-mv3');
const WORK = join(tmpdir(), `usrhelper-uadata-${Date.now()}`);
mkdirSync(WORK, { recursive: true });

const context = await chromium.launchPersistentContext(join(WORK, 'profile'), {
  headless: false,
  viewport: { width: 1000, height: 700 },
  args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`, '--no-sandbox', '--disable-gpu'],
});
let [sw] = context.serviceWorkers();
if (!sw) sw = await context.waitForEvent('serviceworker');
const EXT_ID = new URL(sw.url()).host;

const page = await context.newPage();
await page.goto(`chrome-extension://${EXT_ID}/options.html`);
await page.waitForSelector('h1');

const out = await page.evaluate(async () => {
  const legacy = { platform: navigator.platform, userAgent: navigator.userAgent };
  if (!navigator.userAgentData) return { legacy, hints: null, supported: false };
  const hints = await navigator.userAgentData.getHighEntropyValues([
    'architecture',
    'bitness',
    'model',
    'platformVersion',
    'fullVersionList',
    'uaFullVersion',
  ]);
  return {
    legacy,
    supported: true,
    hints: {
      platform: navigator.userAgentData.platform,
      mobile: navigator.userAgentData.mobile,
      architecture: hints.architecture,
      bitness: hints.bitness,
      model: hints.model,
      platformVersion: hints.platformVersion,
      fullVersionList: hints.fullVersionList,
    },
  };
});

console.log(JSON.stringify(out, null, 2));
await context.close();
process.exit(0);
