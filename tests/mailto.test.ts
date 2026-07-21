import { describe, expect, it } from 'vitest';
import { buildMailtoUrl, buildReportBody, MAILTO_MAX_LENGTH } from '../lib/mailto';
import type { ReportMetadata } from '../lib/types';

describe('buildMailtoUrl', () => {
  it('builds a mailto with to, cc, subject and body', () => {
    const url = buildMailtoUrl({
      to: ['a@example.com', 'b@example.com'],
      cc: ['c@example.com'],
      subject: 'Hello world',
      body: 'Line 1\nLine 2',
    });
    expect(url.startsWith('mailto:a@example.com,b@example.com?')).toBe(true);
    expect(url).toContain('cc=c%40example.com');
    expect(url).toContain('subject=Hello%20world');
    expect(url).toContain('body=Line%201%0ALine%202');
  });

  it('omits cc when empty', () => {
    const url = buildMailtoUrl({ to: ['a@example.com'], cc: [], subject: 's', body: 'b' });
    expect(url).not.toContain('cc=');
  });

  it('truncates overlong bodies and appends the truncation note', () => {
    const url = buildMailtoUrl({
      to: ['a@example.com'],
      cc: [],
      subject: 's',
      body: 'x'.repeat(10000),
      truncationNote: '(truncated)',
    });
    expect(url.length).toBeLessThanOrEqual(MAILTO_MAX_LENGTH);
    expect(decodeURIComponent(url)).toContain('(truncated)');
  });
});

describe('buildReportBody', () => {
  const meta: ReportMetadata = {
    kind: 'screenshot',
    description: 'Button does nothing',
    capturedAt: '2026-07-17T14:32:05.000Z',
    pageUrl: 'https://app.example.com/orders',
    pageTitle: 'Orders',
    environment: {
      userAgent: 'TestUA',
      platform: 'macOS 15.3.0',
      architecture: 'arm64',
      browser: 'Google Chrome 150.0.7827.55',
      language: 'en-GB',
      screenResolution: '1920x1080',
      viewport: '1600x900',
      devicePixelRatio: 1,
    },
    consoleErrors: [{ message: 'TypeError: x is undefined', at: '2026-07-17T14:31:00.000Z' }],
    clickPath: [],
    files: ['UsrHelper/a.png', 'UsrHelper/a.json'],
    extensionVersion: '0.0.1',
  };

  it('includes reporter line when reporter details are set', () => {
    const body = buildReportBody(
      {
        ...meta,
        reporter: { customerNo: 'C-102', company: 'ACME', firstName: 'Jan', lastName: 'Kowalski', anyDesk: '123 456 789' },
      },
      (k) => k,
    );
    expect(body).toContain('meta.reporter: Jan Kowalski | ACME | #C-102 | AnyDesk: 123 456 789');
  });

  it('omits reporter line when all reporter fields are empty', () => {
    const body = buildReportBody(
      { ...meta, reporter: { customerNo: '', company: '', firstName: '', lastName: '', anyDesk: '' } },
      (k) => k,
    );
    expect(body).not.toContain('meta.reporter');
  });

  it('reports the real machine, not the frozen UA values', () => {
    const body = buildReportBody(meta, (k) => k);
    expect(body).toContain('meta.environment: macOS 15.3.0 | arm64 | Google Chrome 150.0.7827.55 | screen 1920x1080');
    expect(body).toContain('meta.userAgent: TestUA');
  });

  it('omits environment parts the browser did not report', () => {
    const body = buildReportBody(
      { ...meta, environment: { ...meta.environment, architecture: '', browser: '' } },
      (k) => k,
    );
    expect(body).toContain('meta.environment: macOS 15.3.0 | screen 1920x1080');
  });

  it('includes description, url and attach reminder with file list', () => {
    const body = buildReportBody(meta, (k, p) =>
      k === 'mailto.attachReminder' ? `Attach: ${p?.files}` : k,
    );
    expect(body).toContain('Button does nothing');
    expect(body).toContain('https://app.example.com/orders');
    expect(body).toContain('Attach: UsrHelper/a.png, UsrHelper/a.json');
    expect(body).toContain('TypeError: x is undefined');
  });
});
