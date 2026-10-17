import { useTranslation } from 'react-i18next';
import { useEditor } from '../state/editorStore';

/**
 * Polite live region: screen readers hear every edit, undo and redo
 * ("Added C-03", "Undone: move D-01") without focus moving.
 */
export function Announcer() {
  const { t } = useTranslation();
  const last = useEditor((s) => s.lastAction);
  let message = '';
  if (last) {
    const action = t(`actions.${last.command.kind}`, { target: last.command.target });
    message = last.via === 'do' ? t('announce.done', { action }) : t(`announce.${last.via}`, { action });
  }
  return (
    <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
      {/* The sequence number makes a repeated action announce again. */}
      <span key={last?.seq}>{message}</span>
    </div>
  );
}
