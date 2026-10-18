import { useEffect } from 'react';
import { FLOOR } from '../domain/floor';
import { useEditor, type EditorState } from '../state/editorStore';

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/** Arrow keys move the selection one grid cell; with Shift, two cells (1 m). North is up. */
const NUDGE: Record<string, [number, number]> = {
  arrowleft: [-1, 0],
  arrowright: [1, 0],
  arrowup: [0, -1],
  arrowdown: [0, 1],
};

/** The editor action for a key press, or null when the key is not a shortcut here. */
function actionFor(e: KeyboardEvent, editor: EditorState): (() => void) | null {
  const key = e.key.toLowerCase();
  const hasSelection = editor.selectedIds.length > 0;

  if (e.ctrlKey || e.metaKey) {
    if (key === 'z' && !e.shiftKey) return editor.undo;
    if (key === 'y' || (key === 'z' && e.shiftKey)) return editor.redo;
    if (key === 'a') return editor.selectAll;
    if (key === 'c' && hasSelection) return editor.copySelection;
    if (key === 'x' && hasSelection) return editor.cutSelection;
    if (key === 'v') return editor.paste;
    return null;
  }
  if ((key === 'delete' || key === 'backspace') && hasSelection) return editor.removeSelection;
  if (key === 'r' && hasSelection) return editor.rotateSelection;
  if (NUDGE[key] && hasSelection && !editor.placing) {
    const [dx, dz] = NUDGE[key]!;
    const step = FLOOR.cell * (e.shiftKey ? 2 : 1);
    return () => editor.moveSelection(dx * step, dz * step);
  }
  if (key === 'escape') return () => (editor.placing ? editor.startPlacing(null) : editor.select(null));
  return null;
}

/**
 * Editor-wide keyboard shortcuts. Every edit acts on the whole selection and goes through the
 * same store commands as the mouse, so undo and redo cover keyboard edits too.
 */
export function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // The item list uses the arrow keys itself and marks the event as handled.
      if (isTyping(e.target) || e.defaultPrevented) return;
      const action = actionFor(e, useEditor.getState());
      if (!action) return;
      e.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
