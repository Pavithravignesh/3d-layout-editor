import { useSyncExternalStore } from 'react';

export type PerfSnapshot = { fps: number; frameMs: number; drawCalls: number; triangles: number };

let snapshot: PerfSnapshot = { fps: 0, frameMs: 0, drawCalls: 0, triangles: 0 };
const listeners = new Set<() => void>();

/**
 * Written by the probe inside the 3D canvas, read by the top bar. Kept free of three.js imports
 * so the top bar does not pull the 3D code into the first download.
 */
export function publishPerf(next: PerfSnapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

/** The latest snapshot, for non-React readers such as error reports. */
export const getPerf = (): PerfSnapshot => snapshot;

export function usePerf(): PerfSnapshot {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
  );
}
