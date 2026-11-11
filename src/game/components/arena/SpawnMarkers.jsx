import React from 'react';
import * as THREE from 'three';

export default function SpawnMarkers({ spawns, playerPos }) {
  const { p1, p2 } = spawns;

  return (
    <>

      {playerPos && (
        <group position={[playerPos.x, playerPos.y, playerPos.z]}>
          <mesh position={[0, 30, 0]}>
            <coneGeometry args={[20, 60, 8]} />
            <meshBasicMaterial color={0x00ff88} transparent opacity={0.88} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1, 0]}>
            <circleGeometry args={[30, 32]} />
            <meshBasicMaterial 
              color={0x00ff88} 
              side={THREE.DoubleSide} 
              transparent 
              opacity={0.35} 
            />
          </mesh>
          <mesh position={[0, 80, 0]}>
            <planeGeometry args={[80, 20]} />
            <meshBasicMaterial color={0x00ff88} transparent opacity={0.0} />
          </mesh>
        </group>
      )}


      {p1 && (
        <group position={[p1.x, p1.y, p1.z]}>
          <mesh position={[0, 20, 0]}>
            <coneGeometry args={[15, 40, 8]} />
            <meshBasicMaterial color={0x008844} transparent opacity={0.3} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1, 0]}>
            <circleGeometry args={[20, 32]} />
            <meshBasicMaterial
              color={0x008844}
              side={THREE.DoubleSide}
              transparent
              opacity={0.12}
            />
          </mesh>

          <mesh position={[0, 8, 0]}>
            <boxGeometry args={[14, 8, 14]} />
            <meshBasicMaterial color={0x00ff88} wireframe transparent opacity={0.5} />
          </mesh>
        </group>
      )}


      {p2 && (
        <group position={[p2.x, p2.y, p2.z]}>
          <mesh position={[0, 30, 0]}>
            <coneGeometry args={[20, 60, 8]} />
            <meshBasicMaterial color={0xff4466} transparent opacity={0.88} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1, 0]}>
            <circleGeometry args={[30, 32]} />
            <meshBasicMaterial
              color={0xff4466}
              side={THREE.DoubleSide}
              transparent
              opacity={0.22}
            />
          </mesh>

          <mesh position={[0, 8, 0]}>
            <boxGeometry args={[14, 8, 14]} />
            <meshBasicMaterial color={0xff4466} wireframe transparent opacity={0.5} />
          </mesh>
        </group>
      )}


      {playerPos && p2 && (
        <line>
          <bufferGeometry 
            setFromPoints={[
              new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z),
              new THREE.Vector3(p2.x, p2.y, p2.z)
            ]} 
          />
          <lineDashedMaterial 
            color={0xffffff} 
            dashSize={35} 
            gapSize={22} 
            transparent 
            opacity={0.25} 
          />
        </line>
      )}
    </>
  );
}
