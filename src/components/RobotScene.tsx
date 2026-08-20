import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, Suspense } from 'react';
import { OrbitControls, MeshDistortMaterial, Sphere, Box, Cylinder, Torus } from '@react-three/drei';
import * as THREE from 'three';

function RobotBody() {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const eyeL = useRef<THREE.Mesh>(null);
  const eyeR = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      // Gentle float
      groupRef.current.position.y = Math.sin(t * 0.8) * 0.08;
      groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.15;
    }
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.6) * 0.12;
    }
    // Pulsing eye glow
    const pulse = (Math.sin(t * 2) + 1) / 2;
    if (eyeL.current) {
      (eyeL.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2 + pulse * 0.8;
    }
    if (eyeR.current) {
      (eyeR.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2 + pulse * 0.8;
    }
  });

  const metalMat = {
    color: '#1a1a2e',
    metalness: 0.95,
    roughness: 0.08,
    envMapIntensity: 1,
  };
  const accentMat = {
    color: '#8B5CF6',
    metalness: 0.3,
    roughness: 0.2,
    emissive: '#6d28d9',
    emissiveIntensity: 0.4,
  };
  const eyeMat = {
    color: '#8B5CF6',
    emissive: '#8B5CF6',
    emissiveIntensity: 1.5,
    metalness: 0,
    roughness: 0.1,
  };

  return (
    <group ref={groupRef}>
      {/* Torso */}
      <Box args={[1.1, 1.4, 0.7]} position={[0, 0, 0]} castShadow>
        <meshStandardMaterial {...metalMat} />
      </Box>

      {/* Chest plate accent */}
      <Box args={[0.65, 0.55, 0.72]} position={[0, 0.18, 0]}>
        <meshStandardMaterial {...accentMat} />
      </Box>

      {/* Chest light strip */}
      <Box args={[0.04, 0.42, 0.73]} position={[0, 0.18, 0]}>
        <meshStandardMaterial color="#8B5CF6" emissive="#8B5CF6" emissiveIntensity={1.8} metalness={0} roughness={0} />
      </Box>

      {/* Neck */}
      <Cylinder args={[0.18, 0.22, 0.22, 12]} position={[0, 0.78, 0]}>
        <meshStandardMaterial {...metalMat} />
      </Cylinder>

      {/* Head */}
      <group ref={headRef} position={[0, 1.22, 0]}>
        <Box args={[0.85, 0.75, 0.72]} castShadow>
          <meshStandardMaterial {...metalMat} />
        </Box>

        {/* Visor */}
        <Box args={[0.66, 0.18, 0.74]} position={[0, 0.04, 0]}>
          <meshStandardMaterial color="#0a0a1a" metalness={0.1} roughness={0} transparent opacity={0.9} />
        </Box>

        {/* Eyes */}
        <Sphere args={[0.07, 16, 16]} position={[-0.18, 0.04, 0.37]} ref={eyeL}>
          <meshStandardMaterial {...eyeMat} />
        </Sphere>
        <Sphere args={[0.07, 16, 16]} position={[0.18, 0.04, 0.37]} ref={eyeR}>
          <meshStandardMaterial {...eyeMat} />
        </Sphere>

        {/* Antenna */}
        <Cylinder args={[0.025, 0.025, 0.35, 8]} position={[0, 0.55, 0]}>
          <meshStandardMaterial {...metalMat} />
        </Cylinder>
        <Sphere args={[0.055, 12, 12]} position={[0, 0.74, 0]}>
          <meshStandardMaterial color="#8B5CF6" emissive="#8B5CF6" emissiveIntensity={2} metalness={0} roughness={0} />
        </Sphere>
      </group>

      {/* Shoulders */}
      <Sphere args={[0.28, 16, 16]} position={[-0.72, 0.42, 0]}>
        <meshStandardMaterial {...metalMat} />
      </Sphere>
      <Sphere args={[0.28, 16, 16]} position={[0.72, 0.42, 0]}>
        <meshStandardMaterial {...metalMat} />
      </Sphere>

      {/* Arms */}
      <Cylinder args={[0.14, 0.11, 0.9, 10]} position={[-0.82, -0.1, 0]} rotation={[0, 0, 0.15]}>
        <meshStandardMaterial {...metalMat} />
      </Cylinder>
      <Cylinder args={[0.14, 0.11, 0.9, 10]} position={[0.82, -0.1, 0]} rotation={[0, 0, -0.15]}>
        <meshStandardMaterial {...metalMat} />
      </Cylinder>

      {/* Forearms */}
      <Cylinder args={[0.10, 0.09, 0.65, 10]} position={[-0.9, -0.72, 0]} rotation={[0, 0, 0.08]}>
        <meshStandardMaterial {...accentMat} />
      </Cylinder>
      <Cylinder args={[0.10, 0.09, 0.65, 10]} position={[0.9, -0.72, 0]} rotation={[0, 0, -0.08]}>
        <meshStandardMaterial {...accentMat} />
      </Cylinder>

      {/* Pelvis */}
      <Box args={[0.9, 0.3, 0.6]} position={[0, -0.82, 0]}>
        <meshStandardMaterial {...metalMat} />
      </Box>

      {/* Hip accent ring */}
      <Torus args={[0.38, 0.04, 8, 32]} position={[0, -0.82, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={1} metalness={0} roughness={0} />
      </Torus>

      {/* Legs */}
      <Cylinder args={[0.18, 0.16, 0.7, 10]} position={[-0.28, -1.35, 0]}>
        <meshStandardMaterial {...metalMat} />
      </Cylinder>
      <Cylinder args={[0.18, 0.16, 0.7, 10]} position={[0.28, -1.35, 0]}>
        <meshStandardMaterial {...metalMat} />
      </Cylinder>

      {/* Feet */}
      <Box args={[0.34, 0.18, 0.52]} position={[-0.28, -1.78, 0.05]}>
        <meshStandardMaterial {...metalMat} />
      </Box>
      <Box args={[0.34, 0.18, 0.52]} position={[0.28, -1.78, 0.05]}>
        <meshStandardMaterial {...metalMat} />
      </Box>

      {/* Base glow ring */}
      <Torus args={[0.55, 0.02, 8, 64]} position={[0, -1.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#8B5CF6" emissive="#8B5CF6" emissiveIntensity={1.5} metalness={0} roughness={0} />
      </Torus>
    </group>
  );
}

export default function RobotScene() {
  return (
    <Canvas
      camera={{ position: [0, 0.2, 4.5], fov: 42 }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 1.5]}
    >
      <Suspense fallback={null}>
        {/* Lighting — purple/indigo theme */}
        <ambientLight intensity={0.15} />
        <directionalLight position={[3, 5, 3]} intensity={1.2} color="#ffffff" />
        <pointLight position={[-2, 2, 2]} intensity={2.5} color="#8B5CF6" distance={8} />
        <pointLight position={[2, -1, 2]} intensity={1.8} color="#6366f1" distance={6} />
        <pointLight position={[0, -2, 1]} intensity={1.2} color="#8B5CF6" distance={5} />

        <RobotBody />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.8}
          autoRotate={false}
        />
      </Suspense>
    </Canvas>
  );
}
