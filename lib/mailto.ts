import type { ReportMetadata } from './types';

/** Conservative cap — long mailto: URLs break in some mail clients. */
export const MAILTO_MAX_LENGTH = 6000;

export interface MailtoInput {
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  truncationNote?: string;
}

export function buildMailtoUrl({ to, cc, subject, body, truncationNote }: MailtoInput): string {
  const params = new URLSearchParams();
  if (cc.length > 0) params.set('cc', cc.join(','));
  params.set('subject', subject);

  const encodeUrl = (b: string) => {
    const p = new URLSearchParams(params);
    p.set('body', b);
    // URLSearchParams encodes spaces as '+'; mail clients expect %20.
    return `mailto:${to.join(',')}?${p.toString().replaceAll('+', '%20')}`;
  };

  let url = encodeUrl(body);
  if (url.length > MAILTO_MAX_LENGTH) {
    const note = truncationNote ? `\n\n${truncationNote}` : '';
    let keep = body.length;
    while (keep > 0 && url.length > MAILTO_MAX_LENGTH) {
      keep = Math.floor(keep * 0.8);
      url = encodeUrl(body.slice(0, keep) + note);
    }
  }
  return url;
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** Builds the plain-text email body from report metadata. */
export function buildReportBody(meta: ReportMetadata, t: Translate): string {
  const lines: string[] = [];
  if (meta.description.trim()) {
    lines.push(meta.description.trim(), '');
  }
  const reporterLine = formatReporter(meta);
  if (reporterLine) lines.push(`${t('meta.reporter')}: ${reporterLine}`);
  lines.push(`${t('meta.pageUrl')}: ${meta.pageUrl}`);
  lines.push(`${t('meta.pageTitle')}: ${meta.pageTitle}`);
  lines.push(`${t('meta.capturedAt')}: ${meta.capturedAt}`);
  lines.push(
    `${t('meta.environment')}: ${meta.environment.userAgent} | ${meta.environment.platform} | ` +
      `screen ${meta.environment.screenResolution} | viewport ${meta.environment.viewport}`,
  );
  if (meta.consoleErrors.length > 0) {
    lines.push('', `${t('meta.consoleErrors')}:`);
    for (const err of meta.consoleErrors.slice(-10)) {
      lines.push(`  [${err.at}] ${err.message}`);
    }
  }
  lines.push('', t('mailto.attachReminder', { files: meta.files.join(', ') }));
  return lines.join('\n');
}

function formatReporter(meta: ReportMetadata): string {
  const r = meta.reporter;
  if (!r) return '';
  return [
    [r.firstName, r.lastName].filter(Boolean).join(' '),
    r.company,
    r.customerNo && `#${r.customerNo}`,
    r.anyDesk && `AnyDesk: ${r.anyDesk}`,
  ]
    .filter(Boolean)
    .join(' | ');
}
