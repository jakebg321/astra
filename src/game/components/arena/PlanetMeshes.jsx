import React, { Suspense } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';

function TexturedPlanetInner({ planet }) {
  const isCenter = planet.name === 'Astra Center';
  const pos = [planet.center.x, planet.center.y, planet.center.z];
  const r = planet.visualRadius ?? planet.radius;
  const collisionR = planet.radius;
  const color = planet.color || '#4a2272';

  const texture = useTexture(planet.texture);

  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[r, 32, 32]} />
        <meshBasicMaterial map={texture} />
      </mesh>


      {isCenter && collisionR > r && (
        <mesh>
          <sphereGeometry args={[collisionR, 24, 16]} />
          <meshBasicMaterial
            color={0xff44ff}
            wireframe
            transparent
            opacity={0.12}
          />
        </mesh>
      )}


      {isCenter && (
        <mesh>
          <sphereGeometry args={[r * 1.15, 24, 16]} />
          <meshBasicMaterial
            color={0x8a2be2}
            transparent
            opacity={0.15}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {planet.hasRing && (
        <SaturnRingInner planet={planet} r={r} />
      )}
    </group>
  );
}

function SaturnRingInner({ planet, r }) {
  const ringTexture = useTexture(planet.ringTexture);

  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[r * 1.8, r * 0.3, 2, 48]} />
      <meshBasicMaterial
        map={ringTexture}
        side={THREE.DoubleSide}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

function FallbackPlanet({ planet }) {
  const isCenter = planet.name === 'Astra Center';
  const pos = [planet.center.x, planet.center.y, planet.center.z];
  const r = planet.visualRadius ?? planet.radius;
  const color = planet.color || '#4a2272';

  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[r, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function TexturedPlanet({ planet }) {
  if (!planet.texture) {
    return <FallbackPlanet planet={planet} />;
  }

  return (
    <Suspense fallback={<FallbackPlanet planet={planet} />}>
      <TexturedPlanetInner planet={planet} />
    </Suspense>
  );
}

export default function PlanetMeshes({ planets }) {
  return (
    <>
      {planets.map((planet) => (
        <TexturedPlanet key={planet.name} planet={planet} />
      ))}
    </>
  );
}
