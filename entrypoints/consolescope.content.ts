/**
 * Gate for the MAIN-world `console.error` wrapper.
 *
 * Runs in the isolated world (the only one with chrome.storage access) at
 * document_start and tells errors.content.ts to install its wrapper only when
 * the page belongs to a domain configured in the active project profile.
 * Without that signal the extension never enters the page's call stack, so
 * third-party error telemetry cannot report its ID.
 */
import { isDomainAllowed } from '@/lib/domainScope';
import { getActiveProfile } from '@/lib/storage';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  async main() {
    const enable = () => window.dispatchEvent(new CustomEvent('usrhelper:enableconsolecapture'));
    let allowed = false;
    // Registered before the storage read, so a MAIN-world script that loads late
    // still gets the decision. Installing the wrapper is idempotent, so a second
    // enable event is harmless.
    window.addEventListener('usrhelper:consoleready', () => {
      if (allowed) enable();
    });
    try {
      const profile = await getActiveProfile();
      allowed = isDomainAllowed(location.hostname, profile.domains ?? []);
      if (allowed) enable();
    } catch {
      // Never break the host page; without the signal nothing is installed.
    }
  },
});
