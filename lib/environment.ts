/**
 * Turns User-Agent Client Hints into the strings that go into a report.
 *
 * The legacy signals lie by design: `navigator.platform` returns "MacIntel"
 * even on Apple Silicon, the UA string freezes macOS at 10_15_7, and the Chrome
 * version in it is reduced to `<major>.0.0.0`. Client Hints carry the real
 * values, so a developer reading the report sees the machine that filed it.
 */

export interface UaBrand {
  brand: string;
  version: string;
}

export interface UaHints {
  platform?: string;
  platformVersion?: string;
  architecture?: string;
  bitness?: string;
  fullVersionList?: UaBrand[];
}

/** Chromium pads its brand list with a randomised entry that must be ignored. */
const isGreasedBrand = (brand: string): boolean => !/^(google chrome|chromium|microsoft edge|opera|brave)$/i.test(brand);

/** "macOS 15.3.0", "Windows 11" — falls back to the legacy navigator.platform. */
export function describePlatform(hints: UaHints | null | undefined, fallback: string): string {
  const platform = hints?.platform;
  if (!platform) return fallback;
  const version = hints?.platformVersion ?? '';
  if (!version) return platform;
  if (platform === 'Windows') {
    // Windows reports a compatibility version, not the marketing name:
    // 1–12 is Windows 10, 13 and above is Windows 11.
    const major = Number.parseInt(version.split('.')[0] ?? '', 10);
    if (Number.isFinite(major)) return major >= 13 ? 'Windows 11' : 'Windows 10';
  }
  return `${platform} ${version}`;
}

/** "arm64", "x86-64" — empty when the browser reports nothing. */
export function describeArchitecture(hints: UaHints | null | undefined): string {
  const architecture = hints?.architecture;
  if (!architecture) return '';
  const bitness = hints?.bitness;
  if (!bitness) return architecture;
  return architecture === 'x86' ? `x86-${bitness}` : `${architecture}${bitness}`;
}

/** "Google Chrome 150.0.7827.55" — the UA string only carries `<major>.0.0.0`. */
export function describeBrowser(hints: UaHints | null | undefined, userAgent: string): string {
  const brands = (hints?.fullVersionList ?? []).filter((b) => !isGreasedBrand(b.brand));
  const chosen = brands.find((b) => /^google chrome$/i.test(b.brand)) ?? brands[0];
  if (chosen) return `${chosen.brand} ${chosen.version}`;
  const match = /Chrome\/([\d.]+)/.exec(userAgent);
  return match ? `Chrome ${match[1]}` : '';
}
