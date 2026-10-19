import { describe, expect, it } from 'vitest';
import { fitToSize, rgbaBytesWithMips } from './modelFit';

describe('fitToSize', () => {
  it('stands the model on the floor, centred, filling the catalogue size', () => {
    const { scale, offset } = fitToSize([-0.46, 0.1, -0.2], [0.46, 1.22, 0.24], { w: 0.8, d: 0.6, h: 2 });
    const place = (p: readonly [number, number, number]) => p.map((v, i) => v * scale[i]! + offset[i]!);
    const [minX, minY, minZ] = place([-0.46, 0.1, -0.2]);
    const [maxX, maxY, maxZ] = place([0.46, 1.22, 0.24]);
    expect(minY).toBeCloseTo(0);
    expect(maxY).toBeCloseTo(2);
    expect(minX).toBeCloseTo(-0.4);
    expect(maxX).toBeCloseTo(0.4);
    expect(minZ).toBeCloseTo(-0.3);
    expect(maxZ).toBeCloseTo(0.3);
  });
});

describe('rgbaBytesWithMips', () => {
  it('counts four bytes a pixel plus a third for the mipmaps', () => {
    expect(rgbaBytesWithMips(4096, 4096)).toBe(89_478_485);
  });
});
