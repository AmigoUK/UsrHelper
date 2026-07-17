import { describe, expect, it } from 'vitest';
import { stitchPlan } from '../lib/stitch';

describe('stitchPlan', () => {
  it('single segment when page fits in viewport', () => {
    expect(stitchPlan(600, 800)).toEqual([{ scrollY: 0, drawY: 0, height: 600 }]);
  });

  it('exact multiple produces adjacent segments', () => {
    expect(stitchPlan(1600, 800)).toEqual([
      { scrollY: 0, drawY: 0, height: 800 },
      { scrollY: 800, drawY: 800, height: 800 },
    ]);
  });

  it('last segment overlaps instead of overshooting', () => {
    const plan = stitchPlan(2000, 800);
    expect(plan).toEqual([
      { scrollY: 0, drawY: 0, height: 800 },
      { scrollY: 800, drawY: 800, height: 800 },
      { scrollY: 1200, drawY: 1600, height: 400 },
    ]);
    // Full coverage without gaps:
    const covered = plan[plan.length - 1].drawY + plan[plan.length - 1].height;
    expect(covered).toBe(2000);
  });

  it('caps total height', () => {
    const plan = stitchPlan(100000, 800, 4000);
    const covered = plan[plan.length - 1].drawY + plan[plan.length - 1].height;
    expect(covered).toBe(4000);
  });
});
