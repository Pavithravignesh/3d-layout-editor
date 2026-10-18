import { FLOOR } from './floor';
import { bounds, round } from './geometry';
import { nextLabel } from './labels';
import type { Item } from './types';

/**
 * Limits a requested move so every item in the group stays on the floor, in whole grid cells.
 * The group moves as one: it stops at the edge instead of being squashed against it.
 */
export function clampGroupDelta(group: readonly Item[], dx: number, dz: number): { dx: number; dz: number } {
  if (group.length === 0) return { dx: 0, dz: 0 };
  const { cell, width, depth } = FLOOR;
  const toCells = (v: number) => Math.round(v / cell) * cell;
  let minDx = -Infinity, maxDx = Infinity, minDz = -Infinity, maxDz = Infinity;
  for (const item of group) {
    const b = bounds(item);
    minDx = Math.max(minDx, -b.minX);
    maxDx = Math.min(maxDx, width - b.maxX);
    minDz = Math.max(minDz, -b.minZ);
    maxDz = Math.min(maxDz, depth - b.maxZ);
  }
  const fit = (v: number, lo: number, hi: number) => {
    const snapped = toCells(v);
    const loCells = Math.ceil(round(lo / cell)) * cell;
    const hiCells = Math.floor(round(hi / cell)) * cell;
    return round(Math.min(Math.max(snapped, loCells), hiCells));
  };
  return { dx: fit(dx, minDx, maxDx), dz: fit(dz, minDz, maxDz) };
}

/**
 * Copies of the clipboard items for pasting: moved by the offset (clamped as a group so they stay
 * on the floor), with fresh ids and the next free labels.
 */
export function pasteCopies(existing: readonly Item[], clipboard: readonly Item[], offset: number, makeId: () => string): Item[] {
  const { dx, dz } = clampGroupDelta(clipboard, offset, offset);
  const pasted: Item[] = [];
  for (const item of clipboard) {
    pasted.push({
      ...item,
      id: makeId(),
      label: nextLabel([...existing, ...pasted], item.type),
      x: round(item.x + dx),
      z: round(item.z + dz),
    });
  }
  return pasted;
}

/** Short, language-neutral description of a group for messages: "C-01, D-02, T-01 +2". */
export function describeGroup(items: readonly Item[]): string {
  const labels = items.map((i) => i.label);
  return labels.length <= 3 ? labels.join(', ') : `${labels.slice(0, 3).join(', ')} +${labels.length - 3}`;
}
