import { getItemType, type ItemTypeId } from './catalog';
import type { Item } from './types';

/**
 * Next free label for a type (C-01, C-02 …, C-100). Numbers are never reused, even after a delete.
 * Linear in the number of items, which is fine at this scale.
 */
export function nextLabel(items: readonly Item[], type: ItemTypeId): string {
  const { prefix } = getItemType(type);
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  const highest = items.reduce((max, item) => {
    const match = item.type === type ? pattern.exec(item.label) : null;
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${prefix}-${String(highest + 1).padStart(2, '0')}`;
}
