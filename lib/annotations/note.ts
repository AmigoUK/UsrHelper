import type { Annotation, NoteAnnotation } from './model';
import { wrapText } from './wrapText';

/** Paper colour of every sticky note; the colour palette does not apply to them. */
export const NOTE_PAPER = '#fde68a';
/** Ink colour — near-black on yellow, for contrast at small sizes. */
export const NOTE_INK = '#1c1917';
/** The glued edge along the top, which also carries the index badge. */
export const NOTE_EDGE = '#fcd34d';

const FONT_RATIO = 0.011;
/** Below this a note stops being readable, whatever the image size. */
const MIN_FONT = 12;
const WIDTH_RATIO = 0.22;
const MIN_WIDTH = 150;
const IMAGE_MARGIN = 12;

/**
 * Font size for a note on an image this wide: proportional, with a floor.
 * A plain proportion collapses to 2.6px on a 240px region crop; there is no
 * upper cap, because above retina width the proportion is the right answer.
 */
export function noteFontSize(imageWidth: number): number {
  return Math.max(MIN_FONT, imageWidth * FONT_RATIO);
}

/** Box width: a share of the image, never below the floor, never wider than the image. */
export function noteBoxWidth(imageWidth: number): number {
  const room = Math.max(MIN_FONT * 4, imageWidth - IMAGE_MARGIN * 2);
  return Math.min(Math.max(imageWidth * WIDTH_RATIO, MIN_WIDTH), room);
}

export interface NoteLayout {
  font: number;
  width: number;
  height: number;
  /** Height of the glued edge above the text. */
  header: number;
  padding: number;
  lineHeight: number;
  lines: string[];
}

/**
 * The single source of truth for a note's geometry. The renderer calls it with
 * the canvas `measureText`, the hit test with a cheap estimator — same rules,
 * two measures, so the selection box always matches what is drawn.
 */
export function layoutNote(text: string, imageWidth: number, measure: (s: string) => number): NoteLayout {
  const font = noteFontSize(imageWidth);
  const width = noteBoxWidth(imageWidth);
  const padding = font * 0.7;
  const lineHeight = font * 1.35;
  const header = font * 1.6;
  const lines = wrapText(text, width - padding * 2, measure);
  return {
    font,
    width,
    height: header + padding * 2 + lines.length * lineHeight,
    header,
    padding,
    lineHeight,
    lines,
  };
}

const isNote = (a: Annotation): a is NoteAnnotation => a.kind === 'note';

/**
 * Notes with their index, in creation order. The index is derived rather than
 * stored, so the numbers on the image and the numbers in the report are read
 * from the same list and cannot drift apart.
 */
export function collectNotes(annotations: Annotation[]): { index: number; text: string }[] {
  return annotations.filter(isNote).map((n, i) => ({ index: i + 1, text: n.text }));
}
