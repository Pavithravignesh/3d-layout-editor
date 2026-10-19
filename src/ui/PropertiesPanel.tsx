import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../design-system/Button';
import { EmptyState } from '../design-system/Panel';
import { billOfMaterials } from '../domain/bom';
import { getItemType } from '../domain/catalog';
import { CLEARANCE } from '../domain/floor';
import { bounds, footprint, isRotation, ROTATIONS } from '../domain/geometry';
import { describeGroup } from '../domain/group';
import type { Item } from '../domain/types';
import { useFormat } from '../i18n';
import { useEditor, useSelectedItem, useViolations } from '../state/editorStore';
import styles from './PropertiesPanel.module.css';


/** Edits the selection. Every change is an undoable command, exactly like an edit in 3D. */
export function PropertiesPanel() {
  const { t } = useTranslation();
  const item = useSelectedItem();
  const count = useEditor((s) => s.selectedIds.length);
  if (count > 1) return <GroupProperties />;
  if (!item) return <EmptyState title={t('empty.properties')} hint={t('empty.propertiesHint')} />;
  // Keyed by id so field drafts reset when the selection changes.
  return <ItemProperties key={item.id} item={item} />;
}

/** Several items selected: what is in the group, and the edits that apply to all of them. */
function GroupProperties() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const items = useEditor((s) => s.layout.items);
  const selectedIds = useEditor((s) => s.selectedIds);
  const { rotateSelection, copySelection, removeSelection } = useEditor.getState();
  const ids = new Set(selectedIds);
  const group = items.filter((i) => ids.has(i.id));
  const lines = billOfMaterials(group);
  const conflicts = useViolations().filter((v) => ids.has(v.a.id) || ids.has(v.b.id)).length;

  return (
    <div className={styles.body}>
      <div className={styles.heading}>
        <span className={styles.groupBadge} aria-hidden="true">
          {fmt.number(group.length, 0)}
        </span>
        <div>
          <p className={styles.title}>{t('props.groupTitle', { count: group.length })}</p>
          <p className={styles.subtitle}>{describeGroup(group)}</p>
        </div>
      </div>

      <dl className={styles.facts}>
        {lines.map((line) => (
          <div key={line.type} className={styles.factRow}>
            <dt>{t(`items.${line.type}`)}</dt>
            <dd>{fmt.number(line.quantity, 0)}</dd>
          </div>
        ))}
        <div className={styles.factRow}>
          <dt>{t('props.status')}</dt>
          <dd className={conflicts ? styles.bad : styles.good}>
            {conflicts
              ? t('props.groupConflicts', { count: conflicts, clearance: fmt.number(CLEARANCE) })
              : t('props.clear')}
          </dd>
        </div>
      </dl>

      <div className={styles.actions}>
        <Button icon="rotate" onClick={rotateSelection}>
          {t('props.rotateEach')}
        </Button>
        <Button icon="copy" onClick={copySelection}>
          {t('props.copy')}
        </Button>
        <Button icon="trash" variant="danger" onClick={removeSelection}>
          {t('props.deleteAll')}
        </Button>
      </div>
      <p className={styles.hint}>{t('props.groupHint')}</p>
    </div>
  );
}

function ItemProperties({ item }: { item: Item }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { update, rotate, remove } = useEditor.getState();
  const type = getItemType(item.type);
  const { w, d } = footprint(item.type, item.rotation);
  const corner = bounds(item);
  const conflicts = useViolations().filter((v) => v.a.id === item.id || v.b.id === item.id);

  const setCorner = (axis: 'x' | 'z', value: number) => {
    const half = axis === 'x' ? w / 2 : d / 2;
    update(item.id, { [axis]: value + half });
  };

  return (
    <div className={styles.body}>
      <div className={styles.heading}>
        <span className={styles.swatch} style={{ background: type.color }} aria-hidden="true" />
        <div>
          <p className={styles.title}>{item.label}</p>
          <p className={styles.subtitle}>{t(`items.${item.type}`)}</p>
        </div>
      </div>

      {/* Fields are keyed by their committed value, so an undo or a 3D drag resets any draft. */}
      <TextField
        key={`label-${item.label}`}
        label={t('props.label')}
        value={item.label}
        onCommit={(label) => update(item.id, { label: label.trim() })}
      />

      <fieldset className={styles.group}>
        <legend className={styles.legend}>{t('props.position')}</legend>
        <div className={styles.pair}>
          <NumberField key={`x-${corner.minX}`} label="X" value={corner.minX} onCommit={(v) => setCorner('x', v)} />
          <NumberField key={`z-${corner.minZ}`} label="Z" value={corner.minZ} onCommit={(v) => setCorner('z', v)} />
        </div>
        <p className={styles.hint}>{t('props.positionHint')}</p>
      </fieldset>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>{t('props.rotation')}</span>
        <select
          className={styles.input}
          value={item.rotation}
          onChange={(e) => {
            const rotation = Number(e.target.value);
            if (isRotation(rotation)) update(item.id, { rotation });
          }}
        >
          {ROTATIONS.map((r) => (
            <option key={r} value={r}>
              {r}°
            </option>
          ))}
        </select>
      </label>

      <dl className={styles.facts}>
        <dt>{t('props.size')}</dt>
        <dd>{t('palette.size', { w: fmt.number(w), d: fmt.number(d), h: fmt.number(type.size.h) })}</dd>
        <dt>{t('props.status')}</dt>
        <dd className={conflicts.length ? styles.bad : styles.good}>
          {conflicts.length
            ? t('props.conflicts', { count: conflicts.length, clearance: fmt.number(CLEARANCE) })
            : t('props.clear')}
        </dd>
      </dl>

      <div className={styles.actions}>
        <Button icon="rotate" onClick={() => rotate(item.id)}>
          {t('props.rotate')}
        </Button>
        <Button icon="trash" variant="danger" onClick={() => remove(item.id)}>
          {t('props.delete')}
        </Button>
      </div>
    </div>
  );
}

/* Fields keep a local draft and commit on Enter or blur, so typing does not create one undo step per keystroke. */

const blurOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') e.currentTarget.blur();
};

function TextField({ label, value, onCommit }: { label: string; value: string; onCommit(v: string): void }) {
  const [draft, setDraft] = useState(value);
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        className={styles.input}
        value={draft}
        maxLength={16}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => (draft.trim() ? onCommit(draft) : setDraft(value))}
        onKeyDown={blurOnEnter}
      />
    </label>
  );
}

function NumberField({ label, value, onCommit }: { label: string; value: number; onCommit(v: number): void }) {
  const [draft, setDraft] = useState(String(value));
  const commit = () => {
    const parsed = Number(draft.replace(',', '.'));
    if (Number.isFinite(parsed)) onCommit(parsed);
    // If snapping lands on the same value the field is not re-keyed, so show the real value again.
    setDraft(String(value));
  };
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label} (m)</span>
      <input
        className={styles.input}
        type="number"
        step={0.5}
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={blurOnEnter}
      />
    </label>
  );
}
