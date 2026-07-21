/**
 * Decides where the MAIN-world `console.error` wrapper may be installed.
 *
 * The wrapper is a frame in the call stack of every `console.error` on the page,
 * so pages with error telemetry report the extension's ID to their servers. It
 * is therefore limited to the domains the user configured for the project; see
 * docs/superpowers/specs/2026-07-21-console-capture-scope-design.md.
 */

/** Rejects entries that would put the wrapper back on every site. */
function isTooBroad(domain: string): boolean {
  if (!domain) return true;
  const bare = domain.startsWith('*.') ? domain.slice(2) : domain;
  // A single label matches a whole TLD ("com") — except localhost, which is a
  // developer's everyday target and matches exactly one host.
  return !bare || (bare !== 'localhost' && !bare.includes('.'));
}

/** Normalizes one user-typed entry: `https://App.Example.com/login` → `app.example.com`. */
function normalize(entry: string): string {
  return entry
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .split('/')[0]
    .split(':')[0];
}

/** Parses the comma/newline separated list from the settings field. */
export function parseDomainList(input: string): string[] {
  return input
    .split(/[,\n]/)
    .map(normalize)
    .filter((d) => !isTooBroad(d));
}

/** True when the page's hostname is covered by one of the configured domains. */
export function isDomainAllowed(hostname: string, patterns: string[]): boolean {
  const host = normalize(hostname);
  return patterns.some((raw) => {
    const pattern = raw.trim().toLowerCase();
    if (isTooBroad(pattern)) return false;
    if (pattern.startsWith('*.')) {
      const base = pattern.slice(2);
      return host === base || host.endsWith(`.${base}`);
    }
    return host === pattern;
  });
}
