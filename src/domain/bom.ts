import { CATALOG, type ItemTypeId } from './catalog';
import type { Item } from './types';

export type BomLine = { type: ItemTypeId; quantity: number; labels: string[] };

/** Bill of materials counted from the scene, in catalogue order, omitting types not used. */
export function billOfMaterials(items: readonly Item[]): BomLine[] {
  const byType = new Map<ItemTypeId, string[]>();
  for (const item of items) {
    const labels = byType.get(item.type);
    if (labels) labels.push(item.label);
    else byType.set(item.type, [item.label]);
  }
  return CATALOG.flatMap((type) => {
    const labels = byType.get(type.id);
    return labels ? [{ type: type.id, quantity: labels.length, labels: labels.sort() }] : [];
  });
}
