const PREFIX = 'UsrHelper';
const DEFAULT_SUBFOLDER = 'UsrHelper';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local-time timestamp: YYYY-MM-DD_HH-MM-SS */
export function formatTimestamp(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
  );
}

export function buildBaseName(date: Date): string {
  return `${PREFIX}_${formatTimestamp(date)}`;
}

export function screenshotFilename(base: string): string {
  return `${base}.png`;
}

export function companionFilename(base: string): string {
  return `${base}.json`;
}

export function clipFilename(base: string, index: number): string {
  return `${base}_part-${pad(index)}.webm`;
}

/**
 * Keeps only characters legal in chrome.downloads relative paths and removes
 * path-escape attempts. Falls back to the default subfolder when nothing is left.
 */
export function sanitizeSubfolder(input: string): string {
  const illegal = /[<>:"|?*\x00-\x1f]/g;
  const cleaned = input
    .trim()
    .replaceAll('\\', '/')
    .replace(illegal, '')
    .split('/')
    .map((segment) => segment.trim().replace(/^\.+$/, ''))
    .filter((segment) => segment.length > 0)
    .join('/');
  return cleaned.length > 0 ? cleaned : DEFAULT_SUBFOLDER;
}

export function buildDownloadPath(subfolder: string, filename: string): string {
  return `${sanitizeSubfolder(subfolder)}/${filename}`;
}
