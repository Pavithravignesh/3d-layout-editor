import { create } from 'zustand';
import type { ItemTypeId } from '../domain/catalog';
import { addItem, batch, removeItem, updateItem, type Command } from '../domain/commands';
import { nextRotation, snapToGrid } from '../domain/geometry';
import { EMPTY_HISTORY, execute, redo, undo, type EditorDoc } from '../domain/history';
import { nextLabel } from '../domain/labels';
import { findViolations, type Violation } from '../domain/rules';
import { generateTestItems } from '../domain/testLayout';
import { EMPTY_LAYOUT, type Item, type Rotation } from '../domain/types';

/** The most recent change, for screen-reader announcements. */
export type LastAction = { via: 'do' | 'undo' | 'redo'; command: Command; seq: number } | null;

export type EditorState = EditorDoc & {
  selectedId: string | null;
  /** Item type being placed from the palette, or null when not placing. */
  placing: ItemTypeId | null;
  lastAction: LastAction;

  place(type: ItemTypeId, x: number, z: number): void;
  move(id: string, x: number, z: number): void;
  /** Moves an item by whole grid steps (keyboard editing); stays on the floor. */
  nudge(id: string, dx: number, dz: number): void;
  rotate(id: string): void;
  update(id: string, changes: Partial<Pick<Item, 'x' | 'z' | 'rotation' | 'label'>>): void;
  remove(id: string): void;
  select(id: string | null): void;
  startPlacing(type: ItemTypeId | null): void;
  /** Adds a repeatable set of test items as one undo step, for performance measurement. */
  loadTestLayout(count: number): void;
  undo(): void;
  redo(): void;
};

let idCounter = 0;
const newId = () => `item-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;
let actionSeq = 0;

export const useEditor = create<EditorState>()((set, get) => {
  /** Runs a command through the history and keeps the selection valid. */
  const run = (command: Command | null, selectedId = get().selectedId) => {
    if (!command) return;
    const doc = execute(get(), command);
    set({ ...doc, selectedId: keepIfPresent(doc, selectedId), lastAction: { via: 'do', command, seq: ++actionSeq } });
  };

  return {
    layout: EMPTY_LAYOUT,
    history: EMPTY_HISTORY,
    selectedId: null,
    placing: null,
    lastAction: null,

    place(type, x, z) {
      const rotation: Rotation = 0;
      const item: Item = {
        id: newId(),
        type,
        label: nextLabel(get().layout.items, type),
        rotation,
        ...snapToGrid(type, rotation, x, z),
      };
      run(addItem(item), item.id);
    },

    move(id, x, z) {
      const item = find(get(), id);
      if (!item) return;
      run(updateItem(get().layout, id, snapToGrid(item.type, item.rotation, x, z), 'move'));
    },

    nudge(id, dx, dz) {
      const item = find(get(), id);
      if (item) get().move(id, item.x + dx, item.z + dz);
    },

    rotate(id) {
      const item = find(get(), id);
      if (!item) return;
      const rotation = nextRotation(item.rotation);
      // Re-snap so the turned footprint stays on the grid and on the floor.
      run(updateItem(get().layout, id, { rotation, ...snapToGrid(item.type, rotation, item.x, item.z) }, 'rotate'));
    },

    update(id, changes) {
      const item = find(get(), id);
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
      if (!find(get(), id)) return;
      run(removeItem(get().layout, id), null);
    },

    select(id) {
      set({ selectedId: id, placing: null });
    },

    startPlacing(type) {
      set({ placing: type, selectedId: type ? null : get().selectedId });
    },

    loadTestLayout(count) {
      const items = generateTestItems(get().layout.items, count);
      run(batch(items.map(addItem), String(count)), null);
    },

    undo() {
      const command = get().history.past.at(-1);
      if (!command) return;
      const doc = undo(get());
      set({ ...doc, selectedId: keepIfPresent(doc, get().selectedId), lastAction: { via: 'undo', command, seq: ++actionSeq } });
    },

    redo() {
      const command = get().history.future[0];
      if (!command) return;
      const doc = redo(get());
      set({ ...doc, selectedId: keepIfPresent(doc, get().selectedId), lastAction: { via: 'redo', command, seq: ++actionSeq } });
    },
  };
});

function find(doc: EditorDoc, id: string) {
  return doc.layout.items.find((i) => i.id === id);
}

function keepIfPresent(doc: EditorDoc, id: string | null) {
  return id && find(doc, id) ? id : null;
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
