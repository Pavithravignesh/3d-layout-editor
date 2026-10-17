import { useTranslation } from 'react-i18next';
import { Button } from '../design-system/Button';
import { Icon } from '../design-system/Icon';
import { LANGUAGES } from '../i18n';
import styles from './TopBar.module.css';

export function TopBar({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();

  return (
    <header className={[styles.bar, className].filter(Boolean).join(' ')}>
      <div className={styles.brand}>
        <span className={styles.mark}>
          <Icon name="layers" size={16} />
        </span>
        <div>
          <h1 className={styles.title}>{t('app.title')}</h1>
          <p className={styles.project}>{t('app.project')}</p>
        </div>
      </div>

      <div className={styles.tools}>
        <Button variant="ghost" icon="undo" label={t('toolbar.undo')} disabled />
        <Button variant="ghost" icon="redo" label={t('toolbar.redo')} disabled />
      </div>

      <div className={styles.end}>
        <div className={styles.segmented} role="group" aria-label={t('toolbar.language')}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              className={styles.segment}
              aria-pressed={i18n.language === lang.code}
              aria-label={lang.name}
              title={lang.name}
              lang={lang.code}
              onClick={() => void i18n.changeLanguage(lang.code)}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
