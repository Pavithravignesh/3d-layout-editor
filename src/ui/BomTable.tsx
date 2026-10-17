import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../design-system/Panel';
import { billOfMaterials } from '../domain/bom';
import { getItemType } from '../domain/catalog';
import { useFormat } from '../i18n';
import { useEditor } from '../state/editorStore';
import styles from './BomTable.module.css';

/** Bill of materials counted live from the scene. */
export function BomTable() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const items = useEditor((s) => s.layout.items);
  const lines = useMemo(() => billOfMaterials(items), [items]);

  if (lines.length === 0) return <EmptyState title={t('empty.bom')} hint={t('empty.bomHint')} />;

  return (
    <table className={styles.table}>
      <caption className="visually-hidden">{t('panels.bom')}</caption>
      <thead>
        <tr>
          <th scope="col">{t('bom.item')}</th>
          <th scope="col">{t('bom.code')}</th>
          <th scope="col">{t('bom.size')}</th>
          <th scope="col" className={styles.num}>
            {t('bom.quantity')}
          </th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => {
          const type = getItemType(line.type);
          return (
            <tr key={line.type}>
              <th scope="row">
                <span className={styles.swatch} style={{ background: type.color }} aria-hidden="true" />
                {t(`items.${line.type}`)}
              </th>
              <td className={styles.code}>{type.prefix}</td>
              <td>{t('palette.size', { w: fmt.number(type.size.w), d: fmt.number(type.size.d), h: fmt.number(type.size.h) })}</td>
              <td className={styles.num}>{fmt.number(line.quantity, 0)}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" colSpan={3}>
            {t('bom.total')}
          </th>
          <td className={styles.num}>{fmt.number(items.length, 0)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
