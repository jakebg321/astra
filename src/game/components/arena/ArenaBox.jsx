import React from 'react';
import * as THREE from 'three';

export default function ArenaBox({ size }) {
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const edges = new THREE.EdgesGeometry(geometry);

  return (
    <lineSegments geometry={edges}>
      <lineBasicMaterial color={0x2a4488} transparent opacity={0.65} />
    </lineSegments>
  );
}
