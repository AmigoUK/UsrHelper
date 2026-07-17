import { describe, expect, it } from 'vitest';
import { ClipTimer } from '../lib/clipTimer';

const MIN = 60_000;

describe('ClipTimer', () => {
  it('splits after the clip length and stops at the cap', () => {
    const timer = new ClipTimer(5 * MIN, 30 * MIN, 0);
    expect(timer.shouldSplit(4 * MIN)).toBe(false);
    expect(timer.shouldSplit(5 * MIN)).toBe(true);
    timer.markClipStart(5 * MIN);
    expect(timer.shouldSplit(9 * MIN)).toBe(false);
    expect(timer.shouldSplit(10 * MIN)).toBe(true);
    expect(timer.shouldStop(29 * MIN)).toBe(false);
    expect(timer.shouldStop(30 * MIN)).toBe(true);
  });

  it('does not split when the cap is reached (stop wins)', () => {
    const timer = new ClipTimer(5 * MIN, 30 * MIN, 0);
    timer.markClipStart(26 * MIN);
    expect(timer.shouldSplit(31 * MIN)).toBe(false);
    expect(timer.shouldStop(31 * MIN)).toBe(true);
  });

  it('pause stops the clock', () => {
    const timer = new ClipTimer(5 * MIN, 30 * MIN, 0);
    timer.pause(2 * MIN);
    expect(timer.totalElapsed(10 * MIN)).toBe(2 * MIN);
    expect(timer.shouldSplit(10 * MIN)).toBe(false);
    timer.resume(10 * MIN);
    // 2 min recorded + 3 more minutes → split at 13 min wall clock.
    expect(timer.shouldSplit(12 * MIN)).toBe(false);
    expect(timer.shouldSplit(13 * MIN)).toBe(true);
    expect(timer.totalElapsed(13 * MIN)).toBe(5 * MIN);
  });

  it('clip elapsed resets on markClipStart', () => {
    const timer = new ClipTimer(5 * MIN, 30 * MIN, 0);
    timer.markClipStart(5 * MIN);
    expect(timer.clipElapsed(6 * MIN)).toBe(MIN);
  });
});
