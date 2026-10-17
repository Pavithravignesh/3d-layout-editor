import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { publishPerf } from '../state/perfStore';

/**
 * Lives inside the canvas and samples the renderer twice a second. Readers outside the canvas
 * subscribe to the snapshot, so the 3D scene never re-renders React to show these numbers.
 */
export function PerfProbe() {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  const since = useRef(performance.now());

  useFrame(() => {
    frames.current += 1;
    const now = performance.now();
    const elapsed = now - since.current;
    if (elapsed < 500) return;
    const fps = (frames.current * 1000) / elapsed;
    const throttled = document.hidden || elapsed > 2000; // a hidden tab is not a real measurement
    if (!throttled) {
      publishPerf({
        fps: Math.round(fps),
        frameMs: Math.round((elapsed / frames.current) * 10) / 10,
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
      });
    }
    frames.current = 0;
    since.current = now;
  });
  return null;
}
