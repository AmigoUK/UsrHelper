import type { Annotation, PixelateAnnotation } from './model';
import { mosaicBlockSize, pixelateBuffer } from './pixelate';
import { wrapText } from './wrapText';

/** Text annotations wrap to this fraction of the image width. */
export const TEXT_MAX_WIDTH_FRACTION = 0.4;

type Ctx = CanvasRenderingContext2D;

/**
 * Draws the base image plus all annotations onto ctx (canvas must already be
 * sized to the image). Pixelate strokes reveal a mosaic copy of the base
 * image, so the exported bitmap contains no recoverable original pixels.
 */
export function renderScene(
  ctx: Ctx,
  base: CanvasImageSource & { width: number; height: number },
  annotations: Annotation[],
  mosaic?: HTMLCanvasElement,
): void {
  ctx.clearRect(0, 0, base.width, base.height);
  ctx.drawImage(base, 0, 0);

  const pixelates = annotations.filter((a): a is PixelateAnnotation => a.kind === 'pixelate');
  if (pixelates.length > 0 && mosaic) {
    drawPixelates(ctx, mosaic, pixelates);
  }
  for (const a of annotations) {
    if (a.kind !== 'pixelate') drawAnnotation(ctx, a);
  }
}

/** Builds the pixelated copy of the base image used by the anonymization brush. */
export function buildMosaic(base: CanvasImageSource & { width: number; height: number }): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = base.width;
  canvas.height = base.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(base, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  pixelateBuffer(imageData, mosaicBlockSize(canvas.width));
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function drawPixelates(ctx: Ctx, mosaic: HTMLCanvasElement, strokes: PixelateAnnotation[]): void {
  const mask = document.createElement('canvas');
  mask.width = mosaic.width;
  mask.height = mosaic.height;
  const mctx = mask.getContext('2d')!;
  mctx.lineCap = 'round';
  mctx.lineJoin = 'round';
  mctx.strokeStyle = '#000';
  mctx.fillStyle = '#000';
  for (const stroke of strokes) {
    mctx.lineWidth = stroke.size;
    strokePath(mctx, stroke.points, stroke.size);
  }
  mctx.globalCompositeOperation = 'source-in';
  mctx.drawImage(mosaic, 0, 0);
  ctx.drawImage(mask, 0, 0);
}

function strokePath(ctx: Ctx, points: { x: number; y: number }[], size: number): void {
  if (points.length === 0) return;
  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.stroke();
}

function drawAnnotation(ctx: Ctx, a: Annotation): void {
  ctx.save();
  ctx.strokeStyle = a.color;
  ctx.fillStyle = a.color;
  ctx.lineWidth = a.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (a.kind) {
    case 'pen':
      strokePath(ctx, a.points, a.size);
      break;
    case 'rect':
      ctx.strokeRect(a.x, a.y, a.w, a.h);
      break;
    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(a.x + a.w / 2, a.y + a.h / 2, Math.abs(a.w / 2), Math.abs(a.h / 2), 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'arrow': {
      drawArrow(ctx, a.x1, a.y1, a.x2, a.y2, a.size);
      break;
    }
    case 'text': {
      const fontSize = a.size * 6;
      ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
      ctx.textBaseline = 'top';
      const maxWidth = Math.max(fontSize * 4, ctx.canvas.width * TEXT_MAX_WIDTH_FRACTION);
      const lines = wrapText(a.text, maxWidth, (s) => ctx.measureText(s).width);
      // Keep the whole block inside the image, even when anchored near an edge.
      const blockWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
      const blockHeight = lines.length * fontSize * 1.25;
      const x = Math.max(0, Math.min(a.x, ctx.canvas.width - blockWidth - fontSize * 0.3));
      const y = Math.max(0, Math.min(a.y, ctx.canvas.height - blockHeight));
      lines.forEach((line, i) => ctx.fillText(line, x, y + i * fontSize * 1.25));
      break;
    }
    case 'step': {
      const r = Math.max(14, a.size * 5);
      ctx.beginPath();
      ctx.arc(a.x, a.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, r / 8);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${Math.round(r * 1.1)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(a.n), a.x, a.y + r * 0.05);
      break;
    }
  }
  ctx.restore();
}

function drawArrow(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, size: number): void {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLength = Math.max(12, size * 4);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

/** Stamps the timestamp in the bottom-right corner (used at export time). */
export function stampTimestamp(ctx: Ctx, width: number, height: number, text: string): void {
  const fontSize = Math.max(12, Math.round(width / 90));
  ctx.save();
  ctx.font = `${fontSize}px system-ui, sans-serif`;
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'right';
  const padding = fontSize * 0.6;
  const metrics = ctx.measureText(text);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(
    width - metrics.width - padding * 2,
    height - fontSize - padding * 1.6,
    metrics.width + padding * 2,
    fontSize + padding * 1.6,
  );
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, width - padding, height - padding * 0.8);
  ctx.restore();
}
