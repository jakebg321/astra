import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ProfessionalTrail = ({ position, velocity, isLocal = false }) => {
  const meshRef = useRef();
  const lastVelocity = useRef(new THREE.Vector3());
  
  useFrame(() => {
    if (!position || !meshRef.current || window.trailsDisabled) {
      if (meshRef.current) meshRef.current.visible = false;
      return;
    }

    const currentVel = velocity || new THREE.Vector3();
    if (currentVel.length() < 0.1) {
      meshRef.current.visible = false;
      return;
    }
    
    meshRef.current.visible = true;

    const trailDirection = currentVel.clone().normalize().multiplyScalar(-8);
    const trailPos = new THREE.Vector3(position.x, position.y, position.z).add(trailDirection);
    
    meshRef.current.position.copy(trailPos);

    meshRef.current.lookAt(
      trailPos.x + currentVel.x,
      trailPos.y + currentVel.y, 
      trailPos.z + currentVel.z
    );
    meshRef.current.rotateX(Math.PI / 2);
    
    const speed = currentVel.length();
    const trailLength = Math.min(speed * 3, 15);
    meshRef.current.scale.set(1, trailLength, 1);

    meshRef.current.material.opacity = Math.min(speed * 0.3, 0.8);
  });
  
  return (
    <mesh ref={meshRef} visible={false}>
      <planeGeometry args={[3, 1]} />
      <meshBasicMaterial
        color={isLocal ? '#00ffff' : '#ff0000'}
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
};

export default ProfessionalTrail;