export type ItemTypeId = 'cabinet' | 'drive' | 'transformer';

export type ItemType = {
  id: ItemTypeId;
  /** Prefix for generated labels, e.g. C-01. */
  prefix: string;
  /** Footprint width (x), depth (z) and height, in metres, before rotation. */
  size: { w: number; d: number; h: number };
  color: string;
};

export const CATALOG: readonly ItemType[] = [
  { id: 'cabinet', prefix: 'C', size: { w: 0.8, d: 0.6, h: 2.0 }, color: '#5b7db1' },
  { id: 'drive', prefix: 'D', size: { w: 0.6, d: 0.5, h: 1.8 }, color: '#3aa58b' },
  { id: 'transformer', prefix: 'T', size: { w: 1.2, d: 1.0, h: 1.5 }, color: '#d9a23c' },
];

const BY_ID = new Map(CATALOG.map((t) => [t.id, t]));

export function getItemType(id: ItemTypeId): ItemType {
  const type = BY_ID.get(id);
  if (!type) throw new Error(`Unknown item type: ${id}`);
  return type;
}
