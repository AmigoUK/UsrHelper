import type { ClickPathEntry, ConsoleErrorEntry } from './types';

export type CaptureMode = 'visible' | 'fullpage' | 'region';

export interface RegionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageInfo {
  pageHeight: number;
  viewportHeight: number;
  viewportWidth: number;
  devicePixelRatio: number;
}

/** popup/editor/recorder → background */
export type BackgroundMessage =
  | { type: 'capture'; mode: CaptureMode }
  | { type: 'recording:overlay'; tabId: number; enabled: boolean };

/** background → content script */
export type ContentMessage =
  | { type: 'region:select' }
  | { type: 'page:info' }
  | { type: 'page:scrollTo'; y: number }
  | { type: 'page:prepare' }
  | { type: 'page:restore' }
  | { type: 'context:collect' }
  | { type: 'recording:overlay'; enabled: boolean };

export interface PageContext {
  clickPath: ClickPathEntry[];
  consoleErrors: ConsoleErrorEntry[];
}

export function sendToBackground<T = unknown>(message: BackgroundMessage): Promise<T> {
  return chrome.runtime.sendMessage(message);
}

export async function sendToTab<T = unknown>(tabId: number, message: ContentMessage): Promise<T> {
  return chrome.tabs.sendMessage(tabId, message);
}

/** True for pages where content scripts and captureVisibleTab cannot run. */
export function isRestrictedUrl(url: string | undefined): boolean {
  if (!url) return true;
  return (
    !/^https?:/.test(url) ||
    url.startsWith('https://chrome.google.com/webstore') ||
    url.startsWith('https://chromewebstore.google.com')
  );
}
