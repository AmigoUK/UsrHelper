/**
 * Builds the printable guides in docs/manual/pdf/ from docs/index.html, one per
 * language. Rerun after editing the guides:
 *
 *   node scripts/make-docs-html.mjs && node scripts/make-docs-pdf.mjs
 *
 * The originals were produced by printing that page from Chrome by hand, which
 * left no record of how. This script is that recipe: the page already carries a
 * print stylesheet (topbar hidden, one chapter per page), so the only thing to
 * arrange is which language article is visible.
 */
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const PAGE = pathToFileURL(resolve('docs/index.html')).href;
const OUT = {
  en: 'docs/manual/pdf/UsrHelper_User_Guide_EN.pdf',
  pl: 'docs/manual/pdf/UsrHelper_Instrukcja_PL.pdf',
};

const browser = await chromium.launch();
const page = await browser.newPage();

for (const [lang, path] of Object.entries(OUT)) {
  await page.goto(PAGE, { waitUntil: 'networkidle' });
  await page.evaluate((l) => {
    document.getElementById('lang-en').classList.toggle('hidden', l !== 'en');
    document.getElementById('lang-pl').classList.toggle('hidden', l !== 'pl');
  }, lang);
  await page.pdf({
    path,
    format: 'A4',
    printBackground: true,
    margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
  });
  console.log(`${path} written`);
}

await browser.close();
