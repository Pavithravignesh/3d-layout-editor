import type { Command } from './commands';
import type { Layout } from './types';

export type History = { past: readonly Command[]; future: readonly Command[] };

export const EMPTY_HISTORY: History = { past: [], future: [] };

/** Oldest steps are dropped beyond this, so memory stays flat in long sessions. */
export const HISTORY_LIMIT = 200;

export type EditorDoc = { layout: Layout; history: History };

export function execute(doc: EditorDoc, command: Command): EditorDoc {
  return {
    layout: command.apply(doc.layout),
    history: { past: [...doc.history.past, command].slice(-HISTORY_LIMIT), future: [] },
  };
}

export function undo(doc: EditorDoc): EditorDoc {
  const command = doc.history.past.at(-1);
  if (!command) return doc;
  return {
    layout: command.revert(doc.layout),
    history: { past: doc.history.past.slice(0, -1), future: [command, ...doc.history.future] },
  };
}

export function redo(doc: EditorDoc): EditorDoc {
  const [command, ...rest] = doc.history.future;
  if (!command) return doc;
  return {
    layout: command.apply(doc.layout),
    history: { past: [...doc.history.past, command], future: rest },
  };
}
