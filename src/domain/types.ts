import type { ItemTypeId } from './catalog';

export type Rotation = 0 | 90 | 180 | 270;

/**
 * A placed item. `x` and `z` are the centre of its footprint in floor coordinates
 * (metres from the floor's north-west corner).
 */
export type Item = {
  id: string;
  type: ItemTypeId;
  label: string;
  x: number;
  z: number;
  rotation: Rotation;
};

/** Items in placement order. Every change produces a new array, never a mutation. */
export type Layout = { items: readonly Item[] };

export const EMPTY_LAYOUT: Layout = { items: [] };
