import { CATALOG, type ItemTypeId } from './catalog';
import { snapToGrid } from './geometry';
import { nextLabel } from './labels';
import { seededRandom } from './random';
import type { Item, Rotation } from './types';

const MIX: Array<[ItemTypeId, number]> = [
  ['cabinet', 0.45],
  ['drive', 0.4],
  ['transformer', 0.15],
];

/**
 * A repeatable layout for performance measurement: the same seed always gives the same items,
 * so frame rates measured on different machines are comparable.
 */
export function generateTestItems(existing: readonly Item[], count: number, seed = 2026): Item[] {
  const random = seededRandom(seed);
  const items: Item[] = [];
  const pickType = () => {
    let r = random();
    for (const [type, share] of MIX) if ((r -= share) < 0) return type;
    return CATALOG[0]!.id;
  };
  for (let i = 0; i < count; i++) {
    const type = pickType();
    const rotation = ([0, 90, 180, 270] as Rotation[])[Math.floor(random() * 4)]!;
    items.push({
      id: `test-${seed}-${i}`,
      type,
      rotation,
      label: nextLabel([...existing, ...items], type),
      ...snapToGrid(type, rotation, random() * 20, random() * 12),
    });
  }
  return items;
}
