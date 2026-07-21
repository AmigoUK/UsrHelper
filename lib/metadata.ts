import { describeArchitecture, describeBrowser, describePlatform, type UaHints } from './environment';
import type { EnvironmentInfo } from './types';

/** Not in TypeScript's DOM lib yet; only the parts this module uses. */
interface NavigatorUAData {
  platform: string;
  getHighEntropyValues(hints: string[]): Promise<UaHints>;
}

/**
 * navigator.platform and the UA string are deliberately inaccurate ("MacIntel"
 * on Apple Silicon, macOS frozen at 10_15_7, browser version reduced), so the
 * high-entropy Client Hints are read first and those values are only a fallback.
 */
async function readHints(): Promise<UaHints | null> {
  const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData;
  if (!uaData?.getHighEntropyValues) return null;
  try {
    const hints = await uaData.getHighEntropyValues(['architecture', 'bitness', 'platformVersion', 'fullVersionList']);
    return { ...hints, platform: uaData.platform };
  } catch {
    return null;
  }
}

/** Collects environment info from the current (extension page) context. */
export async function collectEnvironment(): Promise<EnvironmentInfo> {
  const hints = await readHints();
  return {
    userAgent: navigator.userAgent,
    platform: describePlatform(hints, navigator.platform),
    architecture: describeArchitecture(hints),
    browser: describeBrowser(hints, navigator.userAgent),
    language: navigator.language,
    screenResolution: `${screen.width}x${screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    devicePixelRatio: window.devicePixelRatio,
  };
}

export function extensionVersion(): string {
  return chrome.runtime.getManifest().version;
}
