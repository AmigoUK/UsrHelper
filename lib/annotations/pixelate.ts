export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * In-place block-average mosaic. Each blockSize×blockSize block is replaced by
 * its average colour, making text unreadable. Works on plain buffers so it is
 * testable outside the browser (ImageData satisfies the interface).
 */
export function pixelateBuffer(image: PixelBuffer, blockSize: number): void {
  const { data, width, height } = image;
  for (let by = 0; by < height; by += blockSize) {
    for (let bx = 0; bx < width; bx += blockSize) {
      const bw = Math.min(blockSize, width - bx);
      const bh = Math.min(blockSize, height - by);
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let y = by; y < by + bh; y++) {
        for (let x = bx; x < bx + bw; x++) {
          const i = (y * width + x) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          a += data[i + 3];
        }
      }
      const count = bw * bh;
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);
      a = Math.round(a / count);
      for (let y = by; y < by + bh; y++) {
        for (let x = bx; x < bx + bw; x++) {
          const i = (y * width + x) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = a;
        }
      }
    }
  }
}

/** Recommended mosaic block size for a given image width — strong enough to defeat OCR. */
export function mosaicBlockSize(imageWidth: number): number {
  return Math.max(12, Math.round(imageWidth / 100));
}
