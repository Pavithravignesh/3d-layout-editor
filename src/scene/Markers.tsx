import { Edges, Html, Line } from '@react-three/drei';
import { getItemType, type ItemTypeId } from '../domain/catalog';
import { CLEARANCE } from '../domain/floor';
import { footprint } from '../domain/geometry';
import type { Rotation } from '../domain/types';
import { degToRad, toWorld } from './coords';
import { PART_GEOMETRIES } from './itemParts';
import styles from './Markers.module.css';

const ACCENT = '#1971c2';
const DANGER = '#e03131';
/** Overlays never take pointer events, so clicks always reach the floor and the items beneath. */
const noRaycast = () => null;

type Placed = { type: ItemTypeId; x: number; z: number; rotation: Rotation };

/** Rectangle outline on the floor, centred on the item. */
function FloorRect({ w, d, inset, color, dashed }: { w: number; d: number; inset: number; color: string; dashed?: boolean }) {
  const hw = w / 2 + inset;
  const hd = d / 2 + inset;
  return (
    <Line
      points={[[-hw, 0.006, -hd], [hw, 0.006, -hd], [hw, 0.006, hd], [-hw, 0.006, hd], [-hw, 0.006, -hd]]}
      color={color}
      lineWidth={dashed ? 1.2 : 2}
      dashed={dashed}
      dashSize={0.15}
      gapSize={0.1}
      raycast={noRaycast}
    />
  );
}

/** Outline, 0.6 m clearance zone and floating label for the selected item. */
export function SelectionMarker({ item, label, warning }: { item: Placed; label: string; warning: boolean }) {
  const { w, d } = footprint(item.type, item.rotation);
  const { h } = getItemType(item.type).size;
  const [x, z] = toWorld(item.x, item.z);
  const color = warning ? DANGER : ACCENT;

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.003, 0]} rotation-x={-Math.PI / 2} raycast={noRaycast}>
        <planeGeometry args={[w + 2 * CLEARANCE, d + 2 * CLEARANCE]} />
        <meshBasicMaterial color={color} transparent opacity={0.07} depthWrite={false} />
      </mesh>
      <FloorRect w={w} d={d} inset={CLEARANCE} color={color} dashed />
      <FloorRect w={w} d={d} inset={0.02} color={color} />
      <mesh position={[0, h / 2 + 0.01, 0]} raycast={noRaycast}>
        <boxGeometry args={[w + 0.04, h + 0.04, d + 0.04]} />
        <meshBasicMaterial visible={false} />
        <Edges color={color} lineWidth={1.5} />
      </mesh>
      <Html position={[0, h + 0.35, 0]} center zIndexRange={[10, 0]} className={styles.anchor}>
        <span className={[styles.label, warning && styles.warning].filter(Boolean).join(' ')}>{label}</span>
      </Html>
    </group>
  );
}

/** Translucent preview of the item about to be placed; red when it would break the clearance rule. */
export function PlacementGhost({ item, conflict }: { item: Placed; conflict: boolean }) {
  const { w, d } = footprint(item.type, item.rotation);
  const [x, z] = toWorld(item.x, item.z);
  const color = conflict ? DANGER : getItemType(item.type).color;
  const parts = PART_GEOMETRIES[item.type];

  return (
    <group position={[x, 0, z]} rotation-y={-degToRad(item.rotation)}>
      <mesh geometry={parts.body} raycast={noRaycast}>
        <meshStandardMaterial color={color} transparent opacity={0.45} depthWrite={false} />
      </mesh>
      <group rotation-y={degToRad(item.rotation)}>
        <FloorRect w={w} d={d} inset={CLEARANCE} color={conflict ? DANGER : ACCENT} dashed />
      </group>
    </group>
  );
}
