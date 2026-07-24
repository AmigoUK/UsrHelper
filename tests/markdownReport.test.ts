import { describe, expect, it } from 'vitest';
import { buildMarkdownReport } from '../lib/markdownReport';
import type { ReportMetadata } from '../lib/types';

const meta: ReportMetadata = {
  kind: 'screenshot',
  description: 'Button does nothing',
  capturedAt: '2026-07-24T14:32:05.000Z',
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
  consoleErrors: [{ message: 'TypeError: x is undefined', at: '2026-07-24T14:31:00.000Z' }],
  clickPath: [],
  notes: [],
  files: ['UsrHelper/a.png', 'UsrHelper/a.json'],
  extensionVersion: '0.10.0',
};

/** Keys pass through unchanged so assertions read as the key they check. */
const t = (k: string, p?: Record<string, string | number>) =>
  k === 'mailto.attachReminder' ? `Attach: ${p?.files}` : k;

/** The rows of the metadata table, without the header and the separator. */
function tableRows(md: string): string[] {
  return md.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| markdown.field') && !l.startsWith('|---'));
}

describe('buildMarkdownReport — heading', () => {
  it('leads with the report kind and the page title', () => {
    expect(buildMarkdownReport(meta, t)).toMatch(/^## mailto\.subject\.screenshot: Orders\n/);
  });

  it('uses the screencast subject for a recording', () => {
    const md = buildMarkdownReport({ ...meta, kind: 'screencast', pageTitle: '', pageUrl: '' }, t);
    expect(md).toMatch(/^## mailto\.subject\.screencast\n/);
  });

  it('leaves no dangling separator when there is no page title', () => {
    expect(buildMarkdownReport({ ...meta, pageTitle: '' }, t)).toMatch(/^## mailto\.subject\.screenshot\n/);
  });
});

describe('buildMarkdownReport — description', () => {
  it('places the description above the table and keeps its line breaks', () => {
    const md = buildMarkdownReport({ ...meta, description: 'First line\nSecond line' }, t);
    expect(md.indexOf('First line\nSecond line')).toBeLessThan(md.indexOf('| markdown.field'));
  });

  it('omits the description paragraph when it is blank', () => {
    const md = buildMarkdownReport({ ...meta, description: '   ' }, t);
    expect(md).toMatch(/^## mailto\.subject\.screenshot: Orders\n\n\| markdown\.field/);
  });
});

describe('buildMarkdownReport — table', () => {
  it('renders a GFM table header so the rows are not read as text', () => {
    expect(buildMarkdownReport(meta, t)).toContain('| markdown.field | markdown.value |\n|---|---|\n');
  });

  it('links the page url and states when it was captured', () => {
    const md = buildMarkdownReport(meta, t);
    expect(md).toContain('| meta.pageUrl | <https://app.example.com/orders> |');
    expect(md).toContain('| meta.capturedAt | 2026-07-24T14:32:05.000Z |');
  });

  it('percent-encodes a pipe in the url — a backslash inside an autolink would land in the link target', () => {
    const md = buildMarkdownReport({ ...meta, pageUrl: 'https://app.example.com/o?f=a|b' }, t);
    expect(md).toContain('| meta.pageUrl | <https://app.example.com/o?f=a%7Cb> |');
  });

  it('reports the real machine, not the frozen UA values', () => {
    const md = buildMarkdownReport(meta, t);
    expect(md).toContain(
      '| meta.environment | macOS 15.3.0 · arm64 · Google Chrome 150.0.7827.55 · screen 1920x1080 · viewport 1600x900 |',
    );
    expect(md).toContain('| meta.userAgent | `TestUA` |');
  });

  it('omits environment parts the browser did not report', () => {
    const md = buildMarkdownReport(
      { ...meta, environment: { ...meta.environment, architecture: '', browser: '' } },
      t,
    );
    expect(md).toContain('| meta.environment | macOS 15.3.0 · screen 1920x1080 · viewport 1600x900 |');
  });

  it('names the extension version, because tester and developer may differ', () => {
    expect(buildMarkdownReport(meta, t)).toContain('| UsrHelper | 0.10.0 |');
  });

  it('includes the reporter when their details are set', () => {
    const md = buildMarkdownReport(
      {
        ...meta,
        reporter: { customerNo: 'C-102', company: 'ACME', firstName: 'Jan', lastName: 'Kowalski', anyDesk: '123 456 789' },
      },
      t,
    );
    expect(md).toContain('| meta.reporter | Jan Kowalski · ACME · #C-102 · AnyDesk: 123 456 789 |');
  });

  it('omits the reporter row when every reporter field is empty', () => {
    const md = buildMarkdownReport(
      { ...meta, reporter: { customerNo: '', company: '', firstName: '', lastName: '', anyDesk: '' } },
      t,
    );
    expect(md).not.toContain('meta.reporter');
  });

  it('omits rows a recording has nothing to fill', () => {
    const md = buildMarkdownReport({ ...meta, kind: 'screencast', pageUrl: '', pageTitle: '' }, t);
    expect(md).not.toContain('meta.pageUrl');
    expect(tableRows(md).some((r) => /\|\s*\|/.test(r))).toBe(false);
  });
});

describe('buildMarkdownReport — escaping', () => {
  it('leaves the description verbatim — it sits above the table and cannot break it', () => {
    const md = buildMarkdownReport({ ...meta, description: 'Filter a|b breaks' }, t);
    expect(md).toContain('Filter a|b breaks');
  });

  it('escapes a pipe inside a table cell', () => {
    const md = buildMarkdownReport(
      { ...meta, environment: { ...meta.environment, userAgent: 'UA|with|pipes' } },
      t,
    );
    expect(md).toContain('| meta.userAgent | `UA\\|with\\|pipes` |');
  });

  it('folds a newline inside a table cell into a space', () => {
    const md = buildMarkdownReport(
      {
        ...meta,
        reporter: { customerNo: '', company: 'ACME\nLtd', firstName: '', lastName: '', anyDesk: '' },
      },
      t,
    );
    expect(md).toContain('| meta.reporter | ACME Ltd |');
  });
});

describe('buildMarkdownReport — sticky notes', () => {
  it('lists the notes with the numbers they carry on the image', () => {
    const md = buildMarkdownReport(
      { ...meta, notes: [{ index: 1, text: 'Total is negative' }, { index: 2, text: 'Missing\nseparator' }] },
      t,
    );
    expect(md).toContain('### meta.notes\n\n1. Total is negative\n2. Missing separator\n');
  });

  it('omits the section when there are no notes', () => {
    expect(buildMarkdownReport(meta, t)).not.toContain('meta.notes');
  });
});

describe('buildMarkdownReport — console errors', () => {
  it('puts the errors in a fenced block with their timestamps', () => {
    expect(buildMarkdownReport(meta, t)).toContain(
      '### meta.consoleErrors\n\n```text\n[2026-07-24T14:31:00.000Z] TypeError: x is undefined\n```',
    );
  });

  it('keeps only the last ten, matching the email body', () => {
    const consoleErrors = Array.from({ length: 15 }, (_, i) => ({
      message: `error ${i}`,
      at: '2026-07-24T14:31:00.000Z',
    }));
    const md = buildMarkdownReport({ ...meta, consoleErrors }, t);
    expect(md).not.toContain('error 4');
    expect(md).toContain('error 5');
    expect(md).toContain('error 14');
  });

  it('widens the fence when a message contains backticks, so the block cannot be broken', () => {
    const md = buildMarkdownReport(
      { ...meta, consoleErrors: [{ message: 'bad ``` fence', at: '2026-07-24T14:31:00.000Z' }] },
      t,
    );
    expect(md).toContain('````text\n[2026-07-24T14:31:00.000Z] bad ``` fence\n````');
  });

  it('omits the section when the page reported no errors', () => {
    expect(buildMarkdownReport({ ...meta, consoleErrors: [] }, t)).not.toContain('meta.consoleErrors');
  });
});

describe('buildMarkdownReport — files', () => {
  it('lists the saved files and repeats the attach reminder', () => {
    const md = buildMarkdownReport(meta, t);
    expect(md).toContain('### markdown.files\n\n- `UsrHelper/a.png`\n- `UsrHelper/a.json`\n');
    expect(md.trimEnd().endsWith('Attach: UsrHelper/a.png, UsrHelper/a.json')).toBe(true);
  });

  it('omits the section when nothing was saved', () => {
    expect(buildMarkdownReport({ ...meta, files: [] }, t)).not.toContain('markdown.files');
  });
});

describe('buildMarkdownReport — click path', () => {
  it('leaves the click path out, as the email does — it is on the image and in the json', () => {
    const md = buildMarkdownReport(
      { ...meta, clickPath: [{ x: 10, y: 20, scrollX: 0, scrollY: 0, button: 'left', at: '2026-07-24T14:31:00.000Z' }] },
      t,
    );
    expect(md).not.toContain('meta.clickPath');
  });
});
