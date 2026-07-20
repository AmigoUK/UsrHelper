/**
 * Wraps annotation text to a maximum pixel width. Explicit newlines are
 * preserved; words longer than the limit are hard-broken. measure() returns
 * the pixel width of a string (canvas measureText in production, a simple
 * estimator in tests).
 */
export function wrapText(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    if (measure(paragraph) <= maxWidth || paragraph === '') {
      lines.push(paragraph);
      continue;
    }
    let current = '';
    for (const word of paragraph.split(' ')) {
      const candidate = current === '' ? word : `${current} ${word}`;
      if (measure(candidate) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current !== '') lines.push(current);
      if (measure(word) <= maxWidth) {
        current = word;
        continue;
      }
      // Hard-break an overlong word.
      let chunk = '';
      for (const ch of word) {
        if (measure(chunk + ch) > maxWidth && chunk !== '') {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      current = chunk;
    }
    if (current !== '') lines.push(current);
  }
  return lines;
}
