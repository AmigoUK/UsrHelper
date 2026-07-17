/**
 * Compositing worker: draws each display VideoFrame onto an OffscreenCanvas,
 * overlays the camera bubble and timestamp, and emits composed frames.
 * Runs in a worker because the recorder tab is usually hidden while the user
 * demos their app — page rAF/timers are throttled there, workers are not.
 */

interface InitMessage {
  readable: ReadableStream<VideoFrame>;
  writable: WritableStream<VideoFrame>;
  cameraReadable?: ReadableStream<VideoFrame>;
  timestamp: boolean;
}

let stopped = false;
let latestCamera: VideoFrame | null = null;

export default defineUnlistedScript(() => {
  self.addEventListener('message', (event) => {
    const data = (event as MessageEvent).data;
    if (data?.type === 'stop') {
      stopped = true;
      return;
    }
    void run(data as InitMessage);
  });
});

async function run({ readable, writable, cameraReadable, timestamp }: InitMessage): Promise<void> {
  if (cameraReadable) void pumpCamera(cameraReadable);

  const reader = readable.getReader();
  const writer = writable.getWriter();
  let canvas: OffscreenCanvas | null = null;
  let ctx: OffscreenCanvasRenderingContext2D | null = null;

  for (;;) {
    const { value: frame, done } = await reader.read();
    if (done || !frame) break;
    if (stopped) {
      frame.close();
      break;
    }
    const w = frame.displayWidth;
    const h = frame.displayHeight;
    if (!canvas || canvas.width !== w || canvas.height !== h) {
      canvas = new OffscreenCanvas(w, h);
      ctx = canvas.getContext('2d');
    }
    ctx!.drawImage(frame, 0, 0, w, h);
    drawCameraBubble(ctx!, w, h);
    if (timestamp) drawClock(ctx!, w, h);

    const out = new VideoFrame(canvas, { timestamp: frame.timestamp });
    frame.close();
    try {
      await writer.write(out);
    } catch {
      out.close();
      break;
    }
  }
  reader.releaseLock();
  try {
    await writer.close();
  } catch {
    // Generator already stopped.
  }
  latestCamera?.close();
  latestCamera = null;
}

async function pumpCamera(readable: ReadableStream<VideoFrame>): Promise<void> {
  const reader = readable.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done || !value) break;
    if (stopped) {
      value.close();
      break;
    }
    latestCamera?.close();
    latestCamera = value;
  }
}

function drawCameraBubble(ctx: OffscreenCanvasRenderingContext2D, w: number, h: number): void {
  const cam = latestCamera;
  if (!cam) return;
  const r = Math.round(Math.min(w, h) * 0.11);
  const cx = r + Math.round(w * 0.02);
  const cy = h - r - Math.round(h * 0.03);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const side = Math.min(cam.displayWidth, cam.displayHeight);
  ctx.drawImage(
    cam,
    (cam.displayWidth - side) / 2,
    (cam.displayHeight - side) / 2,
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

function drawClock(ctx: OffscreenCanvasRenderingContext2D, w: number, h: number): void {
  const text = new Date().toLocaleString();
  const fontSize = Math.max(14, Math.round(w / 100));
  ctx.font = `${fontSize}px monospace`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  const pad = fontSize * 0.5;
  const tw = ctx.measureText(text).width;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
  ctx.fillRect(w - tw - pad * 3, h - fontSize - pad * 2, tw + pad * 2, fontSize + pad * 1.4);
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(text, w - pad * 2, h - pad);
}
