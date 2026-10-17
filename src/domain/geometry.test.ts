import { describe, expect, it } from 'vitest';
import { bounds, footprint, gapBetween, nextRotation, snapToGrid } from './geometry';

describe('footprint', () => {
  it('swaps width and depth on a quarter turn', () => {
    expect(footprint('cabinet', 0)).toEqual({ w: 0.8, d: 0.6 });
    expect(footprint('cabinet', 90)).toEqual({ w: 0.6, d: 0.8 });
    expect(footprint('cabinet', 180)).toEqual({ w: 0.8, d: 0.6 });
  });
});

describe('snapToGrid', () => {
  it('puts the north-west corner of the footprint on a 0.5 m grid line', () => {
    const { x, z } = snapToGrid('cabinet', 0, 3.33, 2.1);
    expect({ x, z }).toEqual({ x: 3.4, z: 2.3 });
    expect(bounds({ type: 'cabinet', rotation: 0, x, z }).minX % 0.5).toBeCloseTo(0);
  });

  it('keeps the whole footprint on the floor', () => {
    expect(snapToGrid('cabinet', 0, 25, -5)).toEqual({ x: 19.4, z: 0.3 });
    const b = bounds({ type: 'transformer', rotation: 0, ...snapToGrid('transformer', 0, 99, 99) });
    expect(b.maxX).toBeLessThanOrEqual(20);
    expect(b.maxZ).toBeLessThanOrEqual(12);
  });

  it('uses the rotated footprint', () => {
    expect(snapToGrid('cabinet', 90, 3.33, 2.1)).toEqual({ x: 3.3, z: 1.9 });
  });
});

describe('nextRotation', () => {
  it('cycles in 90° steps', () => {
    expect([0, 90, 180, 270].map((r) => nextRotation(r as 0 | 90 | 180 | 270))).toEqual([90, 180, 270, 0]);
  });
});

describe('gapBetween', () => {
  const box = (minX: number, maxX: number, minZ: number, maxZ: number) => ({ minX, maxX, minZ, maxZ });

  it('measures edge to edge along one axis', () => {
    expect(gapBetween(box(0, 1, 0, 1), box(2, 3, 0, 1))).toBe(1);
  });

  it('measures corner to corner diagonally', () => {
    expect(gapBetween(box(0, 1, 0, 1), box(1.3, 2, 1.4, 2))).toBe(0.5);
  });

  it('is zero when footprints touch or overlap', () => {
    expect(gapBetween(box(0, 1, 0, 1), box(1, 2, 0, 1))).toBe(0);
    expect(gapBetween(box(0, 1, 0, 1), box(0.5, 2, 0.5, 2))).toBe(0);
  });
});
