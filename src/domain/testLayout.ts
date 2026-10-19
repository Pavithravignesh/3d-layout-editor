import { CATALOG, type ItemTypeId } from './catalog';
import { ROTATIONS, snapToGrid } from './geometry';
import { nextLabel } from './labels';
import { seededRandom } from './random';
import type { Item } from './types';

const MIX: Array<[ItemTypeId, number]> = [
  ['cabinet', 0.45],
  ['drive', 0.4],
  ['transformer', 0.15],
];

/**
 * A repeatable layout for performance measurement: the same seed always gives the same items,
 * so frame rates measured on different machines are comparable. Each further batch continues
 * from the items already placed, so it lands in new positions with new ids.
 */
export function generateTestItems(existing: readonly Item[], count: number, seed = 2026): Item[] {
  const random = seededRandom(seed + existing.length);
  const usedIds = new Set(existing.map((item) => item.id));
  let next = existing.length;
  const nextId = () => {
    while (usedIds.has(`test-${seed}-${next}`)) next++;
    return `test-${seed}-${next++}`;
  };
  const items: Item[] = [];
  const pickType = () => {
    let r = random();
    for (const [type, share] of MIX) if ((r -= share) < 0) return type;
    return CATALOG[0]!.id;
  };
  for (let i = 0; i < count; i++) {
    const type = pickType();
    const rotation = ROTATIONS[Math.floor(random() * ROTATIONS.length)]!;
    items.push({
      id: nextId(),
      type,
      rotation,
      label: nextLabel([...existing, ...items], type),
      ...snapToGrid(type, rotation, random() * 20, random() * 12),
    });
  }
  return items;
}
