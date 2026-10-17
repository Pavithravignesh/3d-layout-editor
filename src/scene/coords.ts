import type { Ray } from 'three';
import { FLOOR } from '../domain/floor';

/** Floor coordinates (origin at the north-west corner) to world coordinates (origin at the floor centre). */
export function toWorld(x: number, z: number): [number, number] {
  return [x - FLOOR.width / 2, z - FLOOR.depth / 2];
}

/** Where a pointer ray meets the floor plane, in floor coordinates. */
export function floorPointFromRay(ray: Ray): { x: number; z: number } | null {
  if (Math.abs(ray.direction.y) < 1e-6) return null;
  const t = -ray.origin.y / ray.direction.y;
  if (t < 0) return null;
  return {
    x: ray.origin.x + ray.direction.x * t + FLOOR.width / 2,
    z: ray.origin.z + ray.direction.z * t + FLOOR.depth / 2,
  };
}

export const degToRad = (deg: number) => (deg * Math.PI) / 180;
