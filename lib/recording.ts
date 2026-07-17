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
 * Draws the display stream (plus optional camera bubble and timestamp) onto a
 * canvas and returns its captured stream mixed with the given audio tracks.
 * Returns a stop() that ends the compositor loop.
 */
export function composeStreams(
  displayStream: MediaStream,
  audioTracks: MediaStreamTrack[],
  { cameraStream, timestamp }: CompositeOptions,
): { stream: MediaStream; stop: () => void } {
  const displayVideo = document.createElement('video');
  displayVideo.srcObject = displayStream;
  displayVideo.muted = true;
  void displayVideo.play();

  let cameraVideo: HTMLVideoElement | null = null;
  if (cameraStream) {
    cameraVideo = document.createElement('video');
    cameraVideo.srcObject = cameraStream;
    cameraVideo.muted = true;
    void cameraVideo.play();
  }

  const settings = displayStream.getVideoTracks()[0].getSettings();
  const canvas = document.createElement('canvas');
  canvas.width = settings.width ?? 1920;
  canvas.height = settings.height ?? 1080;
  const ctx = canvas.getContext('2d')!;

  let running = true;
  const draw = () => {
    if (!running) return;
    if (displayVideo.videoWidth > 0) {
      if (canvas.width !== displayVideo.videoWidth) {
        canvas.width = displayVideo.videoWidth;
        canvas.height = displayVideo.videoHeight;
      }
      ctx.drawImage(displayVideo, 0, 0, canvas.width, canvas.height);
    }
    if (cameraVideo && cameraVideo.videoWidth > 0) {
      const r = Math.round(Math.min(canvas.width, canvas.height) * 0.11);
      const cx = r + Math.round(canvas.width * 0.02);
      const cy = canvas.height - r - Math.round(canvas.height * 0.03);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      const side = Math.min(cameraVideo.videoWidth, cameraVideo.videoHeight);
      ctx.drawImage(
        cameraVideo,
        (cameraVideo.videoWidth - side) / 2,
        (cameraVideo.videoHeight - side) / 2,
        side,
        side,
        cx - r,
        cy - r,
        r * 2,
        r * 2,
      );
      ctx.restore();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(3, r / 18);
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }
    if (timestamp) {
      const text = new Date().toLocaleString();
      const fontSize = Math.max(14, Math.round(canvas.width / 100));
      ctx.font = `${fontSize}px ui-monospace, monospace`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      const pad = fontSize * 0.5;
      const w = ctx.measureText(text).width;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(canvas.width - w - pad * 3, canvas.height - fontSize - pad * 2, w + pad * 2, fontSize + pad * 1.4);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(text, canvas.width - pad * 2, canvas.height - pad);
    }
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);

  const stream = canvas.captureStream(30);
  for (const track of audioTracks) stream.addTrack(track);

  return {
    stream,
    stop: () => {
      running = false;
      displayVideo.srcObject = null;
      if (cameraVideo) cameraVideo.srcObject = null;
    },
  };
}
