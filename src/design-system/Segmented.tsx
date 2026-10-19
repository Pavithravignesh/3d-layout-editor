import styles from './Segmented.module.css';

export type SegmentedOption<T> = {
  value: T;
  label: string;
  /** Full name for screen readers and the tooltip, when the label is short (e.g. "EN"). */
  title?: string;
  lang?: string;
};

type SegmentedProps<T> = {
  /** Names the group for screen readers. */
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange(value: T): void;
  className?: string;
};

/** A row of toggle buttons where exactly one is pressed, e.g. a language or display switch. */
export function Segmented<T extends string | boolean>({ label, value, options, onChange, className }: SegmentedProps<T>) {
  return (
    <div className={[styles.group, className].filter(Boolean).join(' ')} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          className={styles.segment}
          aria-pressed={value === option.value}
          aria-label={option.title}
          title={option.title}
          lang={option.lang}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
