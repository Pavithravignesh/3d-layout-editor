import { beforeEach, describe, expect, it } from 'vitest';
import { bounds } from '../domain/geometry';
import { useEditor } from './editorStore';

const initial = useEditor.getState();
const editor = () => useEditor.getState();
const items = () => editor().layout.items;
const byLabel = (label: string) => items().find((i) => i.label === label)!;

beforeEach(() => useEditor.setState(initial, true));

/** Three items: C-01 (corner 1, 1), D-01 (corner 4, 1), T-01 (corner 8, 4). */
function threeItems() {
  editor().place('cabinet', 1.4, 1.3);
  editor().place('drive', 4.3, 1.25);
  editor().place('transformer', 8.6, 4.5);
}

describe('keyboard nudge', () => {
  it('moves the selected item one 0.5 m cell and keeps it on the grid', () => {
    editor().place('cabinet', 3.4, 2.3); // corner (3.0, 2.0), selected after placing
    editor().moveSelection(0.5, 0);
    expect(bounds(byLabel('C-01'))).toMatchObject({ minX: 3.5, minZ: 2 });
    editor().moveSelection(0, -1); // Shift + ↑: 1 m north
    expect(bounds(byLabel('C-01'))).toMatchObject({ minX: 3.5, minZ: 1 });
  });

  it('records one undo step per nudge', () => {
    editor().place('drive', 5.3, 5.25);
    editor().moveSelection(0.5, 0);
    editor().moveSelection(0.5, 0);
    expect(editor().history.past.map((c) => c.kind)).toEqual(['add', 'move', 'move']);
    editor().undo();
    expect(bounds(byLabel('D-01')).minX).toBe(5.5);
  });

  it('does nothing at the edge of the floor, so no empty undo step', () => {
    editor().place('cabinet', 19.6, 6); // corner x 19.0: as far east as an 0.8 m cabinet fits
    const steps = editor().history.past.length;
    editor().moveSelection(0.5, 0);
    expect(bounds(byLabel('C-01')).minX).toBe(19);
    expect(editor().history.past).toHaveLength(steps);
  });
});

describe('multi-select', () => {
  it('toggles items in and out, with the last one as primary', () => {
    threeItems();
    editor().select(byLabel('C-01').id);
    editor().toggleSelect(byLabel('T-01').id);
    expect(editor().selectedIds).toHaveLength(2);
    expect(editor().selectedId).toBe(byLabel('T-01').id);
    editor().toggleSelect(byLabel('T-01').id);
    expect(editor().selectedIds).toEqual([byLabel('C-01').id]);
  });

  it('selects a range in list order and selects all', () => {
    threeItems();
    editor().select(byLabel('C-01').id);
    editor().selectRange(byLabel('T-01').id);
    expect(editor().selectedIds).toHaveLength(3);
    editor().select(null);
    editor().selectAll();
    expect(editor().selectedIds).toHaveLength(3);
  });

  it('moves the group as one undo step', () => {
    threeItems();
    editor().selectAll();
    editor().moveSelection(1, 0.5);
    expect(['C-01', 'D-01', 'T-01'].map((l) => bounds(byLabel(l)).minX)).toEqual([2, 5, 9]);
    expect(editor().history.past.at(-1)).toMatchObject({ kind: 'move', target: 'C-01, D-01, T-01' });
    editor().undo();
    expect(['C-01', 'D-01', 'T-01'].map((l) => bounds(byLabel(l)).minX)).toEqual([1, 4, 8]);
  });

  it('deletes the group as one undo step and restores the list order', () => {
    threeItems();
    editor().select(byLabel('C-01').id);
    editor().toggleSelect(byLabel('T-01').id);
    editor().removeSelection();
    expect(items().map((i) => i.label)).toEqual(['D-01']);
    expect(editor().selectedIds).toEqual([]);
    editor().undo();
    expect(items().map((i) => i.label)).toEqual(['C-01', 'D-01', 'T-01']);
  });
});

describe('copy and paste', () => {
  it('pastes copies one cell down-right with new labels, as one undo step, and selects them', () => {
    threeItems();
    editor().select(byLabel('C-01').id);
    editor().toggleSelect(byLabel('D-01').id);
    editor().copySelection();
    editor().paste();
    expect(items().map((i) => i.label)).toEqual(['C-01', 'D-01', 'T-01', 'C-02', 'D-02']);
    expect(bounds(byLabel('C-02'))).toMatchObject({ minX: 1.5, minZ: 1.5 });
    expect(editor().selectedIds).toEqual([byLabel('C-02').id, byLabel('D-02').id]);
    editor().undo();
    expect(items()).toHaveLength(3);
  });

  it('cascades repeated pastes', () => {
    editor().place('cabinet', 1.4, 1.3);
    editor().copySelection();
    editor().paste();
    editor().paste();
    expect(['C-02', 'C-03'].map((l) => bounds(byLabel(l)).minX)).toEqual([1.5, 2]);
  });

  it('cut removes the originals and keeps them on the clipboard', () => {
    threeItems();
    editor().select(byLabel('T-01').id);
    editor().cutSelection();
    expect(items().map((i) => i.label)).toEqual(['C-01', 'D-01']);
    editor().paste();
    // Cut and paste is a move, so the item gets its old label back.
    expect(items().map((i) => i.label)).toEqual(['C-01', 'D-01', 'T-01']);
    expect(bounds(byLabel('T-01')).minX).toBe(8.5);
  });

  it('says so when there is nothing to paste', () => {
    editor().paste();
    expect(editor().notice?.key).toBe('clipboardEmpty');
    expect(editor().history.past).toHaveLength(0);
  });
});
