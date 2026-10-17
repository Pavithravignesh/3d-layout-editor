import type { ItemTypeId } from './catalog';
import type { Item, Rotation } from './types';

export { seededRandom } from './random';

let seq = 0;

export function makeItem(type: ItemTypeId, x: number, z: number, rotation: Rotation = 0, label?: string): Item {
  seq += 1;
  return { id: `t${seq}`, type, label: label ?? `${type}-${seq}`, x, z, rotation };
}
