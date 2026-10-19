import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  Color,
  InstancedBufferAttribute,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type InstancedMesh,
  type Material,
} from 'three';
import { CATALOG, type ItemType } from '../domain/catalog';
import type { Item } from '../domain/types';
import { useView } from '../state/viewStore';
import { useCabinetModel, type CabinetModel } from './cabinetModel';
import { degToRad, toWorld } from './coords';
import { PART_GEOMETRIES } from './itemParts';

const VIOLATION = new Color('#e03131');
const PLINTH_COLOR = new Color('#3b4250');
const FRONT_TINT = new Color('#ffffff');
const VIOLATION_FRONT = VIOLATION.clone().lerp(FRONT_TINT, 0.35);
const SELECTED = new Color('#1971c2');
const WHITE = new Color('#ffffff');
/** The textured model keeps its own colours; violation and selection still tint it. */
const MODEL_SELECTED = WHITE.clone().lerp(SELECTED, 0.55);

/** Each part decides its colour from the item's state. */
type ItemState = { bad: boolean; selected: boolean };
type Part = {
  key: string;
  geometry: BufferGeometry;
  material: Material;
  color(state: ItemState): Color;
  /** Clicking this part selects the item (the plinth is too low to aim at). */
  pickable: boolean;
};

type ItemsLayerProps = {
  items: readonly Item[];
  violating: ReadonlySet<string>;
  selected: ReadonlySet<string>;
  onItemPointerDown(item: Item, event: ThreeEvent<PointerEvent>): void;
  onItemPointerMove(event: ThreeEvent<PointerEvent>): void;
  onItemPointerUp(event: ThreeEvent<PointerEvent>): void;
};

/**
 * All placed items. Instanced: one draw call per part per type, whatever the number of items.
 * Not instanced (for comparison): one draw call per part per item.
 */
export function ItemsLayer({ items, ...rest }: ItemsLayerProps) {
  const look = useView((s) => s.look);
  const instancing = useView((s) => s.instancing);
  const cabinetModel = useCabinetModel(look === 'model');

  const byType = useMemo(() => {
    const groups = new Map<string, Item[]>(CATALOG.map((t) => [t.id, []]));
    for (const item of items) groups.get(item.type)?.push(item);
    return groups;
  }, [items]);

  return (
    <>
      {CATALOG.map((type) => (
        <TypeLayer
          key={type.id}
          type={type}
          model={type.id === 'cabinet' ? cabinetModel : null}
          instancing={instancing}
          items={byType.get(type.id) ?? []}
          {...rest}
        />
      ))}
    </>
  );
}

type TypeLayerProps = Omit<ItemsLayerProps, 'items'> & {
  type: ItemType;
  model: CabinetModel | null;
  instancing: boolean;
  items: readonly Item[];
};

function TypeLayer({ type, model, instancing, ...props }: TypeLayerProps) {
  const parts = useParts(type, model);
  return instancing ? <Instanced parts={parts} {...props} /> : <Individual parts={parts} {...props} />;
}

/** The parts of one item type, built once: three boxes, or the optimised model for cabinets. */
function useParts(type: ItemType, model: CabinetModel | null): Part[] {
  return useMemo<Part[]>(() => {
    if (model) {
      return [{ key: 'model', geometry: model.geometry, material: model.material, pickable: true, color: modelColor }];
    }
    const geometries = PART_GEOMETRIES[type.id];
    const base = new Color(type.color);
    const front = base.clone().lerp(FRONT_TINT, 0.35);
    const selected = base.clone().lerp(SELECTED, 0.45);
    return [
      {
        key: 'body',
        geometry: geometries.body,
        material: new MeshStandardMaterial({ roughness: 0.55, metalness: 0.15 }),
        pickable: true,
        color: (s) => (s.bad ? VIOLATION : s.selected ? selected : base),
      },
      {
        key: 'front',
        geometry: geometries.front,
        material: new MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 }),
        pickable: true,
        color: (s) => (s.bad ? VIOLATION_FRONT : front),
      },
      {
        key: 'plinth',
        geometry: geometries.plinth,
        material: new MeshStandardMaterial({ roughness: 0.8 }),
        pickable: false,
        color: (s) => (s.selected ? SELECTED : PLINTH_COLOR),
      },
    ];
  }, [type, model]);
}

const modelColor = (s: ItemState) => (s.bad ? VIOLATION : s.selected ? MODEL_SELECTED : WHITE);

type PartsProps = Omit<ItemsLayerProps, 'items'> & { parts: Part[]; items: readonly Item[] };

/** Pointer handlers shared by both drawing modes; `itemAt` maps a hit back to its item. */
function usePointer(
  itemAt: (e: ThreeEvent<PointerEvent>) => Item | undefined,
  { onItemPointerDown, onItemPointerMove, onItemPointerUp }: Omit<PartsProps, 'parts' | 'items' | 'violating' | 'selected'>,
) {
  const gl = useThree((s) => s.gl);
  return {
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      const item = itemAt(e);
      if (item) onItemPointerDown(item, e);
    },
    onPointerMove: onItemPointerMove,
    onPointerUp: onItemPointerUp,
    onPointerOver: () => (gl.domElement.style.cursor = 'pointer'),
    onPointerOut: () => (gl.domElement.style.cursor = ''),
  };
}

function itemMatrix(item: Item, matrix: Matrix4) {
  const [x, z] = toWorld(item.x, item.z);
  return matrix.compose(
    new Vector3(x, 0, z),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -degToRad(item.rotation)),
    new Vector3(1, 1, 1),
  );
}

function Instanced({ parts, items, violating, selected, ...handlers }: PartsProps) {
  const meshes = useRef<Array<InstancedMesh | null>>([]);
  // Capacity grows in steps so the meshes are rebuilt rarely, not on every placement.
  const capacity = Math.max(16, 2 ** Math.ceil(Math.log2(Math.max(items.length, 1))));

  useLayoutEffect(() => {
    const matrix = new Matrix4();
    for (const mesh of meshes.current) {
      // A material compiled without instance colours ignores ones added later, so create them up front.
      if (mesh && !mesh.instanceColor) {
        mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
        (mesh.material as Material).needsUpdate = true;
      }
    }
    items.forEach((item, i) => {
      itemMatrix(item, matrix);
      const state = { bad: violating.has(item.id), selected: selected.has(item.id) };
      parts.forEach((part, p) => {
        const mesh = meshes.current[p];
        mesh?.setMatrixAt(i, matrix);
        mesh?.setColorAt(i, part.color(state));
      });
    });
    for (const mesh of meshes.current) {
      if (!mesh) continue;
      mesh.count = items.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [items, violating, selected, parts, capacity]);

  const pointer = usePointer((e) => (e.instanceId === undefined ? undefined : items[e.instanceId]), handlers);

  return (
    <group key={`${capacity}-${parts.map((p) => p.key).join()}`}>
      {parts.map((part, p) => (
        <instancedMesh
          key={part.key}
          ref={(mesh) => (meshes.current[p] = mesh)}
          args={[part.geometry, part.material, capacity]}
          {...(part.pickable ? pointer : {})}
        />
      ))}
    </group>
  );
}

/** Materials per part and colour, shared by every item with that colour; new parts start empty. */
const tintedMaterials = new WeakMap<Part, Map<string, Material>>();

function materialFor(part: Part, color: Color) {
  let byColor = tintedMaterials.get(part);
  if (!byColor) tintedMaterials.set(part, (byColor = new Map()));
  const key = color.getHexString();
  let material = byColor.get(key);
  if (!material) {
    material = part.material.clone();
    (material as MeshStandardMaterial).color = color.clone();
    byColor.set(key, material);
  }
  return material;
}

/** One mesh per part per item: what the scene would cost without instancing. */
function Individual({ parts, items, violating, selected, ...handlers }: PartsProps) {
  const byMesh = new Map<number, Item>();
  const pointer = usePointer((e) => byMesh.get(e.object.id), handlers);

  return (
    <group>
      {items.map((item) => {
        const matrix = itemMatrix(item, new Matrix4());
        const state = { bad: violating.has(item.id), selected: selected.has(item.id) };
        return (
          <group key={item.id} matrixAutoUpdate={false} matrix={matrix}>
            {parts.map((part) => (
              <mesh
                key={part.key}
                ref={(mesh) => {
                  if (mesh) byMesh.set(mesh.id, item);
                }}
                geometry={part.geometry}
                material={materialFor(part, part.color(state))}
                {...(part.pickable ? pointer : {})}
              />
            ))}
          </group>
        );
      })}
    </group>
  );
}
