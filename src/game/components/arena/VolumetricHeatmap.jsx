import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function VolumetricHeatmap({ cells, dangerMode }) {
  const meshRef = useRef();
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(8, 6, 4), []);
  
  const avgLanes = cells.map(c => c.avgLane);
  const minLane = Math.min(...avgLanes);
  const maxLane = Math.max(...avgLanes);
  
  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.82
    });
  }, []);

  useMemo(() => {
    if (!meshRef.current) return;
    
    const mesh = meshRef.current;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    
    cells.forEach((cell, i) => {
      dummy.position.set(cell.x, cell.y, cell.z);

      const norm = maxLane > minLane ? (cell.avgLane - minLane) / (maxLane - minLane) : 0.5;
      const scale = 0.4 + norm * 0.8;
      dummy.scale.set(scale, scale, scale);
      
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      if (dangerMode) {

        if (cell.exposedToP2) {
          color.setRGB(cell.exposedToP1 ? 1.0 : 0.9, cell.exposedToP1 ? 0.12 : 0.28, 0.05);
        } else {
          color.setRGB(0.0, cell.exposedToP1 ? 0.28 : 0.45, cell.exposedToP1 ? 0.65 : 0.9);
        }
      } else {

        color.setRGB(norm * 30 / 255, norm * 200 / 255, (80 + norm * 175) / 255);
      }
      mesh.setColorAt(i, color);
    });
    
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
  }, [cells, dangerMode, minLane, maxLane]);

  useFrame(({ clock }) => {
    if (!meshRef.current || dangerMode) return;
    
    const mesh = meshRef.current;
    const dummy = new THREE.Object3D();
    const time = clock.getElapsedTime();
    
    cells.forEach((cell, i) => {
      const norm = maxLane > minLane ? (cell.avgLane - minLane) / (maxLane - minLane) : 0.5;

      if (norm > 0.7) {
        mesh.getMatrixAt(i, dummy.matrix);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
        
        const pulse = 0.998 + 0.002 * Math.sin(time * 2);
        const baseScale = 0.4 + norm * 0.8;
        dummy.scale.set(baseScale * pulse, baseScale * pulse, baseScale * pulse);
        
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
    });
    
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[sphereGeo, material, cells.length]}
    />
  );
}
