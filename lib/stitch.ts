export interface StitchSegment {
  /** Where to scroll the page (CSS px). */
  scrollY: number;
  /** Where the visible capture's needed part lands on the output canvas (CSS px). */
  drawY: number;
  /** How many CSS px of this capture are used (from its bottom edge). */
  height: number;
}

/**
 * Plans full-page capture: a list of scroll positions and where each capture's
 * slice is drawn. The last segment scrolls to the page bottom and only its
 * lowest `height` pixels are used, so nothing is duplicated or missed.
 */
export function stitchPlan(
  pageHeight: number,
  viewportHeight: number,
  maxHeight = 16000,
): StitchSegment[] {
  const total = Math.min(pageHeight, maxHeight);
  if (total <= viewportHeight) {
    return [{ scrollY: 0, drawY: 0, height: total }];
  }
  const segments: StitchSegment[] = [];
  let drawY = 0;
  while (drawY + viewportHeight < total) {
    segments.push({ scrollY: drawY, drawY, height: viewportHeight });
    drawY += viewportHeight;
  }
  const remaining = total - drawY;
  if (remaining > 0) {
    segments.push({ scrollY: total - viewportHeight, drawY, height: remaining });
  }
  return segments;
}
