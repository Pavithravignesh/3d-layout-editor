import { BoxGeometry } from 'three';
import { CATALOG, type ItemTypeId } from '../domain/catalog';

/** Height of the dark plinth every item stands on, in metres. */
export const PLINTH = 0.08;

export type PartGeometries = { body: BoxGeometry; plinth: BoxGeometry; front: BoxGeometry };

/**
 * Three boxes per item type, built once in the item's local space (front faces +z) and shared by
 * every instance, so 500 items still cost only three draw calls per type.
 */
export const PART_GEOMETRIES: Record<ItemTypeId, PartGeometries> = Object.fromEntries(
  CATALOG.map(({ id, size: { w, d, h } }) => {
    const bodyH = h - PLINTH;
    const body = new BoxGeometry(w, bodyH, d).translate(0, PLINTH + bodyH / 2, 0);
    const plinth = new BoxGeometry(w * 0.94, PLINTH, d * 0.94).translate(0, PLINTH / 2, 0);
    const front = new BoxGeometry(w * 0.72, bodyH * 0.58, 0.016).translate(0, PLINTH + bodyH * 0.55, d / 2 + 0.008);
    return [id, { body, plinth, front }];
  }),
) as Record<ItemTypeId, PartGeometries>;
