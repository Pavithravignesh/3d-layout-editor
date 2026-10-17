import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, InstancedBufferAttribute, Matrix4, Quaternion, Vector3, type InstancedMesh, type Material } from 'three';
import { CATALOG, type ItemType } from '../domain/catalog';
import type { Item } from '../domain/types';
import { degToRad, toWorld } from './coords';
import { PART_GEOMETRIES } from './itemParts';

const VIOLATION = new Color('#e03131');
const PLINTH_COLOR = new Color('#3b4250');
const FRONT_TINT = new Color('#ffffff');

type ItemsLayerProps = {
  items: readonly Item[];
  violating: ReadonlySet<string>;
  onItemPointerDown(item: Item, event: ThreeEvent<PointerEvent>): void;
  onItemPointerMove(event: ThreeEvent<PointerEvent>): void;
  onItemPointerUp(event: ThreeEvent<PointerEvent>): void;
};

/** All placed items, drawn with one instanced mesh per part per type. */
export function ItemsLayer({ items, violating, ...handlers }: ItemsLayerProps) {
  const byType = useMemo(() => {
    const groups = new Map<string, Item[]>(CATALOG.map((t) => [t.id, []]));
    for (const item of items) groups.get(item.type)!.push(item);
    return groups;
  }, [items]);

  return (
    <>
      {CATALOG.map((type) => (
        <TypeInstances key={type.id} type={type} items={byType.get(type.id)!} violating={violating} {...handlers} />
      ))}
    </>
  );
}

type TypeInstancesProps = Omit<ItemsLayerProps, 'items'> & { type: ItemType; items: Item[] };

function TypeInstances({ type, items, violating, onItemPointerDown, onItemPointerMove, onItemPointerUp }: TypeInstancesProps) {
  const body = useRef<InstancedMesh>(null);
  const plinth = useRef<InstancedMesh>(null);
  const front = useRef<InstancedMesh>(null);
  const gl = useThree((s) => s.gl);
  const geometries = PART_GEOMETRIES[type.id];
  // Capacity grows in steps so the meshes are rebuilt rarely, not on every placement.
  const capacity = Math.max(16, 2 ** Math.ceil(Math.log2(Math.max(items.length, 1))));
  const baseColor = useMemo(() => new Color(type.color), [type.color]);
  const frontColor = useMemo(() => new Color(type.color).lerp(FRONT_TINT, 0.35), [type.color]);

  useLayoutEffect(() => {
    const matrix = new Matrix4();
    const position = new Vector3();
    const rotation = new Quaternion();
    const scale = new Vector3(1, 1, 1);
    const up = new Vector3(0, 1, 0);
    const meshes = [body.current, plinth.current, front.current];
    for (const mesh of meshes) {
      // A material compiled without instance colours ignores ones added later, so create them up front.
      if (mesh && !mesh.instanceColor) {
        mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
        (mesh.material as Material).needsUpdate = true;
      }
    }
    items.forEach((item, i) => {
      const [x, z] = toWorld(item.x, item.z);
      position.set(x, 0, z);
      rotation.setFromAxisAngle(up, -degToRad(item.rotation));
      matrix.compose(position, rotation, scale);
      for (const mesh of meshes) mesh?.setMatrixAt(i, matrix);
      const bad = violating.has(item.id);
      body.current?.setColorAt(i, bad ? VIOLATION : baseColor);
      front.current?.setColorAt(i, bad ? VIOLATION.clone().lerp(FRONT_TINT, 0.35) : frontColor);
      plinth.current?.setColorAt(i, PLINTH_COLOR);
    });
    for (const mesh of meshes) {
      if (!mesh) continue;
      mesh.count = items.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [items, violating, baseColor, frontColor, capacity]);

  const itemAt = (e: ThreeEvent<PointerEvent>) => (e.instanceId === undefined ? undefined : items[e.instanceId]);
  const pointer = {
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      const item = itemAt(e);
      if (item) onItemPointerDown(item, e);
    },
    onPointerMove: onItemPointerMove,
    onPointerUp: onItemPointerUp,
    onPointerOver: () => (gl.domElement.style.cursor = 'pointer'),
    onPointerOut: () => (gl.domElement.style.cursor = ''),
  };

  return (
    <group key={capacity}>
      <instancedMesh ref={body} args={[geometries.body, undefined, capacity]} {...pointer}>
        <meshStandardMaterial roughness={0.55} metalness={0.15} />
      </instancedMesh>
      <instancedMesh ref={front} args={[geometries.front, undefined, capacity]} {...pointer}>
        <meshStandardMaterial roughness={0.4} metalness={0.1} />
      </instancedMesh>
      <instancedMesh ref={plinth} args={[geometries.plinth, undefined, capacity]}>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
    </group>
  );
}
