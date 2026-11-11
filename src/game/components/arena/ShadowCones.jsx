import React, { useMemo } from 'react';
import * as THREE from 'three';

function build3DShadowCone(observer, planet, arenaSize) {
  const cx = planet.center.x;
  const cy = planet.center.y;
  const cz = planet.center.z;
  const r = planet.radius;

  const dx = cx - observer.x;
  const dy = cy - observer.y;
  const dz = cz - observer.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (dist <= r + 1) return null;

  const angularRadius = Math.asin(Math.min(0.999, r / dist));

  const arenaDiag = Math.sqrt(arenaSize.x * arenaSize.x + arenaSize.y * arenaSize.y + arenaSize.z * arenaSize.z);
  const nearDist = dist + r;
  const farDist = Math.min(arenaDiag, dist * 3);
  const coneLength = farDist - nearDist;

  if (coneLength < 10) return null;

  const nearRadius = Math.tan(angularRadius) * nearDist;
  const farRadius = Math.tan(angularRadius) * farDist;

  const geo = new THREE.CylinderGeometry(nearRadius, farRadius, coneLength, 12, 1, true);

  const dir = new THREE.Vector3(dx, dy, dz).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);

  const centerDist = nearDist + coneLength / 2;
  const pos = new THREE.Vector3(
    observer.x + dir.x * centerDist,
    observer.y + dir.y * centerDist,
    observer.z + dir.z * centerDist
  );

  return { geo, quat, pos };
}

export default function ShadowCones({ planets, spawns, playerPos, visible, arenaSize }) {
  const cones = useMemo(() => {
    if (!playerPos || !spawns.p2 || !arenaSize) return [];

    const results = [];

    planets.forEach((planet) => {

      const cone = build3DShadowCone(spawns.p2, planet, arenaSize);
      if (cone) results.push({ ...cone, color: 0x00ff88 });
    });

    return results;
  }, [planets, spawns, playerPos, arenaSize]);

  if (!visible) return null;

  return (
    <group>
      {cones.map((cone, i) => (
        <mesh
          key={i}
          geometry={cone.geo}
          quaternion={cone.quat}
          position={[cone.pos.x, cone.pos.y, cone.pos.z]}
        >
          <meshBasicMaterial
            color={cone.color}
            side={THREE.DoubleSide}
            transparent
            opacity={0.12}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
