import { describe, expect, it } from 'vitest';
import { pixelateBuffer } from '../lib/annotations/pixelate';

function makeImage(width: number, height: number, fill: (x: number, y: number) => [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = fill(x, y);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  return { data, width, height };
}

describe('pixelateBuffer', () => {
  it('averages each block to a single colour', () => {
    // Left half black, right half white; block size covers full height.
    const img = makeImage(8, 4, (x) => (x < 4 ? [0, 0, 0, 255] : [255, 255, 255, 255]));
    pixelateBuffer(img, 4);
    // Every pixel in the left block equals the block average (pure black).
    expect([img.data[0], img.data[1], img.data[2]]).toEqual([0, 0, 0]);
    // A pixel in the right block is pure white.
    const i = (1 * 8 + 6) * 4;
    expect([img.data[i], img.data[i + 1], img.data[i + 2]]).toEqual([255, 255, 255]);
  });

  it('mixes colours within a block', () => {
    // Checkerboard black/white with block covering everything → mid grey.
    const img = makeImage(4, 4, (x, y) => ((x + y) % 2 === 0 ? [0, 0, 0, 255] : [255, 255, 255, 255]));
    pixelateBuffer(img, 4);
    expect(img.data[0]).toBeGreaterThan(100);
    expect(img.data[0]).toBeLessThan(155);
    // Uniform: all pixels identical after pixelation.
    const first = img.data[0];
    for (let i = 0; i < img.data.length; i += 4) expect(img.data[i]).toBe(first);
  });

  it('handles edge blocks smaller than the block size', () => {
    const img = makeImage(5, 5, () => [10, 20, 30, 255]);
    expect(() => pixelateBuffer(img, 4)).not.toThrow();
    const i = (4 * 5 + 4) * 4;
    expect([img.data[i], img.data[i + 1], img.data[i + 2]]).toEqual([10, 20, 30]);
  });
});
