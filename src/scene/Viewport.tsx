import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useTranslation } from 'react-i18next';
import { FLOOR } from '../domain/floor';
import { useFormat } from '../i18n';
import { useEditor } from '../state/editorStore';
import { Segmented } from '../design-system/Segmented';
import { useView } from '../state/viewStore';
import { PerfProbe } from './perf';
import { SceneContent } from './SceneContent';
import styles from './Viewport.module.css';

/**
 * Display switches for the performance comparison: boxes, or the cabinet model before and after
 * optimisation; instancing on or off.
 */
function CompareControls() {
  const { t } = useTranslation();
  const { look, instancing, originalMissing, setLook, setInstancing } = useView();
  return (
    <div className={styles.controls} role="group" aria-label={t('compare.label')}>
      <Segmented
        label={t('compare.look')}
        value={look}
        options={[
          { value: 'boxes', label: t('compare.boxes') },
          ...(originalMissing ? [] : [{ value: 'original' as const, label: t('compare.originalLabel') }]),
          { value: 'optimised', label: t('compare.optimisedLabel') },
        ]}
        onChange={setLook}
      />
      <Segmented
        label={t('compare.instancing')}
        value={instancing}
        options={[
          { value: true, label: `${t('compare.instancing')}: ${t('compare.on')}` },
          { value: false, label: t('compare.off') },
        ]}
        onChange={setInstancing}
      />
    </div>
  );
}

/** Size of the Poly Haven source, from docs/model-optimisation/report.json. */
const ORIGINAL_BYTES = 27_058_219;

/** Download size, GPU texture memory and load time of each cabinet model loaded so far. */
function ModelLoads() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { look, loads, originalMissing } = useView();
  if (look === 'boxes') return null;
  const size = (bytes: number) =>
    bytes >= 1024 * 1024 ? `${fmt.number(bytes / 1024 / 1024, 1)} MB` : `${fmt.number(Math.round(bytes / 1024))} KB`;
  const line = (key: string, load: { bytes: number; gpuBytes: number; ms: number }) =>
    t(key, { size: size(load.bytes), gpu: size(load.gpuBytes), ms: fmt.number(load.ms) });

  return (
    <div className={styles.loads} role="status">
      {loads.original ? (
        <p>{line('compare.original', loads.original)}</p>
      ) : originalMissing ? (
        <p>{t('compare.originalMissing')}</p>
      ) : look === 'original' ? (
        <p>{t('compare.loadingOriginal')}</p>
      ) : (
        <p>{t('compare.originalHint', { size: size(ORIGINAL_BYTES) })}</p>
      )}
      {loads.optimised ? (
        <p>{line('compare.optimised', loads.optimised)}</p>
      ) : (
        look === 'optimised' && <p>{t('compare.loading')}</p>
      )}
    </div>
  );
}

export function Viewport() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const placing = useEditor((s) => s.placing);
  const selectionCount = useEditor((s) => s.selectedIds.length);

  return (
    <div className={styles.viewport} role="region" aria-label={t('viewport.label')}>
      <Canvas
        className={styles.canvas}
        camera={{ position: [11, 13, 15], fov: 40, near: 0.1, far: 200 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#f4f6f8']} />
        <hemisphereLight args={['#ffffff', '#d5dbe3', 1.1]} />
        <directionalLight position={[10, 18, 8]} intensity={1.3} />
        <SceneContent />
        <PerfProbe />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.12}
          minDistance={6}
          maxDistance={45}
          maxPolarAngle={Math.PI / 2.15}
        />
      </Canvas>

      <div className={styles.hud} aria-hidden="true">
        <span className={styles.chip}>
          {t('viewport.floor', {
            w: fmt.number(FLOOR.width),
            d: fmt.number(FLOOR.depth),
            cell: fmt.number(FLOOR.cell),
          })}
        </span>
        {placing && (
          <span className={`${styles.chip} ${styles.active}`}>
            {t('viewport.placing', { name: t(`items.${placing}`) })}
          </span>
        )}
      </div>
      <CompareControls />
      <ModelLoads />
      <p className={styles.help}>
        {placing
          ? t('palette.placingHint')
          : selectionCount > 1
            ? t('viewport.helpGroup')
            : selectionCount === 1
              ? t('viewport.helpSelected')
              : t('viewport.help')}
      </p>
    </div>
  );
}
