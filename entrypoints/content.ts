import type { ContentMessage, OverlayOptions, PageContext, PageInfo, RegionRect } from '@/lib/messages';
import { startRecordingOverlay, stopRecordingOverlay } from '@/lib/recordingOverlay';
import type { ClickPathEntry, ConsoleErrorEntry } from '@/lib/types';

const CLICK_BUFFER_SIZE = 10;
const CONSOLE_BUFFER_SIZE = 20;

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    // Guard against double injection (registered script + programmatic).
    const w = window as unknown as { __usrHelperLoaded?: boolean };
    if (w.__usrHelperLoaded) return;
    w.__usrHelperLoaded = true;

    const clickPath: ClickPathEntry[] = [];
    const consoleErrors: ConsoleErrorEntry[] = [];
    const hiddenElements: { el: HTMLElement; visibility: string }[] = [];

    // --- Click path buffer -------------------------------------------------
    window.addEventListener(
      'mousedown',
      (e) => {
        clickPath.push({
          x: e.clientX,
          y: e.clientY,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          button: e.button === 2 ? 'right' : e.button === 1 ? 'middle' : 'left',
          at: new Date().toISOString(),
        });
        if (clickPath.length > CLICK_BUFFER_SIZE) clickPath.shift();
      },
      true,
    );

    // --- Console error capture --------------------------------------------
    const pushError = (message: string, source?: string) => {
      consoleErrors.push({ message: message.slice(0, 500), source, at: new Date().toISOString() });
      if (consoleErrors.length > CONSOLE_BUFFER_SIZE) consoleErrors.shift();
    };
    window.addEventListener('error', (e) => {
      pushError(e.message, e.filename ? `${e.filename}:${e.lineno}` : undefined);
    });
    window.addEventListener('unhandledrejection', (e) => {
      pushError(`Unhandled rejection: ${String(e.reason)}`);
    });

    // --- Message handlers ---------------------------------------------------
    chrome.runtime.onMessage.addListener((message: ContentMessage, _sender, sendResponse) => {
      switch (message.type) {
        case 'page:info': {
          const info: PageInfo = {
            pageHeight: Math.max(
              document.documentElement.scrollHeight,
              document.body?.scrollHeight ?? 0,
            ),
            viewportHeight: window.innerHeight,
            viewportWidth: window.innerWidth,
            devicePixelRatio: window.devicePixelRatio,
          };
          sendResponse(info);
          break;
        }
        case 'page:scrollTo': {
          window.scrollTo({ top: message.y, behavior: 'instant' as ScrollBehavior });
          sendResponse({ y: window.scrollY });
          break;
        }
        case 'page:prepare': {
          hideStickyElements(hiddenElements);
          sendResponse({ ok: true });
          break;
        }
        case 'page:restore': {
          for (const { el, visibility } of hiddenElements.splice(0)) {
            el.style.visibility = visibility;
          }
          sendResponse({ ok: true });
          break;
        }
        case 'context:collect': {
          const context: PageContext = { clickPath: [...clickPath], consoleErrors: [...consoleErrors] };
          sendResponse(context);
          break;
        }
        case 'region:select': {
          startRegionSelection();
          sendResponse({ ok: true });
          break;
        }
        case 'recording:overlay': {
          if (message.enabled) {
            startRecordingOverlay(
              message.options ?? { ripples: true, keystrokes: true, timestamp: true },
            );
          } else {
            stopRecordingOverlay();
          }
          sendResponse({ ok: true });
          break;
        }
      }
      return false;
    });

    // A tab opened or reloaded mid-recording asks the background whether
    // overlays should be active.
    void chrome.runtime
      .sendMessage({ type: 'recording:queryOverlay' })
      .then((state: { enabled: boolean; options?: OverlayOptions } | undefined) => {
        if (state?.enabled) {
          startRecordingOverlay(state.options ?? { ripples: true, keystrokes: true, timestamp: true });
        }
      })
      .catch(() => {});
  },
});

function hideStickyElements(store: { el: HTMLElement; visibility: string }[]): void {
  for (const el of document.querySelectorAll<HTMLElement>('body *')) {
    const position = getComputedStyle(el).position;
    if (position === 'fixed' || position === 'sticky') {
      store.push({ el, visibility: el.style.visibility });
      el.style.visibility = 'hidden';
    }
  }
}

function startRegionSelection(): void {
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;cursor:crosshair;background:rgba(0,0,0,0.25);';
  const rect = document.createElement('div');
  rect.style.cssText =
    'position:fixed;border:2px solid #2563eb;background:rgba(37,99,235,0.15);display:none;pointer-events:none;z-index:2147483647;';
  overlay.appendChild(rect);
  document.documentElement.appendChild(overlay);

  let startX = 0;
  let startY = 0;
  let dragging = false;

  const cleanup = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey, true);
  };

  const finish = (selection: RegionRect | null) => {
    cleanup();
    void chrome.runtime.sendMessage({
      type: 'region:done',
      rect: selection,
      dpr: window.devicePixelRatio,
    });
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      finish(null);
    }
  };
  document.addEventListener('keydown', onKey, true);

  overlay.addEventListener('mousedown', (e) => {
    e.preventDefault();
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    rect.style.display = 'block';
  });
  overlay.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const x = Math.min(startX, e.clientX);
    const y = Math.min(startY, e.clientY);
    rect.style.left = `${x}px`;
    rect.style.top = `${y}px`;
    rect.style.width = `${Math.abs(e.clientX - startX)}px`;
    rect.style.height = `${Math.abs(e.clientY - startY)}px`;
  });
  overlay.addEventListener('mouseup', (e) => {
    if (!dragging) return;
    dragging = false;
    finish({
      x: Math.min(startX, e.clientX),
      y: Math.min(startY, e.clientY),
      width: Math.abs(e.clientX - startX),
      height: Math.abs(e.clientY - startY),
    });
  });
}
