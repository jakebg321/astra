import React from 'react';
import * as THREE from 'three';

export default function FirstContactZone({ point }) {
  if (!point) return null;

  return (
    <group position={[point.x, point.y, point.z]}>
      <mesh>
        <sphereGeometry args={[28, 20, 14]} />
        <meshBasicMaterial color={0xffaa00} transparent opacity={0.8} />
      </mesh>
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1, 0]}>
        <ringGeometry args={[35, 46, 48]} />
        <meshBasicMaterial 
          color={0xffaa00} 
          side={THREE.DoubleSide} 
          transparent 
          opacity={0.3} 
        />
      </mesh>
    </group>
  );
}
