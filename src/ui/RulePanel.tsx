import { useTranslation } from 'react-i18next';
import { EmptyState } from '../design-system/Panel';
import { Icon } from '../design-system/Icon';
import { CLEARANCE } from '../domain/floor';
import { useFormat } from '../i18n';
import { useEditor, useViolations } from '../state/editorStore';
import styles from './RulePanel.module.css';

/** Rendering every pair of a 500-item stress test would add nothing; the count tells the story. */
const MAX_SHOWN = 50;

/** Live list of clearance violations, each naming both items. Clicking one selects it. */
export function RulePanel() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const violations = useViolations();
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);

  if (violations.length === 0) {
    return <EmptyState title={t('empty.rules')} hint={t('empty.rulesHint', { clearance: fmt.number(CLEARANCE) })} />;
  }

  return (
    <div>
      <p className={styles.summary}>{t('rules.minimum', { clearance: fmt.number(CLEARANCE) })}</p>
      <ul className={styles.list}>
        {violations.slice(0, MAX_SHOWN).map((v) => {
          const involved = v.a.id === selectedId || v.b.id === selectedId;
          return (
            <li key={`${v.a.id}|${v.b.id}`}>
              <button
                type="button"
                className={styles.item}
                aria-current={involved || undefined}
                onClick={() => select(v.a.id === selectedId ? v.b.id : v.a.id)}
              >
                <Icon name="warning" size={16} className={styles.icon} />
                <span>
                  {v.gap === 0
                    ? t('rules.overlap', { a: v.a.label, b: v.b.label })
                    : t('rules.tooClose', { a: v.a.label, b: v.b.label, gap: fmt.number(v.gap) })}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {violations.length > MAX_SHOWN && (
        <p className={styles.more}>{t('rules.more', { count: violations.length - MAX_SHOWN })}</p>
      )}
    </div>
  );
}
