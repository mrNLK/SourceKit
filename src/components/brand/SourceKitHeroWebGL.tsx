import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

/**
 * SourceKitHeroWebGL
 *
 * Cinematic particle field with cursor parallax and pulsing signal node.
 * GPU-rendered via Three.js. True depth, real-time interaction.
 *
 * Requires: npm install three @react-three/fiber @react-three/drei
 *
 * Add to vite.config.ts optimizeDeps.include:
 *   ["three", "@react-three/fiber", "@react-three/drei"]
 *
 * Use in: landing page hero only. Heavy dependency (~150KB gzipped).
 * For lighter alternatives, use SourceKitHeroMark or SourceKitHeroCinematic
 * with framer-motion (~30KB gzipped).
 */

function ParticleField() {
  const ref = useRef<THREE.Points>(null!);

  const positions = useMemo(() => {
    const count = 1200;
    const arr = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const radius = 3 + Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      arr[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = radius * Math.cos(phi);
    }

    return arr;
  }, []);

  useFrame(({ clock, pointer }) => {
    const t = clock.elapsedTime;
    ref.current.rotation.y = t * 0.05 + pointer.x * 0.25;
    ref.current.rotation.x = pointer.y * 0.15;
  });

  return (
    <Points ref={ref} positions={positions} stride={3}>
      <PointMaterial
        color="#00E5A0"
        size={0.025}
        transparent
        opacity={0.4}
        depthWrite={false}
      />
    </Points>
  );
}

function FocusNode() {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const scale = 1 + Math.sin(t * 2) * 0.12;
    ref.current.scale.set(scale, scale, scale);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.12, 32, 32]} />
      <meshBasicMaterial color="#00E5A0" />
    </mesh>
  );
}

export default function SourceKitHeroWebGL() {
  return (
    <div
      style={{
        width: "100%",
        height: "420px",
        background: "#0A0A0F",
      }}
    >
      <Canvas camera={{ position: [0, 0, 7] }}>
        <ambientLight intensity={0.5} />
        <ParticleField />
        <FocusNode />
      </Canvas>
    </div>
  );
}
