import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleFieldProps {
  count?: number;
  mousePosition: React.MutableRefObject<{ x: number; y: number }>;
}

function ParticleField({ count = 150, mousePosition }: ParticleFieldProps) {
  const meshRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const { viewport } = useThree();

  // Generate particles
  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const colorPalette = [
      new THREE.Color('#3b82f6'), // Blue
      new THREE.Color('#8b5cf6'), // Purple
      new THREE.Color('#06b6d4'), // Cyan
    ];

    for (let i = 0; i < count; i++) {
      // Spherical distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 3 + Math.random() * 4;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 2 + Math.random() * 2;
    }

    return { positions, colors, sizes };
  }, [count]);

  // Particle velocities
  const velocities = useMemo(() => {
    const vels = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      vels[i * 3] = (Math.random() - 0.5) * 0.002;
      vels[i * 3 + 1] = (Math.random() - 0.5) * 0.002;
      vels[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }
    return vels;
  }, [count]);

  // Create buffer geometry with proper attributes
  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geometry;
  }, [positions, colors, sizes]);

  // Line geometry for connections
  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(count * 6); // 2 points per line, 3 coords each
    geometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    return geometry;
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;

    const positionsArray = meshRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;

    // Update particle positions
    for (let i = 0; i < count; i++) {
      const idx = i * 3;

      // Apply velocity with Perlin-like noise
      positionsArray[idx] += velocities[idx] + Math.sin(time * 0.5 + i) * 0.0005;
      positionsArray[idx + 1] += velocities[idx + 1] + Math.cos(time * 0.3 + i) * 0.0005;
      positionsArray[idx + 2] += velocities[idx + 2] + Math.sin(time * 0.4 + i) * 0.0005;

      // Mouse repulsion
      const mouseX = (mousePosition.current.x / window.innerWidth) * 2 - 1;
      const mouseY = -(mousePosition.current.y / window.innerHeight) * 2 + 1;
      const dx = positionsArray[idx] - mouseX * viewport.width * 0.5;
      const dy = positionsArray[idx + 1] - mouseY * viewport.height * 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 1.5) {
        const force = (1.5 - dist) * 0.01;
        positionsArray[idx] += (dx / dist) * force;
        positionsArray[idx + 1] += (dy / dist) * force;
      }

      // Keep particles in bounds
      const bound = 6;
      if (Math.abs(positionsArray[idx]) > bound) velocities[idx] *= -1;
      if (Math.abs(positionsArray[idx + 1]) > bound) velocities[idx + 1] *= -1;
      if (Math.abs(positionsArray[idx + 2]) > bound) velocities[idx + 2] *= -1;
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;

    // Update connections
    if (linesRef.current) {
      const linePositions = linesRef.current.geometry.attributes.position.array as Float32Array;
      let lineIndex = 0;
      const maxConnections = 3;
      const connectionDistance = 2;

      for (let i = 0; i < count && lineIndex < count * 6; i++) {
        let connections = 0;
        const idx1 = i * 3;

        for (let j = i + 1; j < count && connections < maxConnections && lineIndex < count * 6; j++) {
          const idx2 = j * 3;
          const dx = positionsArray[idx1] - positionsArray[idx2];
          const dy = positionsArray[idx1 + 1] - positionsArray[idx2 + 1];
          const dz = positionsArray[idx1 + 2] - positionsArray[idx2 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < connectionDistance) {
            linePositions[lineIndex++] = positionsArray[idx1];
            linePositions[lineIndex++] = positionsArray[idx1 + 1];
            linePositions[lineIndex++] = positionsArray[idx1 + 2];
            linePositions[lineIndex++] = positionsArray[idx2];
            linePositions[lineIndex++] = positionsArray[idx2 + 1];
            linePositions[lineIndex++] = positionsArray[idx2 + 2];
            connections++;
          }
        }
      }

      // Clear remaining line positions
      while (lineIndex < count * 6) {
        linePositions[lineIndex++] = 0;
      }

      linesRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Slow rotation of entire field
    meshRef.current.rotation.y = time * 0.02;
    if (linesRef.current) {
      linesRef.current.rotation.y = time * 0.02;
    }
  });

  return (
    <>
      <points ref={meshRef} geometry={particleGeometry}>
        <pointsMaterial
          size={0.08}
          vertexColors
          transparent
          opacity={0.8}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
      <lineSegments ref={linesRef} geometry={lineGeometry}>
        <lineBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </>
  );
}

function CameraController() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.z = 8;
  }, [camera]);

  return null;
}

export function NeuralNetworkBackground() {
  const mousePosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosition.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <CameraController />
        <ambientLight intensity={0.5} />
        <ParticleField count={120} mousePosition={mousePosition} />
      </Canvas>
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-radial pointer-events-none" />
    </div>
  );
}

export default NeuralNetworkBackground;
