import { ClipTimer } from './clipTimer';

export interface ClipRecorderOptions {
  clipMs: number;
  maxMs: number;
  /** Called with each finished clip, in order (index starts at 1). */
  onClip: (blob: Blob, index: number) => void;
  /** UI progress callback, ~1 Hz. */
  onTick?: (totalElapsedMs: number, clipIndex: number, paused: boolean) => void;
  /** Called when the total cap stops the recording. */
  onLimit?: () => void;
}

function pickMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? '';
}

/**
 * Records a stream as a sequence of standalone .webm clips by restarting
 * MediaRecorder at clip boundaries. Pause/resume affects the active recorder
 * and the clip clock.
 */
export class ClipRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private timer: ClipTimer;
  private interval: number | undefined;
  private clipIndex = 1;
  private stopped = false;
  private readonly mimeType = pickMimeType();

  constructor(
    private readonly stream: MediaStream,
    private readonly options: ClipRecorderOptions,
  ) {
    this.timer = new ClipTimer(options.clipMs, options.maxMs, performance.now());
  }

  start(): void {
    this.startClipRecorder();
    this.interval = window.setInterval(() => this.tick(), 500);
  }

  pause(): void {
    if (this.stopped || this.timer.paused) return;
    this.recorder?.pause();
    this.timer.pause(performance.now());
    this.emitTick();
  }

  resume(): void {
    if (this.stopped || !this.timer.paused) return;
    this.recorder?.resume();
    this.timer.resume(performance.now());
    this.emitTick();
  }

  get paused(): boolean {
    return this.timer.paused;
  }

  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    if (this.interval !== undefined) clearInterval(this.interval);
    await this.finishClip();
  }

  private startClipRecorder(): void {
    this.chunks = [];
    const recorder = new MediaRecorder(this.stream, this.mimeType ? { mimeType: this.mimeType } : undefined);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    recorder.start(1000);
    this.recorder = recorder;
    this.timer.markClipStart(performance.now());
  }

  private finishClip(): Promise<void> {
    return new Promise((resolve) => {
      const recorder = this.recorder;
      if (!recorder || recorder.state === 'inactive') {
        resolve();
        return;
      }
      recorder.onstop = () => {
        if (this.chunks.length > 0) {
          this.options.onClip(new Blob(this.chunks, { type: this.mimeType || 'video/webm' }), this.clipIndex);
          this.clipIndex++;
        }
        resolve();
      };
      recorder.stop();
    });
  }

  private tick(): void {
    if (this.stopped) return;
    const now = performance.now();
    this.emitTick();
    if (this.timer.shouldStop(now)) {
      void this.stop().then(() => this.options.onLimit?.());
      return;
    }
    if (this.timer.shouldSplit(now)) {
      void this.finishClip().then(() => {
        if (!this.stopped) this.startClipRecorder();
      });
    }
  }

  private emitTick(): void {
    this.options.onTick?.(this.timer.totalElapsed(performance.now()), this.clipIndex, this.timer.paused);
  }
}

export interface CompositeOptions {
  cameraStream?: MediaStream;
  timestamp: boolean;
}

/**
 * Composes the display stream with an optional camera bubble and timestamp,
 * mixed with the given audio tracks. Compositing runs in a Web Worker via
 * MediaStreamTrackProcessor/Generator so it keeps producing frames while the
 * recorder tab is hidden (page rAF/timers are throttled in hidden tabs, which
 * previously froze the recording). Falls back to the raw display stream when
 * the Breakout Box API is unavailable.
 */
export function composeStreams(
  displayStream: MediaStream,
  audioTracks: MediaStreamTrack[],
  { cameraStream, timestamp }: CompositeOptions,
): { stream: MediaStream; stop: () => void; composited: boolean } {
  const displayTrack = displayStream.getVideoTracks()[0];
  if (
    typeof MediaStreamTrackProcessor === 'undefined' ||
    typeof MediaStreamTrackGenerator === 'undefined'
  ) {
    return {
      stream: new MediaStream([displayTrack, ...audioTracks]),
      stop: () => {},
      composited: false,
    };
  }

  const processor = new MediaStreamTrackProcessor({ track: displayTrack });
  const generator = new MediaStreamTrackGenerator({ kind: 'video' });
  const worker = new Worker(chrome.runtime.getURL('/compositor-worker.js'));

  const transfers: Transferable[] = [processor.readable, generator.writable];
  let cameraReadable: ReadableStream<VideoFrame> | undefined;
  if (cameraStream) {
    const cameraProcessor = new MediaStreamTrackProcessor({
      track: cameraStream.getVideoTracks()[0],
    });
    cameraReadable = cameraProcessor.readable;
    transfers.push(cameraReadable);
  }
  worker.postMessage(
    { readable: processor.readable, writable: generator.writable, cameraReadable, timestamp },
    transfers,
  );

  return {
    stream: new MediaStream([generator, ...audioTracks]),
    stop: () => {
      worker.postMessage({ type: 'stop' });
      setTimeout(() => worker.terminate(), 500);
    },
    composited: true,
  };
}
