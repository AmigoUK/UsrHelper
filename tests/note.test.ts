import { describe, expect, it } from 'vitest';
import type { Annotation } from '../lib/annotations/model';
import { collectNotes, layoutNote, noteBoxWidth, noteFontSize } from '../lib/annotations/note';

/** Rough stand-in for ctx.measureText; the real renderer passes the canvas one. */
const estimate = (font: number) => (s: string) => s.length * font * 0.55;

const note = (id: string, text: string): Annotation => ({
  id,
  kind: 'note',
  x: 10,
  y: 10,
  text,
  color: '#fde68a',
  size: 4,
});

describe('noteFontSize', () => {
  it('keeps a region crop readable instead of shrinking to nothing', () => {
    // 1.1% of 240px would be 2.6px.
    expect(noteFontSize(240)).toBe(12);
  });

  it('scales with a window-sized capture', () => {
    expect(noteFontSize(1280)).toBeCloseTo(14.08, 2);
  });

  it('scales with a retina capture, which is displayed at half size', () => {
    expect(noteFontSize(2560)).toBeCloseTo(28.16, 2);
  });

  it('has no upper cap, so 4K captures do not get relatively tiny notes', () => {
    expect(noteFontSize(3840)).toBeCloseTo(42.24, 2);
  });
});

describe('noteBoxWidth', () => {
  it('uses the proportion on a normal capture', () => {
    expect(noteBoxWidth(1280)).toBeCloseTo(281.6, 1);
  });

  it('applies the floor on a small crop', () => {
    expect(noteBoxWidth(240)).toBe(150);
  });

  it('never exceeds the image, even when the floor would', () => {
    expect(noteBoxWidth(120)).toBe(96); // 120 - 2 * 12 margin
  });
});

describe('layoutNote', () => {
  const text = 'This button does nothing when clicked and logs no error.';

  it('wraps the text inside the box', () => {
    const layout = layoutNote(text, 1280, estimate(noteFontSize(1280)));
    expect(layout.lines.length).toBeGreaterThan(1);
    const maxLine = Math.max(...layout.lines.map(estimate(layout.font)));
    expect(maxLine).toBeLessThanOrEqual(layout.width - layout.padding * 2);
  });

  it('keeps explicit newlines the user typed', () => {
    const layout = layoutNote('first\nsecond', 1280, estimate(noteFontSize(1280)));
    expect(layout.lines).toEqual(['first', 'second']);
  });

  it('grows in height with the number of lines', () => {
    const one = layoutNote('short', 1280, estimate(noteFontSize(1280)));
    const many = layoutNote(text, 1280, estimate(noteFontSize(1280)));
    expect(many.height).toBeGreaterThan(one.height);
    expect(one.height).toBeCloseTo(one.header + one.padding * 2 + one.lineHeight, 5);
  });

  it('hard-breaks a word that cannot fit on any line', () => {
    const layout = layoutNote('x'.repeat(400), 1280, estimate(noteFontSize(1280)));
    expect(layout.lines.length).toBeGreaterThan(1);
    expect(layout.lines.join('')).toBe('x'.repeat(400));
  });

  it('reserves a header strip for the index badge', () => {
    const layout = layoutNote('short', 1280, estimate(noteFontSize(1280)));
    expect(layout.header).toBeGreaterThan(0);
  });
});

describe('collectNotes', () => {
  it('numbers notes from one, in creation order', () => {
    expect(collectNotes([note('a', 'first'), note('b', 'second')])).toEqual([
      { index: 1, text: 'first' },
      { index: 2, text: 'second' },
    ]);
  });

  it('renumbers after a note in the middle is removed', () => {
    const all = [note('a', 'first'), note('b', 'second'), note('c', 'third')];
    const afterDelete = all.filter((a) => a.id !== 'b');
    expect(collectNotes(afterDelete)).toEqual([
      { index: 1, text: 'first' },
      { index: 2, text: 'third' },
    ]);
  });

  it('ignores other annotation kinds, including step markers', () => {
    const mixed: Annotation[] = [
      { id: 's1', kind: 'step', x: 0, y: 0, n: 1, color: '#ef4444', size: 4 },
      note('a', 'only note'),
      { id: 's2', kind: 'step', x: 0, y: 0, n: 2, color: '#ef4444', size: 4 },
    ];
    expect(collectNotes(mixed)).toEqual([{ index: 1, text: 'only note' }]);
  });

  it('is empty when there are no notes', () => {
    expect(collectNotes([])).toEqual([]);
  });
});
