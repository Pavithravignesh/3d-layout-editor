import { describe, expect, it } from 'vitest';
import { CATALOG } from './catalog';
import { bounds, gapBetween, snapToGrid } from './geometry';
import { findViolations, violatingIds } from './rules';
import { makeItem, seededRandom } from './test-utils';
import type { Item, Rotation } from './types';

describe('findViolations', () => {
  it('flags two items closer than 0.6 m and names both', () => {
    const a = makeItem('cabinet', 1.4, 2.3, 0, 'C-01'); // x 1.0–1.8
    const b = makeItem('cabinet', 2.4, 2.3, 0, 'C-02'); // x 2.0–2.8
    const [v, ...rest] = findViolations([a, b]);
    expect(rest).toHaveLength(0);
    expect(v).toMatchObject({ a: { label: 'C-01' }, b: { label: 'C-02' }, gap: 0.2 });
  });

  it('allows exactly 0.6 m', () => {
    const a = makeItem('cabinet', 1.4, 2.3); // maxX 1.8
    const b = makeItem('cabinet', 2.8, 2.3); // minX 2.4
    expect(findViolations([a, b])).toEqual([]);
  });

  it('reports overlapping items with a gap of 0', () => {
    const a = makeItem('transformer', 5, 5);
    const b = makeItem('drive', 5.2, 5.1);
    expect(findViolations([a, b])[0]?.gap).toBe(0);
  });

  it('lists the closest pair first', () => {
    const a = makeItem('drive', 1.3, 1.25); // x 1.0–1.6, z 1.0–1.5
    const b = makeItem('drive', 2.2, 1.25); // 0.3 m east of a
    const c = makeItem('drive', 1.3, 2.05); // 0.3 m south of a
    const d = makeItem('drive', 3.0, 1.25); // 0.2 m east of b
    const gaps = findViolations([a, b, c, d]).map((v) => v.gap);
    expect(gaps).toEqual([...gaps].sort((x, y) => x - y));
  });

  it('matches a brute-force check of all pairs on 400 random items', () => {
    const random = seededRandom(42);
    const items: Item[] = Array.from({ length: 400 }, () => {
      const type = CATALOG[Math.floor(random() * CATALOG.length)]!.id;
      const rotation = ([0, 90, 180, 270] as Rotation[])[Math.floor(random() * 4)]!;
      const { x, z } = snapToGrid(type, rotation, random() * 20, random() * 12);
      return makeItem(type, x, z, rotation);
    });

    const expected = new Set<string>();
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (gapBetween(bounds(items[i]!), bounds(items[j]!)) < 0.6) expected.add(`${items[i]!.id}|${items[j]!.id}`);
      }
    }
    const actual = new Set(findViolations(items).map((v) => `${v.a.id}|${v.b.id}`));
    expect(actual).toEqual(expected);
    expect(expected.size).toBeGreaterThan(0);
  });
});

describe('violatingIds', () => {
  it('collects every item involved', () => {
    const a = makeItem('cabinet', 1.4, 2.3);
    const b = makeItem('cabinet', 2.4, 2.3);
    const c = makeItem('cabinet', 15, 10);
    expect(violatingIds(findViolations([a, b, c]))).toEqual(new Set([a.id, b.id]));
  });
});
