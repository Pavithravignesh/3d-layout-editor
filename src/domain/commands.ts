import type { Item, Layout } from './types';

/**
 * Every edit is a command that knows how to apply and revert itself. Undo and redo replay
 * commands, so they work the same whether an edit came from the 3D view, a panel or the keyboard.
 */
export type Command = {
  kind: 'add' | 'remove' | 'move' | 'rotate' | 'update' | 'batch';
  /** Label of the item affected, for messages such as "Undo move C-03". */
  target: string;
  apply(layout: Layout): Layout;
  revert(layout: Layout): Layout;
};

export function addItem(item: Item): Command {
  return {
    kind: 'add',
    target: item.label,
    apply: (layout) => ({ items: [...layout.items, item] }),
    revert: (layout) => ({ items: layout.items.filter((i) => i.id !== item.id) }),
  };
}

export function removeItem(layout: Layout, id: string): Command {
  const index = layout.items.findIndex((i) => i.id === id);
  const item = layout.items[index];
  if (!item) throw new Error(`No item with id ${id}`);
  return {
    kind: 'remove',
    target: item.label,
    apply: (l) => ({ items: l.items.filter((i) => i.id !== id) }),
    revert: (l) => ({ items: [...l.items.slice(0, index), item, ...l.items.slice(index)] }),
  };
}

type Changes = Partial<Omit<Item, 'id' | 'type'>>;

/**
 * Changes some fields of one item. Stores the previous values so revert is exact.
 * Returns null when nothing would change, e.g. a drag that ended where it started.
 */
export function updateItem(
  layout: Layout,
  id: string,
  changes: Changes,
  kind: 'move' | 'rotate' | 'update' = 'update',
): Command | null {
  const item = layout.items.find((i) => i.id === id);
  if (!item) throw new Error(`No item with id ${id}`);
  const keys = Object.keys(changes) as (keyof Changes)[];
  if (keys.every((k) => item[k] === changes[k])) return null;
  const before = Object.fromEntries(keys.map((k) => [k, item[k]])) as Changes;
  const patch = (values: Changes) => (l: Layout) => ({
    items: l.items.map((i) => (i.id === id ? { ...i, ...values } : i)),
  });
  return { kind, target: item.label, apply: patch(changes), revert: patch(before) };
}

/** Several commands as one undo step (e.g. loading a test layout). */
export function batch(commands: Command[], target: string): Command {
  return {
    kind: 'batch',
    target,
    apply: (layout) => commands.reduce((l, c) => c.apply(l), layout),
    revert: (layout) => commands.reduceRight((l, c) => c.revert(l), layout),
  };
}
