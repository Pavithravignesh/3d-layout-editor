import { Bounds } from '@react-three/drei';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import { CLEARANCE } from '../domain/floor';
import { bounds, gapBetween, round, snapToGrid } from '../domain/geometry';
import { clampGroupDelta } from '../domain/group';
import { findViolations, violatingIds } from '../domain/rules';
import type { Item, Rotation } from '../domain/types';
import { useEditor, useViolations } from '../state/editorStore';
import { floorPointFromRay } from './coords';
import { Floor } from './Floor';
import { ItemsLayer } from './ItemsLayer';
import { GroupOutline, PlacementGhost, SelectionMarker } from './Markers';

/** A drag moves every item in `ids` by the same snapped, clamped delta from where it started. */
type Drag = { anchor: Item; ids: ReadonlySet<string>; offsetX: number; offsetZ: number; dx: number; dz: number };
type ControlsLike = { enabled: boolean } | null;

const CLICK_TOLERANCE_PX = 4;

/**
 * Everything inside the canvas. Drags and placement previews are kept in local state and only
 * committed to the store (and its undo history) when the pointer is released.
 */
export function SceneContent() {
  const items = useEditor((s) => s.layout.items);
  const selectedIds = useEditor((s) => s.selectedIds);
  const selectedId = useEditor((s) => s.selectedId);
  const placing = useEditor((s) => s.placing);
  const { select, toggleSelect, place, moveSelection, startPlacing } = useEditor.getState();
  const committedViolations = useViolations();
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike;

  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<{ x: number; z: number } | null>(null);

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const displayItems = useMemo(() => {
    if (!drag || (drag.dx === 0 && drag.dz === 0)) return items;
    return items.map((i) => (drag.ids.has(i.id) ? { ...i, x: round(i.x + drag.dx), z: round(i.z + drag.dz) } : i));
  }, [items, drag]);
  // While dragging, the rule runs on the preview positions so conflicts show before release.
  const violations = useMemo(
    () => (displayItems !== items ? findViolations(displayItems) : committedViolations),
    [displayItems, items, committedViolations],
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

  const primary = displayItems.find((i) => i.id === selectedId) ?? null;
  const group = useMemo(() => (selected.size > 1 ? displayItems.filter((i) => selected.has(i.id)) : []), [displayItems, selected]);

  useEffect(() => {
    gl.domElement.style.cursor = drag ? 'grabbing' : placing ? 'crosshair' : '';
  }, [gl, drag, placing]);

  useEffect(() => {
    if (!placing) setHover(null);
  }, [placing]);

  const onItemPointerDown = (item: Item, e: ThreeEvent<PointerEvent>) => {
    if (placing || e.button !== 0) return;
    e.stopPropagation();
    const native = e.nativeEvent;
    if (native.ctrlKey || native.metaKey || native.shiftKey) {
      toggleSelect(item.id);
      return;
    }
    // Pressing on an item that is already part of the selection drags the whole group.
    const ids = selected.has(item.id) ? new Set(selectedIds) : new Set([item.id]);
    if (!selected.has(item.id)) select(item.id);
    const point = floorPointFromRay(e.ray);
    if (!point) return;
    (e.target as unknown as Element).setPointerCapture(e.pointerId);
    if (controls) controls.enabled = false;
    setDrag({ anchor: item, ids, offsetX: item.x - point.x, offsetZ: item.z - point.z, dx: 0, dz: 0 });
  };

  const onItemPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drag) return;
    e.stopPropagation();
    const point = floorPointFromRay(e.ray);
    if (!point) return;
    const { anchor } = drag;
    const target = snapToGrid(anchor.type, anchor.rotation, point.x + drag.offsetX, point.z + drag.offsetZ);
    const moving = items.filter((i) => drag.ids.has(i.id));
    const next = clampGroupDelta(moving, target.x - anchor.x, target.z - anchor.z);
    if (next.dx !== drag.dx || next.dz !== drag.dz) setDrag({ ...drag, ...next });
  };

  const onItemPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!drag) return;
    e.stopPropagation();
    (e.target as unknown as Element).releasePointerCapture(e.pointerId);
    if (controls) controls.enabled = true;
    moveSelection(drag.dx, drag.dz);
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
        selected={selected}
        onItemPointerDown={onItemPointerDown}
        onItemPointerMove={onItemPointerMove}
        onItemPointerUp={onItemPointerUp}
      />
      {group.length > 1 && <GroupOutline items={group} />}
      {primary && <SelectionMarker item={primary} label={primary.label} warning={violating.has(primary.id)} />}
      {ghost && <PlacementGhost item={ghost} conflict={ghostConflict} />}
    </>
  );
}
