import type { ItemTypeId } from './catalog';
import type { Item, Rotation } from './types';

let seq = 0;

export function makeItem(type: ItemTypeId, x: number, z: number, rotation: Rotation = 0, label?: string): Item {
  seq += 1;
  return { id: `t${seq}`, type, label: label ?? `${type}-${seq}`, x, z, rotation };
}

/** Small deterministic pseudo-random generator, so randomised tests are repeatable. */
export function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
