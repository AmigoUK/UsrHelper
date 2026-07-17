/**
 * Pure time-accounting for clip-split recordings. Feed it timestamps (ms);
 * it answers when to split into a new clip and when the total cap is hit.
 * Pauses stop the clock. All timestamps come from the caller, so the logic
 * is fully testable.
 */
export class ClipTimer {
  private readonly clipMs: number;
  private readonly maxMs: number;
  private startedAt: number;
  private clipStartedAt: number;
  private pausedAt: number | null = null;

  constructor(clipMs: number, maxMs: number, now: number) {
    this.clipMs = clipMs;
    this.maxMs = maxMs;
    this.startedAt = now;
    this.clipStartedAt = now;
  }

  pause(now: number): void {
    if (this.pausedAt === null) this.pausedAt = now;
  }

  resume(now: number): void {
    if (this.pausedAt === null) return;
    const pausedFor = now - this.pausedAt;
    this.startedAt += pausedFor;
    this.clipStartedAt += pausedFor;
    this.pausedAt = null;
  }

  get paused(): boolean {
    return this.pausedAt !== null;
  }

  totalElapsed(now: number): number {
    return (this.pausedAt ?? now) - this.startedAt;
  }

  clipElapsed(now: number): number {
    return (this.pausedAt ?? now) - this.clipStartedAt;
  }

  /** Call when a new clip actually starts recording. */
  markClipStart(now: number): void {
    this.clipStartedAt = now;
  }

  shouldSplit(now: number): boolean {
    return !this.paused && this.clipElapsed(now) >= this.clipMs && !this.shouldStop(now);
  }

  shouldStop(now: number): boolean {
    return !this.paused && this.totalElapsed(now) >= this.maxMs;
  }
}
