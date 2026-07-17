import type { OverlayOptions } from './messages';

/**
 * On-page overlays shown while a screencast is being recorded: click ripples,
 * pressed-key captions, and a live timestamp clock. Everything lives under one
 * container so it can be torn down in one call.
 */

const CONTAINER_ID = 'usrhelper-recording-overlay';
let container: HTMLDivElement | null = null;
let clockTimer: number | undefined;
let detachers: (() => void)[] = [];

export function startRecordingOverlay(options: OverlayOptions): void {
  stopRecordingOverlay();
  container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483646;';
  injectStyles(container);
  document.documentElement.appendChild(container);

  if (options.ripples) attachRipples();
  if (options.keystrokes) attachKeyCaptions();
  if (options.timestamp) attachClock();
}

export function stopRecordingOverlay(): void {
  for (const detach of detachers.splice(0)) detach();
  if (clockTimer !== undefined) {
    clearInterval(clockTimer);
    clockTimer = undefined;
  }
  container?.remove();
  container = null;
}

export function isOverlayActive(): boolean {
  return container !== null;
}

function injectStyles(root: HTMLElement): void {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes usrhelper-ripple {
      0% { transform: scale(0.3); opacity: 0.9; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    .usrhelper-ripple {
      position: fixed;
      width: 44px;
      height: 44px;
      margin: -22px 0 0 -22px;
      border-radius: 50%;
      border: 3px solid #facc15;
      background: rgba(250, 204, 21, 0.25);
      animation: usrhelper-ripple 0.6s ease-out forwards;
      pointer-events: none;
    }
    .usrhelper-ripple.right { border-color: #38bdf8; background: rgba(56, 189, 248, 0.25); }
    .usrhelper-captions {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
      pointer-events: none;
    }
    .usrhelper-caption {
      background: rgba(15, 23, 42, 0.85);
      color: #f8fafc;
      font: 600 15px/1 system-ui, sans-serif;
      padding: 9px 14px;
      border-radius: 8px;
      transition: opacity 0.3s;
    }
    .usrhelper-clock {
      position: fixed;
      bottom: 10px;
      right: 12px;
      background: rgba(15, 23, 42, 0.75);
      color: #f8fafc;
      font: 12px/1 ui-monospace, monospace;
      padding: 5px 8px;
      border-radius: 6px;
      pointer-events: none;
    }
  `;
  root.appendChild(style);
}

function attachRipples(): void {
  const onMouseDown = (e: MouseEvent) => {
    if (!container) return;
    const ripple = document.createElement('div');
    ripple.className = `usrhelper-ripple${e.button === 2 ? ' right' : ''}`;
    ripple.style.left = `${e.clientX}px`;
    ripple.style.top = `${e.clientY}px`;
    container.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  };
  window.addEventListener('mousedown', onMouseDown, true);
  detachers.push(() => window.removeEventListener('mousedown', onMouseDown, true));
}

function attachKeyCaptions(): void {
  const bar = document.createElement('div');
  bar.className = 'usrhelper-captions';
  container!.appendChild(bar);

  const show = (label: string) => {
    const caption = document.createElement('div');
    caption.className = 'usrhelper-caption';
    caption.textContent = label;
    bar.appendChild(caption);
    while (bar.children.length > 4) bar.firstElementChild?.remove();
    setTimeout(() => {
      caption.style.opacity = '0';
      setTimeout(() => caption.remove(), 350);
    }, 1400);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const label = keyLabel(e);
    if (label) show(label);
  };
  const onMouseDown = (e: MouseEvent) => {
    if (e.button === 2) show('Right click');
    else if (e.button === 1) show('Middle click');
  };
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('mousedown', onMouseDown, true);
  detachers.push(() => {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('mousedown', onMouseDown, true);
  });
}

/** Combos and special keys only — plain typing is not captioned (privacy + noise). */
export function keyLabel(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'metaKey' | 'shiftKey'>): string | null {
  const special: Record<string, string> = {
    Enter: 'Enter',
    Escape: 'Esc',
    Tab: 'Tab',
    Backspace: 'Backspace',
    Delete: 'Del',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    PageUp: 'PgUp',
    PageDown: 'PgDn',
    Home: 'Home',
    End: 'End',
    F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5', F6: 'F6',
    F7: 'F7', F8: 'F8', F9: 'F9', F10: 'F10', F11: 'F11', F12: 'F12',
  };
  const modifiers: string[] = [];
  if (e.ctrlKey) modifiers.push('Ctrl');
  if (e.altKey) modifiers.push('Alt');
  if (e.metaKey) modifiers.push('Meta');
  if (e.shiftKey && (modifiers.length > 0 || special[e.key])) modifiers.push('Shift');

  if (['Control', 'Alt', 'Meta', 'Shift'].includes(e.key)) return null;

  const keyName = special[e.key] ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key);
  if (modifiers.length > 0) return `${modifiers.join(' + ')} + ${keyName}`;
  return special[e.key] ?? null;
}

function attachClock(): void {
  const clock = document.createElement('div');
  clock.className = 'usrhelper-clock';
  const tick = () => {
    clock.textContent = new Date().toLocaleString();
  };
  tick();
  clockTimer = window.setInterval(tick, 1000);
  container!.appendChild(clock);
}
