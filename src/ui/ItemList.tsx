import { memo, useEffect, useMemo, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../design-system/Panel';
import { Icon } from '../design-system/Icon';
import { getItemType } from '../domain/catalog';
import { bounds } from '../domain/geometry';
import { violatingIds } from '../domain/rules';
import type { Item } from '../domain/types';
import { useFormat } from '../i18n';
import { useEditor, useViolations } from '../state/editorStore';
import styles from './ItemList.module.css';

/** Placed items in placement order. Selection is shared with the 3D view through the store. */
export function ItemList() {
  const { t } = useTranslation();
  const items = useEditor((s) => s.layout.items);
  const selectedId = useEditor((s) => s.selectedId);
  const selectedIds = useEditor((s) => s.selectedIds);
  const select = useEditor((s) => s.select);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const violations = useViolations();
  const violating = useMemo(() => violatingIds(violations), [violations]);
  const listRef = useRef<HTMLUListElement>(null);

  // Selecting in the 3D view scrolls the list to the item.
  useEffect(() => {
    if (!selectedId) return;
    listRef.current?.querySelector(`[data-id="${CSS.escape(selectedId)}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  if (items.length === 0) return <EmptyState title={t('empty.list')} hint={t('empty.listHint')} />;

  // One Tab stop for the whole list; arrow keys, Home and End move the selection (roving focus).
  const focusIndex = Math.max(0, items.findIndex((i) => i.id === selectedId));
  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const moves: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, Home: -items.length, End: items.length };
    const step = moves[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const next = items[Math.min(items.length - 1, Math.max(0, focusIndex + step))]!;
    select(next.id);
    listRef.current?.querySelector<HTMLButtonElement>(`[data-id="${CSS.escape(next.id)}"] button`)?.focus();
  };

  return (
    <ul ref={listRef} className={styles.list} aria-label={t('panels.list')} onKeyDown={onKeyDown}>
      {items.map((item, index) => (
        <Row
          key={item.id}
          item={item}
          selected={selected.has(item.id)}
          primary={item.id === selectedId}
          focusable={index === focusIndex}
          warning={violating.has(item.id)}
        />
      ))}
    </ul>
  );
}

/** Click selects one item; Ctrl/Cmd-click adds or removes it; Shift-click selects a range. */
function onRowClick(id: string, e: MouseEvent) {
  const editor = useEditor.getState();
  if (e.ctrlKey || e.metaKey) editor.toggleSelect(id);
  else if (e.shiftKey) editor.selectRange(id);
  else editor.select(id);
}

type RowProps = { item: Item; selected: boolean; primary: boolean; focusable: boolean; warning: boolean };

const Row = memo(function Row({ item, selected, primary, focusable, warning }: RowProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const corner = useMemo(() => bounds(item), [item]);
  return (
    <li className={styles.row} data-id={item.id}>
      <button
        type="button"
        className={styles.button}
        aria-pressed={selected}
        aria-current={primary || undefined}
        tabIndex={focusable ? 0 : -1}
        onClick={(e) => onRowClick(item.id, e)}
      >
        <span className={styles.swatch} style={{ background: getItemType(item.type).color }} aria-hidden="true" />
        <span className={styles.label}>{item.label}</span>
        <span className={styles.type}>{t(`items.${item.type}`)}</span>
        <span className={styles.position}>
          {t('list.position', { x: fmt.number(corner.minX), z: fmt.number(corner.minZ) })}
        </span>
        {warning && (
          <span className={styles.warning} title={t('list.warning')}>
            <Icon name="warning" size={14} />
            <span className="visually-hidden">{t('list.warning')}</span>
          </span>
        )}
      </button>
    </li>
  );
});
