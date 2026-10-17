import { Bounds } from '@react-three/drei';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import { CLEARANCE } from '../domain/floor';
import { bounds, gapBetween, snapToGrid } from '../domain/geometry';
import { findViolations, violatingIds } from '../domain/rules';
import type { Item, Rotation } from '../domain/types';
import { useEditor, useViolations } from '../state/editorStore';
import { floorPointFromRay } from './coords';
import { Floor } from './Floor';
import { ItemsLayer } from './ItemsLayer';
import { PlacementGhost, SelectionMarker } from './Markers';

type Drag = { id: string; x: number; z: number; offsetX: number; offsetZ: number };
type ControlsLike = { enabled: boolean } | null;

const CLICK_TOLERANCE_PX = 4;

/**
 * Everything inside the canvas. Drags and placement previews are kept in local state and only
 * committed to the store (and its undo history) when the pointer is released.
 */
export function SceneContent() {
  const items = useEditor((s) => s.layout.items);
  const selectedId = useEditor((s) => s.selectedId);
  const placing = useEditor((s) => s.placing);
  const { select, place, move, startPlacing } = useEditor.getState();
  const committedViolations = useViolations();
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike;

  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<{ x: number; z: number } | null>(null);

  const displayItems = useMemo(
    () => (drag ? items.map((i) => (i.id === drag.id ? { ...i, x: drag.x, z: drag.z } : i)) : items),
    [items, drag],
  );
  // While dragging, the rule runs on the preview position so conflicts show before release.
  const violations = useMemo(
    () => (drag ? findViolations(displayItems) : committedViolations),
    [drag, displayItems, committedViolations],
  );
  const violating = useMemo(() => violatingIds(violations), [violations]);

  const ghost = useMemo(
    () => (placing && hover ? { type: placing, rotation: 0 as Rotation, ...hover } : null),
    [placing, hover],
  );
  const ghostConflict = useMemo(() => {
    if (!ghost) return false;
    const box = bounds(ghost);
    return displayItems.some((i) => gapBetween(bounds(i), box) < CLEARANCE);
  }, [ghost, displayItems]);

  const selected = displayItems.find((i) => i.id === selectedId) ?? null;

  useEffect(() => {
    gl.domElement.style.cursor = drag ? 'grabbing' : placing ? 'crosshair' : '';
  }, [gl, drag, placing]);

  useEffect(() => {
    if (!placing) setHover(null);
  }, [placing]);

  const onItemPointerDown = (item: Item, e: ThreeEvent<PointerEvent>) => {
    if (placing || e.button !== 0) return;
    e.stopPropagation();
    select(item.id);
    const point = floorPointFromRay(e.ray);
    if (!point) return;
    (e.target as unknown as Element).setPointerCapture(e.pointerId);
    if (controls) controls.enabled = false;
    setDrag({ id: item.id, x: item.x, z: item.z, offsetX: item.x - point.x, offsetZ: item.z - point.z });
  };

  const onItemPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drag) return;
    e.stopPropagation();
    const point = floorPointFromRay(e.ray);
    const item = items.find((i) => i.id === drag.id);
    if (!point || !item) return;
    const next = snapToGrid(item.type, item.rotation, point.x + drag.offsetX, point.z + drag.offsetZ);
    if (next.x !== drag.x || next.z !== drag.z) setDrag({ ...drag, ...next });
  };

  const onItemPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!drag) return;
    e.stopPropagation();
    (e.target as unknown as Element).releasePointerCapture(e.pointerId);
    if (controls) controls.enabled = true;
    move(drag.id, drag.x, drag.z);
    setDrag(null);
  };

  const onFloorPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!placing) return;
    const point = floorPointFromRay(e.ray);
    if (!point) return;
    const next = snapToGrid(placing, 0, point.x, point.z);
    if (next.x !== hover?.x || next.z !== hover?.z) setHover(next);
  };

  const onFloorClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > CLICK_TOLERANCE_PX) return; // the pointer moved: it was an orbit, not a click
    if (placing) {
      const point = floorPointFromRay(e.ray);
      if (!point) return;
      place(placing, point.x, point.z);
      if (!e.nativeEvent.shiftKey) startPlacing(null);
      return;
    }
    const hitItem = e.intersections.some((i) => i.instanceId !== undefined);
    if (!hitItem) select(null);
  };

  return (
    <>
      <Bounds fit observe margin={1.08}>
        <Floor onPointerMove={onFloorPointerMove} onPointerLeave={() => setHover(null)} onClick={onFloorClick} />
      </Bounds>
      <ItemsLayer
        items={displayItems}
        violating={violating}
        onItemPointerDown={onItemPointerDown}
        onItemPointerMove={onItemPointerMove}
        onItemPointerUp={onItemPointerUp}
      />
      {selected && <SelectionMarker item={selected} label={selected.label} warning={violating.has(selected.id)} />}
      {ghost && <PlacementGhost item={ghost} conflict={ghostConflict} />}
    </>
  );
}
