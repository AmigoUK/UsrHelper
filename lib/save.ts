import { buildDownloadPath } from './filenames';

export interface SavedFile {
  /** Path relative to Downloads/. */
  path: string;
  downloadId: number;
}

/**
 * Saves a blob into Downloads/<subfolder>/<filename> via chrome.downloads.
 * Must be called from an extension page (popup/editor/recorder), where
 * URL.createObjectURL is available.
 */
export async function saveBlob(blob: Blob, subfolder: string, filename: string): Promise<SavedFile> {
  const path = buildDownloadPath(subfolder, filename);
  const url = URL.createObjectURL(blob);
  try {
    const downloadId = await chrome.downloads.download({
      url,
      filename: path,
      saveAs: false,
      conflictAction: 'uniquify',
    });
    await waitForDownload(downloadId);
    return { path, downloadId };
  } finally {
    // Give Chrome a moment to open the stream before revoking.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

function waitForDownload(downloadId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const listener = (delta: chrome.downloads.DownloadDelta) => {
      if (delta.id !== downloadId || !delta.state) return;
      if (delta.state.current === 'complete') {
        chrome.downloads.onChanged.removeListener(listener);
        resolve();
      } else if (delta.state.current === 'interrupted') {
        chrome.downloads.onChanged.removeListener(listener);
        reject(new Error('Download interrupted'));
      }
    };
    chrome.downloads.onChanged.addListener(listener);
  });
}

export function saveJson(data: unknown, subfolder: string, filename: string): Promise<SavedFile> {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  return saveBlob(blob, subfolder, filename);
}

/** Opens the platform file manager with the saved file selected. */
export function showFile(downloadId: number): void {
  chrome.downloads.show(downloadId);
}
