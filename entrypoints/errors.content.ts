/**
 * Runs in the page's MAIN world (isolated worlds do not receive the page's
 * uncaught-error events) and relays errors to the isolated content script
 * via CustomEvents.
 */
export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    const relay = (message: unknown, source?: string) => {
      try {
        window.dispatchEvent(
          new CustomEvent('usrhelper:consoleerror', {
            detail: { message: String(message).slice(0, 500), source },
          }),
        );
      } catch {
        // Never break the host page.
      }
    };
    window.addEventListener('error', (e) =>
      relay(e.message, e.filename ? `${e.filename}:${e.lineno}` : undefined),
    );
    window.addEventListener('unhandledrejection', (e) =>
      relay(`Unhandled rejection: ${String(e.reason)}`),
    );
    // Wrapping console.error puts this script into the call stack of every
    // console.error on the page, and sites with error telemetry ship that frame
    // to their servers. So it is installed only after consolescope.content.ts
    // confirms the page belongs to a configured project domain.
    let wrapped = false;
    const installConsoleWrapper = () => {
      if (wrapped) return;
      wrapped = true;
      const original = console.error;
      console.error = (...args: unknown[]) => {
        relay(
          args
            .map((a) => {
              if (typeof a === 'string') return a;
              try {
                return JSON.stringify(a);
              } catch {
                return String(a);
              }
            })
            .join(' '),
        );
        original.apply(console, args);
      };
    };
    window.addEventListener('usrhelper:enableconsolecapture', installConsoleWrapper);
  },
});
