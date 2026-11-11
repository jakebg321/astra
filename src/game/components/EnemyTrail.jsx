import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const EnemyTrail = ({ position, playerId, isLocal = false }) => {
  const lineRef = useRef();
  const positionHistory = useRef([]);
  const lastPosition = useRef(new THREE.Vector3());
  const cachedPos = useRef(new THREE.Vector3());
  const geometry = useRef(new THREE.BufferGeometry());
  
  const material = useMemo(() => new THREE.LineBasicMaterial({
    color: isLocal ? '#00ffff' : '#ff0000',
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    linewidth: 12
  }), [isLocal]);

  const fadeMaterial = useMemo(() => new THREE.LineBasicMaterial({
    color: isLocal ? '#0088aa' : '#aa0000',
    transparent: true,
    opacity: 0.5, 
    blending: THREE.AdditiveBlending,
    linewidth: 6
  }), [isLocal]);
  
  useFrame(() => {
    if (!position) {
      if (lineRef.current) lineRef.current.visible = false;
      return;
    }
    
    window.trailsDisabled = false;
    
    cachedPos.current.set(position.x, position.y, position.z);
    const now = Date.now();

    const distance = cachedPos.current.distanceTo(lastPosition.current);
    if (distance > 0.1) {
      positionHistory.current.push({
        position: cachedPos.current.clone(),
        timestamp: now
      });
      lastPosition.current.copy(cachedPos.current);
    }

    positionHistory.current = positionHistory.current.filter(
      point => now - point.timestamp < 5000
    );

    if (positionHistory.current.length < 2) {
      if (lineRef.current) lineRef.current.visible = false;
      return;
    }

    const points = positionHistory.current.map(point => point.position);
    geometry.current.setFromPoints(points);
    
    if (lineRef.current) {
      lineRef.current.visible = true;
      lineRef.current.geometry = geometry.current;
    }
  });
  
  return (
    <group>
      <line ref={lineRef}>
        <primitive object={geometry.current} attach="geometry" />
        <primitive object={material} attach="material" />
      </line>
      

      {positionHistory.current.length >= 2 && (
        <line>
          <primitive object={geometry.current} attach="geometry" />
          <primitive object={fadeMaterial} attach="material" />
        </line>
      )}
    </group>
  );
};

export default EnemyTrail;