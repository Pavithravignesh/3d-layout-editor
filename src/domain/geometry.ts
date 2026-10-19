import { getItemType, type ItemTypeId } from './catalog';
import { FLOOR } from './floor';
import type { Item, Rotation } from './types';

export type Footprint = { w: number; d: number };
export type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };

const EPSILON = 1e-9;

/** Footprint after rotation: a quarter turn swaps width and depth. */
export function footprint(type: ItemTypeId, rotation: Rotation): Footprint {
  const { w, d } = getItemType(type).size;
  return rotation === 90 || rotation === 270 ? { w: d, d: w } : { w, d };
}

export function bounds(item: Pick<Item, 'type' | 'rotation' | 'x' | 'z'>): Bounds {
  const { w, d } = footprint(item.type, item.rotation);
  return {
    minX: round(item.x - w / 2),
    maxX: round(item.x + w / 2),
    minZ: round(item.z - d / 2),
    maxZ: round(item.z + d / 2),
  };
}

/**
 * Snaps a requested centre so the footprint's north-west corner sits on a grid line,
 * and keeps the whole footprint on the floor.
 */
export function snapToGrid(type: ItemTypeId, rotation: Rotation, x: number, z: number) {
  const { w, d } = footprint(type, rotation);
  const { cell } = FLOOR;
  const snapAxis = (centre: number, size: number, floorSize: number) => {
    const maxCorner = Math.floor((floorSize - size) / cell + EPSILON) * cell;
    const corner = Math.min(Math.max(Math.round((centre - size / 2) / cell) * cell, 0), maxCorner);
    return round(corner + size / 2);
  };
  return { x: snapAxis(x, w, FLOOR.width), z: snapAxis(z, d, FLOOR.depth) };
}

/** The quarter turns an item can have, in order. */
export const ROTATIONS: readonly Rotation[] = [0, 90, 180, 270];

/** Narrows a number from the outside world (a select box, a file) to a valid rotation. */
export function isRotation(value: number): value is Rotation {
  return (ROTATIONS as readonly number[]).includes(value);
}

export function nextRotation(rotation: Rotation): Rotation {
  return ROTATIONS[(ROTATIONS.indexOf(rotation) + 1) % ROTATIONS.length]!;
}

/** Edge-to-edge distance between two footprints; 0 when they touch or overlap. */
export function gapBetween(a: Bounds, b: Bounds): number {
  const dx = Math.max(0, a.minX - b.maxX, b.minX - a.maxX);
  const dz = Math.max(0, a.minZ - b.maxZ, b.minZ - a.maxZ);
  return round(Math.hypot(dx, dz));
}

/** Rounds away floating-point noise (0.1 + 0.2) at millimetre precision. */
export function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
