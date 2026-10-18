import { beforeEach, describe, expect, it } from 'vitest';
import { bounds } from '../domain/geometry';
import { useEditor } from './editorStore';

const initial = useEditor.getState();
const editor = () => useEditor.getState();
const only = () => editor().layout.items[0]!;

beforeEach(() => useEditor.setState(initial, true));

describe('keyboard nudge', () => {
  it('moves the item one 0.5 m cell and keeps it on the grid', () => {
    editor().place('cabinet', 3.4, 2.3); // corner (3.0, 2.0)
    editor().nudge(only().id, 0.5, 0);
    expect(bounds(only())).toMatchObject({ minX: 3.5, minZ: 2 });
    editor().nudge(only().id, 0, -1); // Shift + ↑: 1 m north
    expect(bounds(only())).toMatchObject({ minX: 3.5, minZ: 1 });
  });

  it('records one undo step per nudge', () => {
    editor().place('drive', 5.3, 5.25);
    editor().nudge(only().id, 0.5, 0);
    editor().nudge(only().id, 0.5, 0);
    expect(editor().history.past.map((c) => c.kind)).toEqual(['add', 'move', 'move']);
    editor().undo();
    expect(bounds(only()).minX).toBe(5.5);
  });

  it('does nothing at the edge of the floor, so no empty undo step', () => {
    editor().place('cabinet', 19.6, 6); // corner x 19.0: as far east as an 0.8 m cabinet fits
    const steps = editor().history.past.length;
    editor().nudge(only().id, 0.5, 0);
    expect(bounds(only()).minX).toBe(19);
    expect(editor().history.past).toHaveLength(steps);
  });
});
