import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useTranslation } from 'react-i18next';
import { FLOOR } from '../domain/floor';
import { useFormat } from '../i18n';
import { useEditor } from '../state/editorStore';
import { SceneContent } from './SceneContent';
import styles from './Viewport.module.css';

export function Viewport() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const placing = useEditor((s) => s.placing);

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
      <p className={styles.help}>{placing ? t('palette.placingHint') : t('viewport.help')}</p>
    </div>
  );
}
