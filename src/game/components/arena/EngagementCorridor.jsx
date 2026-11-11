import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { checkLOS } from './arenaUtils';

export default function EngagementCorridor({ spawns, planets, arenaSize, visible }) {
  const meshRef = useRef();

  const gridStep = 200;
  const yLevels = [-150, 50, 200];

  const samplePoints = useMemo(() => {
    if (!arenaSize) return [];
    const points = [];
    const hx = arenaSize.x / 2;
    const hz = arenaSize.z / 2;

    for (const y of yLevels) {
      for (let x = -hx + gridStep / 2; x < hx; x += gridStep) {
        for (let z = -hz + gridStep / 2; z < hz; z += gridStep) {
          points.push({ x, y, z });
        }
      }
    }
    return points;
  }, [arenaSize]);

  const losResults = useMemo(() => {
    if (!spawns?.p2 || !planets || samplePoints.length === 0) return [];
    return samplePoints.map(pt => ({
      ...pt,
      exposed: !checkLOS(spawns.p2, pt, planets)
    }));
  }, [spawns, planets, samplePoints]);

  const sphereGeo = useMemo(() => new THREE.SphereGeometry(12, 6, 4), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.6,
    depthWrite: false
  }), []);

  useEffect(() => {
    if (!meshRef.current || losResults.length === 0) return;

    const mesh = meshRef.current;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    losResults.forEach((pt, i) => {
      dummy.position.set(pt.x, pt.y, pt.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      if (pt.exposed) {
        color.setRGB(1.0, 0.15, 0.1);
      } else {
        color.setRGB(0.1, 0.85, 0.3);
      }
      mesh.setColorAt(i, color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [losResults]);

  if (!visible || losResults.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[sphereGeo, material, losResults.length]}
    />
  );
}
