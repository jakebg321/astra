import React from 'react';
import * as THREE from 'three';

export default function TimeRings({ spawns, playerPos, speedNormal, visible }) {
  if (!visible || !playerPos || !spawns.p2) return null;

  const rings = [
    { time: 2, opacity: 0.38 },
    { time: 5, opacity: 0.22 },
    { time: 8, opacity: 0.1 }
  ];

  return (
    <group>
      {rings.map(({ time, opacity }) => {
        const radius = speedNormal * time;
        
        return (
          <group key={time}>

            <mesh 
              rotation={[-Math.PI / 2, 0, 0]} 
              position={[playerPos.x, playerPos.y + 2, playerPos.z]}
            >
              <ringGeometry args={[Math.max(1, radius - 4), radius + 4, 64]} />
              <meshBasicMaterial 
                color={0x00ff88} 
                side={THREE.DoubleSide} 
                transparent 
                opacity={opacity} 
              />
            </mesh>
            

            <mesh 
              rotation={[-Math.PI / 2, 0, 0]} 
              position={[spawns.p2.x, spawns.p2.y + 2, spawns.p2.z]}
            >
              <ringGeometry args={[Math.max(1, radius - 4), radius + 4, 64]} />
              <meshBasicMaterial 
                color={0xff4466} 
                side={THREE.DoubleSide} 
                transparent 
                opacity={opacity} 
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
