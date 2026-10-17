import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, Panel } from '../design-system/Panel';
import { useFormat } from '../i18n';
import { useEditor, useViolations } from '../state/editorStore';
import { Announcer } from '../ui/Announcer';
import { BomTable } from '../ui/BomTable';
import { ItemList } from '../ui/ItemList';
import { Palette } from '../ui/Palette';
import { PropertiesPanel } from '../ui/PropertiesPanel';
import { RulePanel } from '../ui/RulePanel';
import { TopBar } from '../ui/TopBar';
import styles from './App.module.css';
import { ErrorBoundary } from './ErrorBoundary';
import { useShortcuts } from './useShortcuts';

// The 3D view (three.js and friends) loads after the panels, so the app is usable sooner.
const Viewport = lazy(() => import('../scene/Viewport').then((m) => ({ default: m.Viewport })));

export function App() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const itemCount = useEditor((s) => s.layout.items.length);
  const violationCount = useViolations().length;
  useShortcuts();

  return (
    <div className={styles.app}>
      <TopBar className={styles.top} />

      <aside className={styles.left}>
        <Panel title={t('panels.palette')}>
          <Palette />
        </Panel>
        <Panel title={t('panels.list')} meta={itemCount ? fmt.number(itemCount, 0) : undefined} className={styles.grow}>
          <ItemList />
        </Panel>
      </aside>

      <main className={styles.center}>
        <ErrorBoundary
          fallback={
            <div className={styles.fallback}>
              <EmptyState title={t('error.webgl')} hint={t('error.webglHint')} />
            </div>
          }
        >
          <Suspense
            fallback={
              <div className={styles.fallback} aria-busy="true">
                <EmptyState title={t('viewport.loading')} />
              </div>
            }
          >
            <Viewport />
          </Suspense>
        </ErrorBoundary>
        <Panel title={t('panels.bom')} className={styles.bom}>
          <BomTable />
        </Panel>
      </main>

      <aside className={styles.right}>
        <Panel title={t('panels.properties')}>
          <PropertiesPanel />
        </Panel>
        <Panel
          title={t('panels.rules')}
          meta={violationCount ? <span className={styles.badge}>{fmt.number(violationCount, 0)}</span> : undefined}
          className={styles.grow}
        >
          <RulePanel />
        </Panel>
      </aside>

      <Announcer />
    </div>
  );
}
