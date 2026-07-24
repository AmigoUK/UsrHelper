/**
 * Writes text to the clipboard from an extension page.
 *
 * No `clipboardWrite` permission is involved: that permission covers
 * `document.execCommand` in contexts without a document, while the editor and
 * the recorder are ordinary focused pages the async Clipboard API serves
 * directly. The write can still be refused — a page that lost focus, or an
 * enterprise policy — so the caller is told rather than left guessing.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Clipboard write refused', err);
    return false;
  }
}
