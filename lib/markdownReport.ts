import type { ReportMetadata } from './types';

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** Same cap the email body uses, so both hand-offs carry the same evidence. */
const MAX_CONSOLE_ERRORS = 10;

/**
 * Renders the report as GitHub-flavoured Markdown, ready to paste into an issue
 * tracker. Same input as `buildReportBody` in ./mailto — a different syntax, not
 * a different report.
 */
export function buildMarkdownReport(meta: ReportMetadata, t: Translate): string {
  const parts: string[] = [heading(meta, t)];
  // The description is a paragraph above the table, so its line breaks survive
  // and a pipe in it cannot split a row.
  if (meta.description.trim()) parts.push(meta.description.trim());
  parts.push(table(meta, t));

  const notes = noteList(meta);
  if (notes) parts.push(`### ${t('meta.notes')}\n\n${notes}`);

  const errors = consoleBlock(meta);
  if (errors) parts.push(`### ${t('meta.consoleErrors')}\n\n${errors}`);

  if (meta.files.length > 0) {
    parts.push(`### ${t('markdown.files')}\n\n${meta.files.map((f) => `- \`${f}\``).join('\n')}`);
    parts.push(t('mailto.attachReminder', { files: meta.files.join(', ') }));
  }

  return `${parts.join('\n\n')}\n`;
}

function heading(meta: ReportMetadata, t: Translate): string {
  const subject = t(meta.kind === 'screenshot' ? 'mailto.subject.screenshot' : 'mailto.subject.screencast');
  const title = meta.pageTitle.trim();
  // A colon, not a dash: the Polish subject already contains a dash, and page
  // titles frequently do too, which would put three of them in one heading.
  return `## ${title ? `${subject}: ${title}` : subject}`;
}

function table(meta: ReportMetadata, t: Translate): string {
  const env = meta.environment;
  const rows: Array<[string, string]> = [
    [t('meta.reporter'), reporter(meta)],
    // A pipe inside an autolink cannot be backslash-escaped — the backslash
    // would end up in the link target — so it is percent-encoded instead, which
    // is what a browser does with it anyway.
    [t('meta.pageUrl'), meta.pageUrl ? `<${meta.pageUrl.replaceAll('|', '%7C')}>` : ''],
    [t('meta.capturedAt'), meta.capturedAt],
    [
      t('meta.environment'),
      [env.platform, env.architecture, env.browser].filter(Boolean).join(' · ') +
        ` · screen ${env.screenResolution} · viewport ${env.viewport}`,
    ],
    [t('meta.userAgent'), env.userAgent ? `\`${env.userAgent}\`` : ''],
    ['UsrHelper', meta.extensionVersion],
  ];

  return [
    `| ${t('markdown.field')} | ${t('markdown.value')} |`,
    '|---|---|',
    ...rows.filter(([, value]) => value.trim()).map(([label, value]) => `| ${cell(label)} | ${cell(value)} |`),
  ].join('\n');
}

function reporter(meta: ReportMetadata): string {
  const r = meta.reporter;
  if (!r) return '';
  return [
    [r.firstName, r.lastName].filter(Boolean).join(' '),
    r.company,
    r.customerNo && `#${r.customerNo}`,
    r.anyDesk && `AnyDesk: ${r.anyDesk}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * A pipe would end the cell early and a newline would end the row, so both are
 * neutralised. GFM resolves `\|` to a literal pipe even inside a code span.
 */
function cell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim();
}

function noteList(meta: ReportMetadata): string {
  if (meta.notes.length === 0) return '';
  return meta.notes.map((n) => `${n.index}. ${n.text.replace(/\s*\n\s*/g, ' ')}`).join('\n');
}

function consoleBlock(meta: ReportMetadata): string {
  const errors = meta.consoleErrors.slice(-MAX_CONSOLE_ERRORS);
  if (errors.length === 0) return '';
  const body = errors.map((e) => `[${e.at}] ${e.message}`).join('\n');
  // A message may itself contain a fence; the block's own fence has to be longer
  // than the longest run of backticks inside it, or the code block ends early.
  const longestRun = Math.max(0, ...[...body.matchAll(/`+/g)].map((m) => m[0].length));
  const fence = '`'.repeat(Math.max(3, longestRun + 1));
  return `${fence}text\n${body}\n${fence}`;
}
