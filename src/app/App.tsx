import { useTranslation } from 'react-i18next';
import { EmptyState, Panel } from '../design-system/Panel';
import { CLEARANCE } from '../domain/floor';
import { useFormat } from '../i18n';
import { Viewport } from '../scene/Viewport';
import { Palette } from '../ui/Palette';
import { TopBar } from '../ui/TopBar';
import styles from './App.module.css';

export function App() {
  const { t } = useTranslation();
  const fmt = useFormat();

  return (
    <div className={styles.app}>
      <TopBar className={styles.top} />

      <aside className={styles.left}>
        <Panel title={t('panels.palette')}>
          <Palette />
        </Panel>
        <Panel title={t('panels.list')} className={styles.grow}>
          <EmptyState title={t('empty.list')} hint={t('empty.listHint')} />
        </Panel>
      </aside>

      <main className={styles.center}>
        <Viewport />
        <Panel title={t('panels.bom')} className={styles.bom}>
          <EmptyState title={t('empty.bom')} hint={t('empty.bomHint')} />
        </Panel>
      </main>

      <aside className={styles.right}>
        <Panel title={t('panels.properties')}>
          <EmptyState title={t('empty.properties')} hint={t('empty.propertiesHint')} />
        </Panel>
        <Panel title={t('panels.rules')} className={styles.grow}>
          <EmptyState title={t('empty.rules')} hint={t('empty.rulesHint', { clearance: fmt.number(CLEARANCE) })} />
        </Panel>
      </aside>
    </div>
  );
}
