import { describe, expect, it } from 'vitest';
import { filterReportContext } from '../lib/reportContext';

const record = {
  clickPath: [{ x: 1, y: 2, scrollX: 0, scrollY: 0, button: 'left' as const, at: '2026-07-21T10:00:00.000Z' }],
  consoleErrors: [{ message: 'boom', at: '2026-07-21T10:00:01.000Z' }],
};

describe('filterReportContext', () => {
  it('includes both when both toggles are on', () => {
    const out = filterReportContext({ trackClickPath: true, captureConsoleErrors: true }, record);
    expect(out.clickPath).toHaveLength(1);
    expect(out.consoleErrors).toHaveLength(1);
  });

  it('drops the click path when tracking is off', () => {
    const out = filterReportContext({ trackClickPath: false, captureConsoleErrors: true }, record);
    expect(out.clickPath).toEqual([]);
    expect(out.consoleErrors).toHaveLength(1);
  });

  it('drops console errors when capture is off', () => {
    const out = filterReportContext({ trackClickPath: true, captureConsoleErrors: false }, record);
    expect(out.clickPath).toHaveLength(1);
    expect(out.consoleErrors).toEqual([]);
  });

  it('drops both when both toggles are off', () => {
    const out = filterReportContext({ trackClickPath: false, captureConsoleErrors: false }, record);
    expect(out).toEqual({ clickPath: [], consoleErrors: [] });
  });

  it('drops both when settings have not loaded yet', () => {
    expect(filterReportContext(null, record)).toEqual({ clickPath: [], consoleErrors: [] });
  });

  it('does not hand out the record’s own arrays', () => {
    const out = filterReportContext({ trackClickPath: true, captureConsoleErrors: true }, record);
    expect(out.clickPath).not.toBe(record.clickPath);
    expect(out.consoleErrors).not.toBe(record.consoleErrors);
  });
});
