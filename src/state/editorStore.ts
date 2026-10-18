import { create } from 'zustand';
import type { ItemTypeId } from '../domain/catalog';
import { addItem, batch, removeItem, updateItem, type Command } from '../domain/commands';
import { nextRotation, snapToGrid } from '../domain/geometry';
import { clampGroupDelta, describeGroup, pasteCopies } from '../domain/group';
import { EMPTY_HISTORY, execute, redo, undo, type EditorDoc } from '../domain/history';
import { nextLabel } from '../domain/labels';
import { findViolations, type Violation } from '../domain/rules';
import { generateTestItems } from '../domain/testLayout';
import { EMPTY_LAYOUT, type Item, type Layout, type Rotation } from '../domain/types';
import { FLOOR } from '../domain/floor';

/** The most recent change, for screen-reader announcements. */
export type LastAction = { via: 'do' | 'undo' | 'redo'; command: Command; seq: number } | null;
/** A message that is not an edit, e.g. "Copied 3 items". */
export type Notice = { key: string; count?: number; seq: number } | null;

type Selection = { selectedIds: readonly string[]; selectedId: string | null };

export type EditorState = EditorDoc &
  Selection & {
    /** Item type being placed from the palette, or null when not placing. */
    placing: ItemTypeId | null;
    clipboard: readonly Item[];
    lastAction: LastAction;
    notice: Notice;

    place(type: ItemTypeId, x: number, z: number): void;
    move(id: string, x: number, z: number): void;
    rotate(id: string): void;
    update(id: string, changes: Partial<Pick<Item, 'x' | 'z' | 'rotation' | 'label'>>): void;
    remove(id: string): void;

    /** Selects one item, or clears the selection. */
    select(id: string | null): void;
    /** Adds or removes one item (Ctrl/Shift-click). */
    toggleSelect(id: string): void;
    /** Selects every item between the primary selection and this one, in list order. */
    selectRange(id: string): void;
    selectAll(): void;

    /** Moves every selected item by the same whole-cell distance; the group stays on the floor. */
    moveSelection(dx: number, dz: number): void;
    rotateSelection(): void;
    removeSelection(): void;
    copySelection(): void;
    cutSelection(): void;
    paste(): void;

    startPlacing(type: ItemTypeId | null): void;
    /** Adds a repeatable set of test items as one undo step, for performance measurement. */
    loadTestLayout(count: number): void;
    undo(): void;
    redo(): void;
  };

let idCounter = 0;
const newId = () => `item-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;
let seq = 0;
let pasteCount = 0;

/** The primary item (the last one selected) drives the properties panel and the 3D label. */
const selection = (ids: readonly string[]): Selection => ({ selectedIds: ids, selectedId: ids.at(-1) ?? null });

/** One command for one item; a batch (one undo step) for several. */
function combine(commands: Command[], group: readonly Item[], kind: Command['kind']): Command | null {
  if (commands.length === 0) return null;
  return commands.length === 1 ? commands[0]! : batch(commands, describeGroup(group), kind);
}

export const useEditor = create<EditorState>()((set, get) => {
  /** Runs a command through the history and keeps the selection valid. */
  const run = (command: Command | null, selectedIds: readonly string[] = get().selectedIds) => {
    if (!command) return;
    const doc = execute(get(), command);
    set({ ...doc, ...selection(present(doc.layout, selectedIds)), lastAction: { via: 'do', command, seq: ++seq } });
  };
  const notify = (key: string, count?: number) => set({ notice: { key, count, seq: ++seq } });
  const selectedItems = () => {
    const ids = new Set(get().selectedIds);
    return get().layout.items.filter((i) => ids.has(i.id));
  };

  return {
    layout: EMPTY_LAYOUT,
    history: EMPTY_HISTORY,
    ...selection([]),
    placing: null,
    clipboard: [],
    lastAction: null,
    notice: null,

    place(type, x, z) {
      const rotation: Rotation = 0;
      const item: Item = {
        id: newId(),
        type,
        label: nextLabel(get().layout.items, type),
        rotation,
        ...snapToGrid(type, rotation, x, z),
      };
      run(addItem(item), [item.id]);
    },

    move(id, x, z) {
      const item = find(get().layout, id);
      if (!item) return;
      run(updateItem(get().layout, id, snapToGrid(item.type, item.rotation, x, z), 'move'));
    },

    rotate(id) {
      const item = find(get().layout, id);
      if (!item) return;
      const rotation = nextRotation(item.rotation);
      // Re-snap so the turned footprint stays on the grid and on the floor.
      run(updateItem(get().layout, id, { rotation, ...snapToGrid(item.type, rotation, item.x, item.z) }, 'rotate'));
    },

    update(id, changes) {
      const item = find(get().layout, id);
      if (!item) return;
      const rotation = changes.rotation ?? item.rotation;
      const position =
        changes.x !== undefined || changes.z !== undefined || changes.rotation !== undefined
          ? snapToGrid(item.type, rotation, changes.x ?? item.x, changes.z ?? item.z)
          : {};
      const kind = changes.label !== undefined ? 'update' : changes.rotation !== undefined ? 'rotate' : 'move';
      run(updateItem(get().layout, id, { ...changes, ...position }, kind));
    },

    remove(id) {
      if (!find(get().layout, id)) return;
      run(removeItem(get().layout, id), []);
    },

    select(id) {
      set({ ...selection(id ? [id] : []), placing: null });
    },

    toggleSelect(id) {
      const ids = get().selectedIds;
      set({ ...selection(ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]), placing: null });
    },

    selectRange(id) {
      const { selectedId, layout } = get();
      if (!selectedId) return get().select(id);
      const order = layout.items.map((i) => i.id);
      const [from, to] = [order.indexOf(selectedId), order.indexOf(id)];
      if (from < 0 || to < 0) return get().select(id);
      const range = order.slice(Math.min(from, to), Math.max(from, to) + 1);
      // Keep the clicked item last so it becomes the primary selection.
      set({ ...selection([...range.filter((i) => i !== id), id]), placing: null });
    },

    selectAll() {
      const ids = get().layout.items.map((i) => i.id);
      set({ ...selection(ids), placing: null });
      notify('selected', ids.length);
    },

    moveSelection(dx, dz) {
      const group = selectedItems();
      const delta = clampGroupDelta(group, dx, dz);
      if (delta.dx === 0 && delta.dz === 0) return;
      const layout = get().layout;
      const commands = group
        .map((i) => updateItem(layout, i.id, { x: i.x + delta.dx, z: i.z + delta.dz }, 'move'))
        .filter((c): c is Command => c !== null);
      run(combine(commands, group, 'move'));
    },

    rotateSelection() {
      const group = selectedItems();
      const layout = get().layout;
      const commands = group
        .map((i) => {
          const rotation = nextRotation(i.rotation);
          return updateItem(layout, i.id, { rotation, ...snapToGrid(i.type, rotation, i.x, i.z) }, 'rotate');
        })
        .filter((c): c is Command => c !== null);
      run(combine(commands, group, 'rotate'));
    },

    removeSelection() {
      const group = selectedItems();
      // Built one after another so each command remembers the right list position for undo.
      let layout: Layout = get().layout;
      const commands = group.map((i) => {
        const command = removeItem(layout, i.id);
        layout = command.apply(layout);
        return command;
      });
      run(combine(commands, group, 'remove'), []);
    },

    copySelection() {
      const group = selectedItems();
      if (group.length === 0) return;
      pasteCount = 0;
      set({ clipboard: group });
      notify('copied', group.length);
    },

    cutSelection() {
      if (get().selectedIds.length === 0) return;
      get().copySelection();
      get().removeSelection();
    },

    paste() {
      const { clipboard, layout } = get();
      if (clipboard.length === 0) return notify('clipboardEmpty');
      pasteCount += 1;
      const copies = pasteCopies(layout.items, clipboard, FLOOR.cell * pasteCount, newId);
      run(combine(copies.map(addItem), copies, 'add'), copies.map((c) => c.id));
    },

    startPlacing(type) {
      set({ placing: type, ...(type ? selection([]) : {}) });
    },

    loadTestLayout(count) {
      const items = generateTestItems(get().layout.items, count);
      run(batch(items.map(addItem), String(count)), []);
    },

    undo() {
      const command = get().history.past.at(-1);
      if (!command) return;
      const doc = undo(get());
      set({ ...doc, ...selection(present(doc.layout, get().selectedIds)), lastAction: { via: 'undo', command, seq: ++seq } });
    },

    redo() {
      const command = get().history.future[0];
      if (!command) return;
      const doc = redo(get());
      set({ ...doc, ...selection(present(doc.layout, get().selectedIds)), lastAction: { via: 'redo', command, seq: ++seq } });
    },
  };
});

function find(layout: Layout, id: string) {
  return layout.items.find((i) => i.id === id);
}

/** Drops ids of items that no longer exist (after a delete or an undo). */
function present(layout: Layout, ids: readonly string[]) {
  if (ids.length === 0) return ids;
  const existing = new Set(layout.items.map((i) => i.id));
  return ids.filter((id) => existing.has(id));
}

/* ---------- derived state ---------- */

let lastItems: readonly Item[] | null = null;
let lastViolations: Violation[] = [];

/** Rule violations for the current layout, computed once per layout change and shared by all readers. */
export function useViolations(): Violation[] {
  const items = useEditor((s) => s.layout.items);
  if (items !== lastItems) {
    lastItems = items;
    lastViolations = findViolations(items);
  }
  return lastViolations;
}

export const useSelectedItem = () =>
  useEditor((s) => (s.selectedId ? (s.layout.items.find((i) => i.id === s.selectedId) ?? null) : null));
