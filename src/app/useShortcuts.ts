import { useEffect } from 'react';
import { useEditor } from '../state/editorStore';

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * Editor-wide keyboard shortcuts. Every action goes through the same store commands as the
 * mouse, so undo and redo cover keyboard edits too.
 */
export function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
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
      } else if (key === 'escape') {
        if (editor.placing) editor.startPlacing(null);
        else editor.select(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
