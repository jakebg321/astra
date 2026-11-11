import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const BoostExhaustOptimized = ({ 
  isBoosting = false, 
  position = [0, 0, 2.5],
  scale = 1,
  rotation = [0, 0, 0],
  boostIntensity = 1
}) => {
  const meshRef = useRef();
  const [textures, setTextures] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const currentFrame = useRef(0);
  const targetFrame = useRef(0);
  
  const FRAME_NUMBERS = [11, 12, 13, 15];
  const TOTAL_FRAMES = FRAME_NUMBERS.length;
  const TEXTURE_PATH = '/boostpics/';

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(3.0, 3.0);

    return geo;
  }, []);
  
  useFrame((state, delta) => {
    window.debugPerf?.startTimer('boost');
    
    if (!meshRef.current || !isLoaded || textures.length === 0) {
      window.debugPerf?.endTimer('boost');
      return;
    }
    
    if (isBoosting) {

      targetFrame.current = TOTAL_FRAMES - 1;
    } else {

      targetFrame.current = 0;
    }
    
    currentFrame.current = THREE.MathUtils.lerp(
      currentFrame.current,
      targetFrame.current,
      delta * 12
    );
    
    const frameIndex = Math.round(currentFrame.current);
    const clampedIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, frameIndex));

    let targetOpacity = 0;
    if (isBoosting) {

      targetOpacity = 1.0;
      const lerpSpeed = delta * 20;
      meshRef.current.material.opacity = THREE.MathUtils.lerp(
        meshRef.current.material.opacity,
        targetOpacity,
        lerpSpeed
      );
    } else {

      targetOpacity = 0.5;
      const lerpSpeed = delta * 5;
      meshRef.current.material.opacity = THREE.MathUtils.lerp(
        meshRef.current.material.opacity,
        targetOpacity,
        lerpSpeed
      );
    }
    
    const targetScale = isBoosting ? scale * (1.2 + Math.sin(state.clock.elapsedTime * 10) * 0.1) : scale * 0.9;
    meshRef.current.scale.setScalar(targetScale);
    
    window.debugStats = window.debugStats || {};
    window.debugStats.boostActive = isBoosting;
    
    window.debugPerf?.endTimer('boost');
  });
  
  if (!isLoaded) return null;
  
  return (
    <mesh 
      ref={meshRef}
      position={position}
      rotation={rotation}
      scale={scale}
      geometry={geometry}
    >
      <meshBasicMaterial
        color={isBoosting ? "#00aaff" : "#0066cc"}
        transparent={true}
        opacity={isBoosting ? 1.0 : 0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export const LightweightBoostParticles = ({ isBoosting, position = [0, 0, 2.5] }) => {
  const groupRef = useRef();
  const particleRefs = useRef([]);
  const PARTICLE_COUNT = 5;

  return (
    <group ref={groupRef} position={position}>
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <mesh
          key={i}
          ref={el => particleRefs.current[i] = el}
          position={[
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5,
            Math.random() * 2
          ]}
        >
          <planeGeometry args={[0.3, 0.3]} />
          <meshBasicMaterial
            color="#4488ff"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

export default BoostExhaustOptimized;