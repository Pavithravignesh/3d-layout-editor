import { useTranslation } from 'react-i18next';
import { CATALOG } from '../domain/catalog';
import { useFormat } from '../i18n';
import styles from './Palette.module.css';

export function Palette() {
  const { t } = useTranslation();
  const fmt = useFormat();

  return (
    <ul className={styles.list}>
      {CATALOG.map((type) => (
        <li key={type.id}>
          <button type="button" className={styles.item}>
            <span className={styles.swatch} style={{ background: type.color }} aria-hidden="true" />
            <span className={styles.text}>
              <span className={styles.name}>{t(`items.${type.id}`)}</span>
              <span className={styles.size}>
                {t('palette.size', {
                  w: fmt.number(type.size.w),
                  d: fmt.number(type.size.d),
                  h: fmt.number(type.size.h),
                })}
              </span>
            </span>
            <span className={styles.prefix}>{type.prefix}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
