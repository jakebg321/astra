import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getWebSocketInstance } from '../services/UnifiedWebSocket';
import { isEnemyVisible } from '../utils/enemyVisibility.js';

const MAX_BRACKETS = 4;

const _occRay = new THREE.Ray();
const _occSphere = new THREE.Sphere();
const _occTarget = new THREE.Vector3();
const _occHit = new THREE.Vector3();

const FixedTargetBrackets = ({
  shipPosition,
  shipRotation,
  isVisible = true,
  maxRange = 5000,
  minRange = 20
}) => {
  const groupRef = useRef();
  const { camera } = useThree();

  const bracketGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const size = 1;
    const thickness = 0.3;
    const positions = [];

    positions.push(-size, size, 0, -size + thickness, size, 0);
    positions.push(-size, size, 0, -size, size - thickness, 0);
    positions.push(size, size, 0, size - thickness, size, 0);
    positions.push(size, size, 0, size, size - thickness, 0);
    positions.push(-size, -size, 0, -size + thickness, -size, 0);
    positions.push(-size, -size, 0, -size, -size + thickness, 0);
    positions.push(size, -size, 0, size - thickness, -size, 0);
    positions.push(size, -size, 0, size, -size + thickness, 0);

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  }, []);

  const materials = useMemo(() => ({
    high: new THREE.LineBasicMaterial({
      color: new THREE.Color('#ff6600'),
      transparent: true, opacity: 0.9, linewidth: 3, depthTest: false
    }),
    med: new THREE.LineBasicMaterial({
      color: new THREE.Color('#ffaa00'),
      transparent: true, opacity: 0.9, linewidth: 3, depthTest: false
    }),
    low: new THREE.LineBasicMaterial({
      color: new THREE.Color('#ff0000'),
      transparent: true, opacity: 0.9, linewidth: 3, depthTest: false
    })
  }), []);

  const bracketPool = useMemo(() => {
    const pool = [];
    for (let i = 0; i < MAX_BRACKETS; i++) {
      const wrapper = new THREE.Group();
      const lines = new THREE.LineSegments(bracketGeometry, materials.high);
      wrapper.add(lines);
      wrapper.visible = false;
      pool.push({ wrapper, lines });
    }
    return pool;
  }, [bracketGeometry, materials]);

  React.useEffect(() => {
    if (!groupRef.current) return;
    bracketPool.forEach(({ wrapper }) => {
      groupRef.current.add(wrapper);
    });
    return () => {
      bracketPool.forEach(({ wrapper, lines }) => {
        if (groupRef.current) groupRef.current.remove(wrapper);
      });
      Object.values(materials).forEach(mat => mat.dispose());
      bracketGeometry.dispose();
    };
  }, [bracketPool, materials, bracketGeometry]);

  useFrame((state) => {
    if (!isVisible || !shipPosition || !groupRef.current) return;

    const ws = getWebSocketInstance();
    const otherPlayers = ws?.getOtherPlayers();
    const localPlayerId = ws?.gameStateManager?.playerId;

    if (!otherPlayers || !localPlayerId) {
      bracketPool.forEach(({ wrapper }) => { wrapper.visible = false; });
      return;
    }

    let enemyIndex = 0;

    Object.entries(otherPlayers).forEach(([id, player]) => {
      if (enemyIndex >= MAX_BRACKETS) return;
      if (!id || id === localPlayerId || !player?.position) return;
      if (!isEnemyVisible(player)) return;

      const dx = player.position.x - shipPosition.x;
      const dz = player.position.z - shipPosition.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < minRange || distance > maxRange) return;

      const planets = window.planetPositions;
      if (planets && planets.size > 0) {
        _occTarget.set(player.position.x, player.position.y, player.position.z);
        _occRay.origin.copy(camera.position);
        _occRay.direction.subVectors(_occTarget, _occRay.origin).normalize();
        const dist3D = camera.position.distanceTo(_occTarget);

        let occluded = false;
        for (const [, planet] of planets) {
          _occSphere.center.set(planet.x, planet.y, planet.z);
          _occSphere.radius = planet.radius || 0;
          const hit = _occRay.intersectSphere(_occSphere, _occHit);
          if (hit && camera.position.distanceTo(hit) < dist3D) {
            occluded = true;
            break;
          }
        }
        if (occluded) return;
      }

      const { wrapper, lines } = bracketPool[enemyIndex];

      const health = player.health || 1.0;
      const mat = health > 0.6 ? materials.high : health > 0.3 ? materials.med : materials.low;
      if (lines.material !== mat) lines.material = mat;

      const baseScale = 35;
      const minScale = 15;
      const distanceScale = Math.max(minScale, baseScale * (1 - distance / maxRange));
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      const finalScale = distanceScale * pulse;

      wrapper.position.set(player.position.x, player.position.y, player.position.z);
      lines.scale.setScalar(finalScale);
      lines.lookAt(state.camera.position);

      wrapper.visible = true;
      enemyIndex++;
    });

    for (let i = enemyIndex; i < MAX_BRACKETS; i++) {
      bracketPool[i].wrapper.visible = false;
    }
  });

  if (!isVisible) return null;

  return <group ref={groupRef} />;
};

export default FixedTargetBrackets;
