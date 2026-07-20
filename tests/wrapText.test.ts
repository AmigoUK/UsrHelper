import { describe, expect, it } from 'vitest';
import { wrapText } from '../lib/annotations/wrapText';

// 10 px per character estimator.
const measure = (s: string) => s.length * 10;

describe('wrapText', () => {
  it('keeps short lines untouched', () => {
    expect(wrapText('hello', 100, measure)).toEqual(['hello']);
  });

  it('preserves explicit newlines', () => {
    expect(wrapText('a\nb', 100, measure)).toEqual(['a', 'b']);
  });

  it('wraps at word boundaries', () => {
    expect(wrapText('one two three four', 80, measure)).toEqual(['one two', 'three', 'four']);
  });

  it('hard-breaks words longer than the limit', () => {
    expect(wrapText('abcdefghijkl', 50, measure)).toEqual(['abcde', 'fghij', 'kl']);
  });

  it('never produces a line wider than the limit', () => {
    const lines = wrapText('lorem ipsum dolor sit amet consectetur adipiscing elit sed do', 70, measure);
    for (const line of lines) expect(measure(line)).toBeLessThanOrEqual(70);
  });
});
