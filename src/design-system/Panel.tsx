import { useId, type ReactNode } from 'react';
import styles from './Panel.module.css';

type PanelProps = {
  title: string;
  /** Short status next to the title, e.g. a count. */
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Panel({ title, meta, actions, children, className }: PanelProps) {
  const headingId = useId();
  return (
    <section className={[styles.panel, className].filter(Boolean).join(' ')} aria-labelledby={headingId}>
      <header className={styles.header}>
        <h2 id={headingId} className={styles.title}>
          {title}
        </h2>
        {meta != null && <span className={styles.meta}>{meta}</span>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{title}</p>
      {hint && <p className={styles.emptyHint}>{hint}</p>}
    </div>
  );
}
