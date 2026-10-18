import { describe, expect, it } from 'vitest';
import { bounds } from './geometry';
import { clampGroupDelta, describeGroup, pasteCopies } from './group';
import { makeItem } from './test-utils';

describe('clampGroupDelta', () => {
  const a = makeItem('cabinet', 1.4, 2.3); // x 1.0–1.8
  const b = makeItem('cabinet', 18.4, 2.3); // x 18.0–18.8

  it('passes a move through when the whole group stays on the floor', () => {
    expect(clampGroupDelta([a, b], 0.5, 1)).toEqual({ dx: 0.5, dz: 1 });
  });

  it('stops the whole group at the edge instead of squashing it', () => {
    // b can move at most 1.0 m east (18.8 → 19.8, the last full cell before 20 m)
    expect(clampGroupDelta([a, b], 3, 0)).toEqual({ dx: 1, dz: 0 });
    // a can move at most 1.0 m west
    expect(clampGroupDelta([a, b], -5, 0)).toEqual({ dx: -1, dz: 0 });
  });

  it('rounds requests to whole grid cells', () => {
    expect(clampGroupDelta([a], 0.7, 0.2)).toEqual({ dx: 0.5, dz: 0 });
  });
});

describe('pasteCopies', () => {
  let n = 0;
  const id = () => `p${++n}`;

  it('offsets copies by one cell with fresh ids and the next labels', () => {
    const c1 = makeItem('cabinet', 1.4, 2.3, 0, 'C-01');
    const d1 = makeItem('drive', 3.3, 2.25, 90, 'D-01');
    const pasted = pasteCopies([c1, d1], [c1, d1], 0.5, id);
    expect(pasted.map((p) => p.label)).toEqual(['C-02', 'D-02']);
    expect(pasted.every((p) => !p.id.startsWith('t'))).toBe(true);
    expect(bounds(pasted[0]!)).toMatchObject({ minX: 1.5, minZ: 2.5 });
    expect(pasted[1]!.rotation).toBe(90);
  });

  it('keeps pasted copies on the floor', () => {
    const edge = makeItem('cabinet', 19.6, 11.7, 0, 'C-01'); // touches the south-east corner
    const [copy] = pasteCopies([edge], [edge], 0.5, id);
    expect(bounds(copy!).maxX).toBeLessThanOrEqual(20);
    expect(bounds(copy!).maxZ).toBeLessThanOrEqual(12);
  });
});

describe('describeGroup', () => {
  it('names up to three items and counts the rest', () => {
    const items = ['C-01', 'C-02', 'D-01', 'T-01', 'T-02'].map((l) => makeItem('cabinet', 1, 1, 0, l));
    expect(describeGroup(items.slice(0, 2))).toBe('C-01, C-02');
    expect(describeGroup(items)).toBe('C-01, C-02, D-01 +2');
  });
});
