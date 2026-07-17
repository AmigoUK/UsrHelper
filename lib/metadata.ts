import type { EnvironmentInfo } from './types';

/** Collects environment info from the current (extension page) context. */
export function collectEnvironment(): EnvironmentInfo {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenResolution: `${screen.width}x${screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    devicePixelRatio: window.devicePixelRatio,
  };
}

export function extensionVersion(): string {
  return chrome.runtime.getManifest().version;
}
