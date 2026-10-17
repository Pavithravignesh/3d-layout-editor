import { CATALOG } from './catalog';
import { CLEARANCE } from './floor';
import { bounds, gapBetween, type Bounds } from './geometry';
import type { Item } from './types';

export type Violation = { a: Item; b: Item; gap: number };

/**
 * Cell size for the spatial hash. Two items can only violate the rule when their centres are
 * closer than half their combined sizes plus the clearance on each axis, which is always below
 * this value, so only the 3 × 3 neighbouring cells need checking.
 */
const HASH_CELL = Math.max(...CATALOG.map((t) => Math.max(t.size.w, t.size.d))) + CLEARANCE;

/**
 * Every pair of items closer than the clearance, closest first.
 * O(n) on average via a spatial hash instead of comparing all n² pairs.
 */
export function findViolations(items: readonly Item[], clearance = CLEARANCE): Violation[] {
  const cells = new Map<string, number[]>();
  const boxes: Bounds[] = items.map(bounds);
  const key = (cx: number, cz: number) => `${cx}:${cz}`;
  const cellOf = (item: Item) => [Math.floor(item.x / HASH_CELL), Math.floor(item.z / HASH_CELL)] as const;

  items.forEach((item, i) => {
    const [cx, cz] = cellOf(item);
    const k = key(cx, cz);
    const bucket = cells.get(k);
    if (bucket) bucket.push(i);
    else cells.set(k, [i]);
  });

  const violations: Violation[] = [];
  items.forEach((item, i) => {
    const [cx, cz] = cellOf(item);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (const j of cells.get(key(cx + dx, cz + dz)) ?? []) {
          if (j <= i) continue;
          const gap = gapBetween(boxes[i]!, boxes[j]!);
          if (gap < clearance) violations.push({ a: item, b: items[j]!, gap });
        }
      }
    }
  });

  return violations.sort((p, q) => p.gap - q.gap || p.a.label.localeCompare(q.a.label));
}

/** Ids of all items involved in at least one violation. */
export function violatingIds(violations: readonly Violation[]): Set<string> {
  const ids = new Set<string>();
  for (const v of violations) {
    ids.add(v.a.id);
    ids.add(v.b.id);
  }
  return ids;
}
