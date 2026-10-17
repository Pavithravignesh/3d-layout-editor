import { Grid } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { FLOOR } from '../domain/floor';

const WALL = { thickness: 0.12, height: 0.3, color: '#cfd6de' };

type FloorProps = {
  onPointerMove?(event: ThreeEvent<PointerEvent>): void;
  onPointerLeave?(event: ThreeEvent<PointerEvent>): void;
  onClick?(event: ThreeEvent<MouseEvent>): void;
};

/** The 20 × 12 m floor with its 0.5 m grid and a low perimeter wall. The floor is centred on the world origin. */
export function Floor(handlers: FloorProps) {
  const { width, depth, cell } = FLOOR;
  const t = WALL.thickness;
  const walls: Array<[number, number, number, number]> = [
    [0, -depth / 2 - t / 2, width + 2 * t, t],
    [0, depth / 2 + t / 2, width + 2 * t, t],
    [-width / 2 - t / 2, 0, t, depth],
    [width / 2 + t / 2, 0, t, depth],
  ];

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} name="floor" {...handlers}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#eef1f4" roughness={0.95} />
      </mesh>
      <Grid
        position={[0, 0.002, 0]}
        args={[width, depth]}
        cellSize={cell}
        cellThickness={0.7}
        cellColor="#c3ccd6"
        sectionSize={1}
        sectionThickness={1.1}
        sectionColor="#9eabb9"
        fadeDistance={200}
        followCamera={false}
        infiniteGrid={false}
        raycast={() => null}
      />
      {walls.map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, WALL.height / 2, z]} raycast={() => null}>
          <boxGeometry args={[w, WALL.height, d]} />
          <meshStandardMaterial color={WALL.color} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}
