import { useEffect } from 'react';
import { FLOOR } from '../domain/floor';
import { useEditor } from '../state/editorStore';

/** Arrow keys move the selected item one grid cell; with Shift, two cells (1 m). North is up. */
const NUDGE: Record<string, [number, number]> = {
  arrowleft: [-1, 0],
  arrowright: [1, 0],
  arrowup: [0, -1],
  arrowdown: [0, 1],
};

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * Editor-wide keyboard shortcuts. Every action goes through the same store commands as the
 * mouse, so undo and redo cover keyboard edits too.
 */
export function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // The item list uses the arrow keys itself and marks the event as handled.
      if (isTyping(e.target) || e.defaultPrevented) return;
      const editor = useEditor.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        editor.undo();
      } else if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault();
        editor.redo();
      } else if (!mod && (key === 'delete' || key === 'backspace') && editor.selectedId) {
        e.preventDefault();
        editor.remove(editor.selectedId);
      } else if (!mod && key === 'r' && editor.selectedId) {
        editor.rotate(editor.selectedId);
      } else if (!mod && NUDGE[key] && editor.selectedId && !editor.placing) {
        e.preventDefault();
        const [dx, dz] = NUDGE[key]!;
        const step = FLOOR.cell * (e.shiftKey ? 2 : 1);
        editor.nudge(editor.selectedId, dx * step, dz * step);
      } else if (key === 'escape') {
        if (editor.placing) editor.startPlacing(null);
        else editor.select(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
