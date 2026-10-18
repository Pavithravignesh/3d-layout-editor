import { useTranslation } from 'react-i18next';
import { bounds } from '../domain/geometry';
import { useFormat } from '../i18n';
import { useEditor, useViolations } from '../state/editorStore';

/**
 * Polite live region: screen readers hear every edit, undo and redo without focus moving, plus
 * notices that are not edits ("Copied 3 items"). After a single item is placed, moved or turned
 * they also hear where it is and what it is too close to,
 * e.g. "Done: move C-03. Now at 4.5, 2.5 m. Too close to D-07 (0.4 m)."
 */
export function Announcer() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const last = useEditor((s) => s.lastAction);
  const notice = useEditor((s) => s.notice);
  const items = useEditor((s) => s.layout.items);
  const violations = useViolations();

  let message = '';
  let key = 0;
  if (notice && (!last || notice.seq > last.seq)) {
    message = t(`announce.${notice.key}`, { count: notice.count });
    key = notice.seq;
  } else if (last) {
    key = last.seq;
    const { kind, target } = last.command;
    const action = t(`actions.${kind}`, { target });
    message = last.via === 'do' ? t('announce.done', { action }) : t(`announce.${last.via}`, { action });

    const item = kind === 'add' || kind === 'move' || kind === 'rotate' ? items.find((i) => i.label === target) : undefined;
    if (item) {
      const corner = bounds(item);
      message += ` ${t('announce.position', { x: fmt.number(corner.minX), z: fmt.number(corner.minZ) })}`;
      const close = violations
        .filter((v) => v.a.id === item.id || v.b.id === item.id)
        .map((v) => {
          const other = (v.a.id === item.id ? v.b : v.a).label;
          return v.gap === 0 ? t('announce.overlaps', { other }) : t('announce.tooClose', { other, gap: fmt.number(v.gap) });
        });
      if (close.length) message += ` ${close.slice(0, 3).join(' ')}`;
    }
  }

  return (
    <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
      {/* The sequence number makes a repeated action announce again. */}
      <span key={key}>{message}</span>
    </div>
  );
}
