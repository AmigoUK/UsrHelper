import type { ClickPathEntry, ConsoleErrorEntry, Settings } from './types';

interface CapturedContext {
  clickPath: ClickPathEntry[];
  consoleErrors: ConsoleErrorEntry[];
}

/**
 * Applies the privacy toggles to the context captured alongside a screenshot.
 * Whatever this drops never reaches the companion .json or the email body.
 * Settings that have not loaded yet are treated as "collect nothing".
 */
export function filterReportContext(
  settings: Pick<Settings, 'trackClickPath' | 'captureConsoleErrors'> | null | undefined,
  record: CapturedContext,
): CapturedContext {
  return {
    clickPath: settings?.trackClickPath ? [...record.clickPath] : [],
    consoleErrors: settings?.captureConsoleErrors ? [...record.consoleErrors] : [],
  };
}
