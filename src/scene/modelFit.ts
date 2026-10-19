export type Vec3 = readonly [number, number, number];
export type Size = { w: number; d: number; h: number };

/**
 * Scale and offset that stand a model on the floor, centred on the item's origin and filling the
 * catalogue footprint (w × d) and height exactly, so snapping and the clearance rule stay exact.
 * The scale can differ per axis: a model with other proportions is stretched to the footprint.
 */
export function fitToSize(min: Vec3, max: Vec3, size: Size): { scale: Vec3; offset: Vec3 } {
  const extent = (axis: 0 | 1 | 2) => Math.max(max[axis] - min[axis], 1e-6);
  const scale: Vec3 = [size.w / extent(0), size.h / extent(1), size.d / extent(2)];
  const offset: Vec3 = [
    -((min[0] + max[0]) / 2) * scale[0],
    -min[1] * scale[1],
    -((min[2] + max[2]) / 2) * scale[2],
  ];
  return { scale, offset };
}

/** GPU memory for an uncompressed RGBA8 texture with a full mipmap chain (about a third extra). */
export const rgbaBytesWithMips = (width: number, height: number) => Math.round(width * height * 4 * (4 / 3));
