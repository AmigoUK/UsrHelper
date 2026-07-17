import type { ClickPathEntry, ConsoleErrorEntry } from './types';

/**
 * IndexedDB store for captured images and page context, shared between the
 * background service worker (writer) and the editor page (reader) — both run
 * on the extension origin. Blobs are too large for chrome.storage.
 */

const DB_NAME = 'usrhelper';
const STORE = 'captures';
const DB_VERSION = 1;

export interface CaptureRecord {
  id: string;
  blob: Blob;
  pageUrl: string;
  pageTitle: string;
  capturedAt: string; // ISO
  clickPath: ClickPathEntry[];
  consoleErrors: ConsoleErrorEntry[];
  mode: 'visible' | 'fullpage' | 'region';
  /** Region origin in CSS px (region mode only). */
  regionOrigin?: { x: number; y: number };
  devicePixelRatio: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putCapture(record: CaptureRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getCapture(id: string): Promise<CaptureRecord | undefined> {
  const db = await openDb();
  const record = await new Promise<CaptureRecord | undefined>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result as CaptureRecord | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return record;
}

export async function deleteCapture(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
