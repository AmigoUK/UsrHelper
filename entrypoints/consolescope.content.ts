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
    try {
      const profile = await getActiveProfile();
      if (!isDomainAllowed(location.hostname, profile.domains ?? [])) return;
      window.dispatchEvent(new CustomEvent('usrhelper:enableconsolecapture'));
    } catch {
      // Never break the host page; without the signal nothing is installed.
    }
  },
});
