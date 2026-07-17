import { putCapture } from '@/lib/captureStore';
import type { CaptureMode, OverlayOptions, PageContext, PageInfo, RegionRect } from '@/lib/messages';
import { isRestrictedUrl, sendToTab } from '@/lib/messages';
import { stitchPlan } from '@/lib/stitch';

const CAPTURE_INTERVAL_MS = 600; // captureVisibleTab is rate-limited to ~2/s
const SCROLL_SETTLE_MS = 350;

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'capture') {
      handleCapture(message.mode as CaptureMode)
        .then(sendResponse)
        .catch((error) => sendResponse({ error: String(error) }));
      return true;
    }
    if (message?.type === 'region:done' && sender.tab?.id) {
      handleRegionDone(sender.tab.id, message.rect as RegionRect | null, message.dpr as number)
        .catch(console.error);
      sendResponse({ ok: true });
      return;
    }
    if (message?.type === 'recording:setOverlays') {
      setRecordingOverlays(message.enabled as boolean, message.options as OverlayOptions | undefined)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ error: String(error) }));
      return true;
    }
    if (message?.type === 'recording:queryOverlay') {
      chrome.storage.session
        .get('recordingOverlay')
        .then((stored) => sendResponse(stored.recordingOverlay ?? { enabled: false }));
      return true;
    }
  });
});

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await sendToTab(tabId, { type: 'page:info' });
    return;
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-scripts/content.js'],
    });
  }
}

async function collectContext(tabId: number): Promise<PageContext> {
  try {
    return await sendToTab<PageContext>(tabId, { type: 'context:collect' });
  } catch {
    return { clickPath: [], consoleErrors: [] };
  }
}

async function handleCapture(mode: CaptureMode) {
  const tab = await getActiveTab();
  if (!tab?.id || isRestrictedUrl(tab.url)) return { error: 'restricted' };
  const tabId = tab.id;

  await ensureContentScript(tabId);

  if (mode === 'region') {
    // The content script replies later with a region:done message so the
    // selection can take arbitrarily long without holding a response open.
    await sendToTab(tabId, { type: 'region:select' });
    return { pending: true };
  }

  const blob = mode === 'visible' ? await captureVisible(tab.windowId) : await captureFullPage(tabId, tab.windowId);
  await openEditor(tab, tabId, blob, mode);
  return { ok: true };
}

async function handleRegionDone(tabId: number, rect: RegionRect | null, dpr: number) {
  if (!rect || rect.width < 3 || rect.height < 3) return; // cancelled or accidental click
  const tab = await chrome.tabs.get(tabId);
  await sleep(150); // let the selection overlay disappear before capturing
  const blob = await captureVisible(tab.windowId);
  const cropped = await cropBlob(blob, {
    x: rect.x * dpr,
    y: rect.y * dpr,
    width: rect.width * dpr,
    height: rect.height * dpr,
  });
  await openEditor(tab, tabId, cropped, 'region', { x: rect.x, y: rect.y }, dpr);
}

async function captureVisible(windowId: number): Promise<Blob> {
  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
  return (await fetch(dataUrl)).blob();
}

async function cropBlob(blob: Blob, rect: RegionRect): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const width = Math.min(rect.width, bitmap.width - rect.x);
  const height = Math.min(rect.height, bitmap.height - rect.y);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, rect.x, rect.y, width, height, 0, 0, width, height);
  return canvas.convertToBlob({ type: 'image/png' });
}

async function captureFullPage(tabId: number, windowId: number): Promise<Blob> {
  const info = await sendToTab<PageInfo>(tabId, { type: 'page:info' });
  const dpr = info.devicePixelRatio;
  const plan = stitchPlan(info.pageHeight, info.viewportHeight);

  const canvas = new OffscreenCanvas(
    Math.round(info.viewportWidth * dpr),
    Math.round((plan[plan.length - 1].drawY + plan[plan.length - 1].height) * dpr),
  );
  const ctx = canvas.getContext('2d')!;

  try {
    for (let i = 0; i < plan.length; i++) {
      const segment = plan[i];
      await sendToTab(tabId, { type: 'page:scrollTo', y: segment.scrollY });
      await sleep(i === 0 ? SCROLL_SETTLE_MS : Math.max(SCROLL_SETTLE_MS, CAPTURE_INTERVAL_MS));
      const bitmap = await createImageBitmap(await captureVisible(windowId));
      if (i === 0 && plan.length > 1) {
        // The top segment keeps sticky/fixed elements; hide them for the
        // remaining segments so they appear once instead of on every slice.
        await sendToTab(tabId, { type: 'page:prepare' });
      }
      const usedCss = segment.height;
      const srcY = bitmap.height - Math.round(usedCss * dpr);
      ctx.drawImage(
        bitmap,
        0,
        srcY,
        bitmap.width,
        Math.round(usedCss * dpr),
        0,
        Math.round(segment.drawY * dpr),
        canvas.width,
        Math.round(usedCss * dpr),
      );
    }
  } finally {
    await sendToTab(tabId, { type: 'page:restore' }).catch(() => {});
    await sendToTab(tabId, { type: 'page:scrollTo', y: 0 }).catch(() => {});
  }

  return canvas.convertToBlob({ type: 'image/png' });
}

async function openEditor(
  tab: chrome.tabs.Tab,
  tabId: number,
  blob: Blob,
  mode: CaptureMode,
  regionOrigin?: { x: number; y: number },
  dpr?: number,
): Promise<void> {
  const context = await collectContext(tabId);
  let devicePixelRatio = dpr ?? 1;
  if (!dpr) {
    try {
      const info = await sendToTab<PageInfo>(tabId, { type: 'page:info' });
      devicePixelRatio = info.devicePixelRatio;
    } catch {
      devicePixelRatio = 1;
    }
  }
  const id = crypto.randomUUID();
  await putCapture({
    id,
    blob,
    pageUrl: tab.url ?? '',
    pageTitle: tab.title ?? '',
    capturedAt: new Date().toISOString(),
    clickPath: context.clickPath,
    consoleErrors: context.consoleErrors,
    mode,
    regionOrigin,
    devicePixelRatio,
  });
  await chrome.tabs.create({ url: chrome.runtime.getURL(`/editor.html?id=${id}`) });
}

/** Enables/disables recording overlays on every open http(s) tab. */
async function setRecordingOverlays(enabled: boolean, options?: OverlayOptions): Promise<void> {
  await chrome.storage.session.set({ recordingOverlay: { enabled, options } });
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  await Promise.allSettled(
    tabs.map(async (tab) => {
      if (!tab.id) return;
      await ensureContentScript(tab.id);
      await sendToTab(tab.id, { type: 'recording:overlay', enabled, options });
    }),
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
