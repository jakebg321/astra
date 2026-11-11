import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GAME_CONFIG } from '../config/GameConfig';

const SCALE = 10;

const CrystalWallPreview = () => {
  const meshRef = useRef();

  const wallConfig = GAME_CONFIG.crystalWall || {};
  const width = (wallConfig.width || 40) * SCALE;
  const height = (wallConfig.height || 30) * SCALE;
  const depth = wallConfig.depth || 4;

  const hexGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(width * 0.5, width * 0.5, depth, 6, 1);
    geo.rotateX(Math.PI / 2);
    geo.scale(1, height / width, 1);
    return geo;
  }, [width, height, depth]);

  const hexEdgesGeo = useMemo(() => new THREE.EdgesGeometry(hexGeo), [hexGeo]);

  useFrame(() => {
    const ability = window.gameMovementState?.crystalWallAbility;
    if (!meshRef.current || !ability?.isDeploying || !ability.previewPosition) {
      if (meshRef.current) meshRef.current.visible = false;
      return;
    }

    meshRef.current.visible = true;
    meshRef.current.position.copy(ability.previewPosition);

    if (ability.previewRotation) {
      meshRef.current.rotation.set(
        ability.previewRotation.x || 0,
        ability.previewRotation.y || 0,
        ability.previewRotation.z || 0
      );
    }
  });

  return (
    <group ref={meshRef} visible={false}>
      <lineSegments geometry={hexEdgesGeo}>
        <lineBasicMaterial color="#a855f7" transparent opacity={0.6} />
      </lineSegments>
      <mesh geometry={hexGeo}>
        <meshBasicMaterial
          color="#a855f7"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

export default CrystalWallPreview;
