import { useLayoutEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "three";
import {
  cameraDistance, DEPTH_PER_DECADE, FLIGHT_FOV,
  type FlightModel, type FlightRecord,
} from "../lib/flight";

const BACKGROUND = "#09161c";

function CameraRail({ at, onLost }: { at: number; onLost: () => void }) {
  const { camera, size, invalidate, gl } = useThree();
  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const z = cameraDistance(size.width / size.height) - at * DEPTH_PER_DECADE;
    camera.position.set(0, 0, z);
    camera.lookAt(0, 0, z - 1);
    camera.updateProjectionMatrix();
    invalidate();
  }, [at, camera, size, invalidate]);
  useLayoutEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onLost(); };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onLost]);
  return null;
}

function Corridor({ model }: { model: FlightModel }) {
  const positions = useMemo(() => {
    const points: number[] = [];
    const line = (a: number[], b: number[]) => points.push(...a, ...b);
    const first = Math.floor(model.bounds.min) - 1;
    const last = Math.ceil(model.bounds.max) + 2;
    for (let decade = first; decade <= last; decade += 1) {
      const z = -decade * DEPTH_PER_DECADE;
      // Every gate represents exactly one decade, not a fabricated observation.
      line([-7, -4.8, z], [7, -4.8, z]);
      line([-7, -4.8, z], [-7, 4.8, z]);
      line([7, -4.8, z], [7, 4.8, z]);
      line([-7, 4.8, z], [7, 4.8, z]);
    }
    for (const x of [-7, -3.5, 0, 3.5, 7]) {
      line([x, -4.8, -first * DEPTH_PER_DECADE], [x, -4.8, -last * DEPTH_PER_DECADE]);
    }
    for (const x of [-7, 7]) {
      line([x, 4.8, -first * DEPTH_PER_DECADE], [x, 4.8, -last * DEPTH_PER_DECADE]);
    }
    return new Float32Array(points);
  }, [model]);
  return <lineSegments>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
    <lineBasicMaterial color="#456773" transparent opacity={0.48} />
  </lineSegments>;
}

function Landmark({ record, selected }: { record: FlightRecord; selected: boolean }) {
  const color = selected ? "#f2cf94" : record.kind === "reference" ? "#c7a782" : "#7ccabe";
  if (record.kind === "lines") return <group position={[record.x, record.y, 0]}>
    {record.lines.map((log) => <mesh key={log} position={[0, 0, -log * DEPTH_PER_DECADE]}>
      <boxGeometry args={[0.7, 0.65, 0.035]} /><meshBasicMaterial color={color} wireframe />
    </mesh>)}
  </group>;
  if (record.low === record.high) return <group position={[record.x, record.y, -record.low * DEPTH_PER_DECADE]}>
    {record.kind === "reference" ? <mesh>
      <octahedronGeometry args={[0.3, 0]} /><meshBasicMaterial color={color} wireframe />
    </mesh> : <>
      <mesh><sphereGeometry args={[selected ? 0.16 : 0.12, 12, 8]} /><meshBasicMaterial color={color} /></mesh>
      <mesh><torusGeometry args={[0.31, 0.018, 6, 32]} /><meshBasicMaterial color={color} transparent opacity={0.65} /></mesh>
    </>}
  </group>;
  const length = (record.high - record.low) * DEPTH_PER_DECADE;
  const width = record.kind === "spectrum" ? 0.95 : record.kind === "chirp" ? 0.35 : 0.55;
  const height = record.kind === "spectrum" ? 0.32 : record.kind === "chirp" ? 0.65 : 0.16;
  return <group position={[record.x, record.y, -(record.low + record.high) / 2 * DEPTH_PER_DECADE]}>
    {/* Only an extent: no invented amplitude envelope or time/frequency trajectory. */}
    {record.kind !== "reference" && <mesh>
      <boxGeometry args={[width, height, length]} />
      <meshBasicMaterial color={color} transparent opacity={selected ? 0.3 : 0.16} depthWrite={false} />
    </mesh>}
    <mesh>
      <boxGeometry args={[width, height, length]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={selected ? 1 : 0.65} />
    </mesh>
    {[-length / 2, length / 2].map((z) => <mesh key={z} position={[0, 0, z]}>
      <boxGeometry args={[width + 0.12, height + 0.12, 0.04]} />
      <meshBasicMaterial color={color} wireframe={record.kind === "reference"} />
    </mesh>)}
  </group>;
}

interface Props {
  model: FlightModel;
  at: number;
  selectedId: string | null;
  onReady: () => void;
  onLost: () => void;
}

export default function FlightScene({ model, at, selectedId, onReady, onLost }: Props) {
  return <Canvas
    frameloop="demand"
    dpr={[1, 1.5]}
    camera={{ fov: FLIGHT_FOV, near: 0.1, far: 125, position: [0, 0, 18] }}
    gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
    onCreated={onReady}
    fallback={<p className="flight-fallback">3D is unavailable. Browse the records below or use the 2D atlas.</p>}
  >
    <color attach="background" args={[BACKGROUND]} />
    <fog attach="fog" args={[BACKGROUND, 42, 120]} />
    <CameraRail at={at} onLost={onLost} />
    <Corridor model={model} />
    {model.records.map((record) => <Landmark key={record.id} record={record} selected={record.id === selectedId} />)}
  </Canvas>;
}
