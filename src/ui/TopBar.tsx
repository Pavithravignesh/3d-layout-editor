import { useTranslation } from 'react-i18next';
import { Button } from '../design-system/Button';
import { Icon } from '../design-system/Icon';
import { Segmented } from '../design-system/Segmented';
import { LANGUAGES, useFormat } from '../i18n';
import { useEditor } from '../state/editorStore';
import { usePerf } from '../state/perfStore';
import styles from './TopBar.module.css';

const TEST_ITEMS = 500;

function PerfReadout() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const perf = usePerf();
  const items = useEditor((s) => s.layout.items.length);
  return (
    <p className={styles.perf} title={t('perf.title')}>
      <strong className={perf.fps && perf.fps < 50 ? styles.slow : undefined}>
        {t('perf.fps', { fps: perf.fps ? perf.fps : '–' })}
      </strong>
      <span>{t('perf.frame', { ms: perf.fps ? fmt.number(perf.frameMs, 1) : '–' })}</span>
      <span>{t('perf.calls', { count: perf.drawCalls })}</span>
      <span>{t('perf.items', { count: items })}</span>
    </p>
  );
}

export function TopBar({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const lastDone = useEditor((s) => s.history.past.at(-1));
  const nextRedo = useEditor((s) => s.history.future[0]);
  const { undo, redo } = useEditor.getState();

  const describe = (command: typeof lastDone) =>
    command ? t(`actions.${command.kind}`, { target: command.target }) : undefined;

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
        <Button
          variant="ghost"
          icon="undo"
          label={lastDone ? t('toolbar.undoAction', { action: describe(lastDone) }) : t('toolbar.undo')}
          disabled={!lastDone}
          onClick={undo}
        />
        <Button
          variant="ghost"
          icon="redo"
          label={nextRedo ? t('toolbar.redoAction', { action: describe(nextRedo) }) : t('toolbar.redo')}
          disabled={!nextRedo}
          onClick={redo}
        />
      </div>

      <div className={styles.end}>
        <PerfReadout />
        <Button icon="box" size="sm" onClick={() => useEditor.getState().loadTestLayout(TEST_ITEMS)}>
          {t('perf.load', { count: TEST_ITEMS })}
        </Button>
        <Segmented
          label={t('toolbar.language')}
          value={i18n.language}
          options={LANGUAGES.map((lang) => ({ value: lang.code, label: lang.label, title: lang.name, lang: lang.code }))}
          onChange={(code) => void i18n.changeLanguage(code)}
        />
      </div>
    </header>
  );
}
