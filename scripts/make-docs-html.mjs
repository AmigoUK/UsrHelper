/**
 * Builds docs/index.html (GitHub Pages, PL/EN toggle) from the two Markdown
 * guides. Rerun after editing the guides:
 *
 *   node scripts/make-docs-html.mjs
 */
import { marked } from 'marked';
import { readFileSync, writeFileSync } from 'node:fs';

const pl = marked.parse(readFileSync('docs/manual/USER_GUIDE.pl.md', 'utf8'));
const en = marked.parse(readFileSync('docs/manual/USER_GUIDE.en.md', 'utf8'));

// Image paths in the MD are relative to docs/manual/; index.html lives in docs/.
const fixImages = (html) => html.replaceAll('src="images/', 'src="manual/images/');

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>UsrHelper — User Guide / Instrukcja</title>
<style>
  :root { --accent: #2563eb; --text: #1e293b; --muted: #64748b; --border: #e2e8f0; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 16px/1.65 system-ui, -apple-system, 'Segoe UI', sans-serif; color: var(--text); background: #f8fafc; }
  .topbar { position: sticky; top: 0; background: #fff; border-bottom: 1px solid var(--border); padding: 10px 20px; display: flex; align-items: center; gap: 16px; z-index: 10; }
  .topbar strong { font-size: 17px; }
  .lang-toggle { margin-left: auto; display: flex; gap: 6px; }
  .lang-toggle button { border: 1px solid var(--border); background: #fff; border-radius: 8px; padding: 6px 14px; font-size: 14px; cursor: pointer; }
  .lang-toggle button.active { background: var(--accent); border-color: var(--accent); color: #fff; }
  main { max-width: 860px; margin: 0 auto; padding: 24px 20px 60px; }
  article { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 28px 36px; }
  h1 { font-size: 26px; margin-top: 0; }
  h2 { font-size: 20px; margin-top: 36px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
  img { max-width: 100%; border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.07); margin: 8px 0; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 15px; }
  th, td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; vertical-align: top; }
  th { background: #f8fafc; }
  code { background: #f1f5f9; border-radius: 4px; padding: 1px 6px; font-size: 14px; }
  blockquote { border-left: 4px solid var(--accent); margin: 12px 0; padding: 4px 16px; color: var(--muted); background: #f8fafc; }
  a { color: var(--accent); }
  .hidden { display: none; }
  @media print {
    .topbar { display: none; }
    body { background: #fff; }
    article { border: 0; padding: 0; }
    img { box-shadow: none; }
    h2 { break-before: page; }
    h2:first-of-type { break-before: avoid; }
  }
</style>
</head>
<body>
<div class="topbar">
  <strong>UsrHelper</strong>
  <span style="color: var(--muted); font-size: 14px;">User Guide / Instrukcja użytkownika</span>
  <div class="lang-toggle">
    <button id="btn-en" onclick="setLang('en')">English</button>
    <button id="btn-pl" onclick="setLang('pl')">Polski</button>
  </div>
</div>
<main>
  <article id="lang-en">${fixImages(en)}</article>
  <article id="lang-pl" class="hidden">${fixImages(pl)}</article>
</main>
<script>
  function setLang(lang) {
    document.getElementById('lang-en').classList.toggle('hidden', lang !== 'en');
    document.getElementById('lang-pl').classList.toggle('hidden', lang !== 'pl');
    document.getElementById('btn-en').classList.toggle('active', lang === 'en');
    document.getElementById('btn-pl').classList.toggle('active', lang === 'pl');
    document.documentElement.lang = lang;
    try { localStorage.setItem('usrhelper-docs-lang', lang); } catch (e) {}
  }
  const param = new URLSearchParams(location.search).get('lang');
  let stored = null;
  try { stored = localStorage.getItem('usrhelper-docs-lang'); } catch (e) {}
  setLang(param === 'pl' || param === 'en' ? param : stored === 'pl' ? 'pl' : 'en');
</script>
</body>
</html>
`;

writeFileSync('docs/index.html', page);
console.log('docs/index.html written');

// Privacy policy page — the Chrome Web Store requires a public HTTPS URL.
const privacy = marked.parse(readFileSync('PRIVACY.md', 'utf8'));
const privacyPage = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>UsrHelper — Privacy Policy</title>
<style>
  body { margin: 0; font: 16px/1.65 system-ui, -apple-system, 'Segoe UI', sans-serif; color: #1e293b; background: #f8fafc; }
  main { max-width: 760px; margin: 0 auto; padding: 32px 20px 60px; }
  article { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px 36px; }
  h1 { font-size: 24px; margin-top: 0; }
  h2 { font-size: 19px; margin-top: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  a { color: #2563eb; }
  .back { display: inline-block; margin-bottom: 14px; color: #64748b; text-decoration: none; }
</style>
</head>
<body>
<main>
  <a class="back" href="./">← UsrHelper User Guide</a>
  <article>${privacy}</article>
</main>
</body>
</html>
`;
writeFileSync('docs/privacy.html', privacyPage);
console.log('docs/privacy.html written');
