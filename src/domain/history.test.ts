import { describe, expect, it } from 'vitest';
import { addItem, batch, removeItem, updateItem } from './commands';
import { EMPTY_HISTORY, HISTORY_LIMIT, execute, redo, undo, type EditorDoc } from './history';
import { makeItem } from './test-utils';
import { EMPTY_LAYOUT } from './types';

const start: EditorDoc = { layout: EMPTY_LAYOUT, history: EMPTY_HISTORY };

describe('undo and redo', () => {
  it('undoes and redoes an add', () => {
    const item = makeItem('cabinet', 1.4, 2.3);
    const added = execute(start, addItem(item));
    expect(added.layout.items).toEqual([item]);

    const undone = undo(added);
    expect(undone.layout.items).toEqual([]);
    expect(redo(undone).layout.items).toEqual([item]);
  });

  it('restores the exact previous position after a move', () => {
    const item = makeItem('drive', 1.3, 1.25);
    let doc = execute(start, addItem(item));
    doc = execute(doc, updateItem(doc.layout, item.id, { x: 5.3, z: 4.25 }, 'move')!);
    expect(doc.layout.items[0]).toMatchObject({ x: 5.3, z: 4.25 });
    expect(undo(doc).layout.items[0]).toMatchObject({ x: 1.3, z: 1.25 });
  });

  it('puts a deleted item back at its original position in the list', () => {
    const [a, b, c] = [makeItem('cabinet', 1, 1), makeItem('drive', 3, 3), makeItem('transformer', 6, 6)];
    let doc = [a, b, c].reduce((d, item) => execute(d, addItem(item!)), start);
    doc = execute(doc, removeItem(doc.layout, b!.id));
    expect(doc.layout.items.map((i) => i.id)).toEqual([a!.id, c!.id]);
    expect(undo(doc).layout.items.map((i) => i.id)).toEqual([a!.id, b!.id, c!.id]);
  });

  it('clears the redo stack when a new edit is made', () => {
    const doc = undo(execute(start, addItem(makeItem('cabinet', 1, 1))));
    expect(doc.history.future).toHaveLength(1);
    expect(execute(doc, addItem(makeItem('drive', 3, 3))).history.future).toHaveLength(0);
  });

  it('does nothing when there is nothing to undo or redo', () => {
    expect(undo(start)).toBe(start);
    expect(redo(start)).toBe(start);
  });

  it('caps the history length', () => {
    let doc = start;
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) doc = execute(doc, addItem(makeItem('drive', 1, 1)));
    expect(doc.history.past).toHaveLength(HISTORY_LIMIT);
  });

  it('reverts a batch in reverse order as one step', () => {
    const items = [makeItem('cabinet', 1, 1), makeItem('drive', 3, 3)];
    const doc = execute(start, batch(items.map(addItem), 'demo'));
    expect(doc.layout.items).toHaveLength(2);
    expect(doc.history.past).toHaveLength(1);
    expect(undo(doc).layout.items).toHaveLength(0);
  });
});

describe('updateItem', () => {
  it('returns null when nothing would change', () => {
    const item = makeItem('cabinet', 1.4, 2.3);
    const doc = execute(start, addItem(item));
    expect(updateItem(doc.layout, item.id, { x: 1.4, z: 2.3 })).toBeNull();
  });

  it('records the kind and the item label for messages', () => {
    const item = makeItem('cabinet', 1.4, 2.3, 0, 'C-07');
    const doc = execute(start, addItem(item));
    expect(updateItem(doc.layout, item.id, { rotation: 90 }, 'rotate')).toMatchObject({ kind: 'rotate', target: 'C-07' });
  });
});
