import React, { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GAME_CONFIG } from '../config/GameConfig';
import { getWebSocketInstance } from '../services/UnifiedWebSocket';

const SCALE = 10;
const FRAGMENT_COUNT = 8;
const HAZE_COUNT = 12;

const CrystalWall = ({ wallData, ownerId }) => {
  const groupRef = useRef();
  const matRef = useRef();
  const edgeMatRef = useRef();
  const hazeRefs = useRef([]);
  const [healthRatio, setHealthRatio] = useState(1);
  const [exploding, setExploding] = useState(false);
  const [visible, setVisible] = useState(true);
  const flashRef = useRef(0);
  const passthroughFlashRef = useRef(0);
  const explodeStartRef = useRef(0);
  const fragmentRefs = useRef([]);

  const wallConfig = GAME_CONFIG.crystalWall || {};
  const width = (wallConfig.width || 40) * SCALE;
  const height = (wallConfig.height || 30) * SCALE;
  const depth = wallConfig.depth || 4;
  const lifetime = wallConfig.lifetime || 15000;

  const isOwner = useMemo(() => {
    const localId = getWebSocketInstance()?.gameStateManager?.playerId;
    return localId && localId === ownerId;
  }, [ownerId]);

  const baseOpacity = isOwner ? 0.2 : 0.8;
  const edgeBaseOpacity = isOwner ? 0.3 : 0.65;

  const hexGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(width * 0.5, width * 0.5, depth, 6, 1);
    geo.rotateX(Math.PI / 2);
    geo.scale(1, height / width, 1);
    return geo;
  }, [width, height, depth]);

  const hexEdgesGeo = useMemo(() => new THREE.EdgesGeometry(hexGeo), [hexGeo]);

  const hazeParticles = useMemo(() => {
    const particles = [];
    for (let i = 0; i < HAZE_COUNT; i++) {
      particles.push({
        startX: (Math.random() - 0.5) * width * 0.8,
        y: (Math.random() - 0.5) * height * 0.7,
        z: (Math.random() - 0.5) * depth * 2,
        size: width * (0.08 + Math.random() * 0.12),
        speed: 8 + Math.random() * 15,
        phase: Math.random() * Math.PI * 2,
        yDrift: (Math.random() - 0.5) * 3,
      });
    }
    return particles;
  }, [width, height, depth]);

  const fragmentDirs = useMemo(() => {
    const dirs = [];
    for (let i = 0; i < FRAGMENT_COUNT; i++) {
      dirs.push({
        dir: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          Math.random() * 1.5 + 0.3,
          (Math.random() - 0.5) * 2
        ).normalize(),
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6
        ),
      });
    }
    return dirs;
  }, []);

  useEffect(() => {
    if (!wallData?.id) return;

    const handleDamaged = (e) => {
      if (e.detail?.wallId !== wallData.id) return;
      const ratio = (e.detail.health ?? 0) / (e.detail.maxHealth || wallData.maxHealth || 0.5);
      setHealthRatio(Math.max(0, ratio));
      flashRef.current = 1;
    };
    const handleDestroyed = (e) => {
      if (e.detail?.wallId !== wallData.id) return;
      setExploding(true);
      explodeStartRef.current = performance.now();
    };
    const handleExpired = (e) => {
      if (e.detail?.wallId !== wallData.id) return;
      setVisible(false);
    };
    const handlePassthrough = (e) => {
      if (e.detail?.wallId !== wallData.id) return;
      passthroughFlashRef.current = 1;
    };

    window.addEventListener('wall-damaged', handleDamaged);
    window.addEventListener('wall-destroyed', handleDestroyed);
    window.addEventListener('wall-expired', handleExpired);
    window.addEventListener('wall-passthrough', handlePassthrough);
    return () => {
      window.removeEventListener('wall-damaged', handleDamaged);
      window.removeEventListener('wall-destroyed', handleDestroyed);
      window.removeEventListener('wall-expired', handleExpired);
      window.removeEventListener('wall-passthrough', handlePassthrough);
    };
  }, [wallData?.id, wallData?.maxHealth]);

  useFrame((state) => {
    if (!groupRef.current || !visible) return;

    if (flashRef.current > 0) flashRef.current = Math.max(0, flashRef.current - 0.08);
    if (passthroughFlashRef.current > 0) passthroughFlashRef.current = Math.max(0, passthroughFlashRef.current - 0.06);

    const dmgFlash = flashRef.current;
    const ptFlash = passthroughFlashRef.current;
    const damageT = 1 - healthRatio;
    const time = state.clock.elapsedTime;

    if (matRef.current) {
      const base = new THREE.Color('#8B45A6');
      const damaged = new THREE.Color('#ff2244');
      const pulse = new THREE.Color('#e8b4f8');
      let color = base.clone().lerp(damaged, damageT * 0.7);
      if (ptFlash > 0) color.lerp(pulse, ptFlash * 0.8);
      matRef.current.color.copy(color);
      matRef.current.emissiveIntensity = 0.5 + dmgFlash * 1.5 + ptFlash * 2.0;

      let opacity = baseOpacity;
      if (wallData?.createdAt) {
        const age = Date.now() - wallData.createdAt;
        const fadeStart = lifetime * 0.8;
        if (age > fadeStart) {
          const fadeProg = Math.min(1, (age - fadeStart) / (lifetime * 0.2));
          opacity = THREE.MathUtils.lerp(baseOpacity, 0.05, fadeProg);
        }
      }
      matRef.current.opacity = opacity;
    }

    if (edgeMatRef.current) {
      edgeMatRef.current.opacity = edgeBaseOpacity + ptFlash * 0.3;
      edgeMatRef.current.color.copy(
        ptFlash > 0 ? new THREE.Color('#e8b4f8') : new THREE.Color('#c084fc')
      );
    }

    hazeRefs.current.forEach((ref, i) => {
      if (!ref) return;
      const p = hazeParticles[i];
      const halfW = width * 0.45;

      let x = p.startX + time * p.speed;
      x = ((x + halfW) % (halfW * 2)) - halfW;
      const y = p.y + Math.sin(time * 0.5 + p.phase) * p.yDrift * 5;
      ref.position.set(x, y, p.z);

      const edgeFade = 1 - Math.abs(x / halfW);
      const hazeOpacity = edgeFade * (0.06 + ptFlash * 0.2 + dmgFlash * 0.08);
      if (ref.material) ref.material.opacity = hazeOpacity;
    });

    if (exploding) {
      const elapsed = performance.now() - explodeStartRef.current;
      const progress = Math.min(elapsed / 1000, 1);

      fragmentRefs.current.forEach((frag, i) => {
        if (!frag) return;
        const f = fragmentDirs[i];
        const dist = progress * 120;
        frag.position.set(
          f.dir.x * dist,
          f.dir.y * dist - progress * progress * 50,
          f.dir.z * dist
        );
        frag.rotation.set(f.spin.x * progress, f.spin.y * progress, f.spin.z * progress);
        frag.scale.setScalar(Math.max(0.01, 1 - progress * 0.7));
        if (frag.children[0]?.material) {
          frag.children[0].material.opacity = Math.max(0, 1 - progress);
        }
      });
      if (progress >= 1) setVisible(false);
    }
  });

  if (!visible || !wallData?.position) return null;

  const pos = wallData.position;
  const rot = wallData.rotation || { x: 0, y: 0, z: 0 };

  return (
    <group
      ref={groupRef}
      position={[pos.x, pos.y, pos.z]}
      rotation={[rot.x || 0, rot.y || 0, rot.z || 0]}
    >
      {!exploding && (
        <>
          <mesh geometry={hexGeo}>
            <meshStandardMaterial
              ref={matRef}
              color="#8B45A6"
              emissive="#7C3AED"
              emissiveIntensity={0.5}
              transparent
              opacity={baseOpacity}
              roughness={0.05}
              metalness={0.8}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          <lineSegments geometry={hexEdgesGeo}>
            <lineBasicMaterial
              ref={edgeMatRef}
              color="#c084fc"
              transparent
              opacity={edgeBaseOpacity}
            />
          </lineSegments>


          {hazeParticles.map((p, i) => (
            <mesh
              key={i}
              ref={(el) => { hazeRefs.current[i] = el; }}
              position={[p.startX, p.y, p.z]}
              rotation={[0, 0, Math.random() * Math.PI]}
            >
              <planeGeometry args={[p.size, p.size * 0.4]} />
              <meshBasicMaterial
                color="#c084fc"
                transparent
                opacity={0.06}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          ))}
        </>
      )}

      {exploding && fragmentDirs.map((_, i) => (
        <group key={i} ref={(el) => { fragmentRefs.current[i] = el; }}>
          <mesh>
            <cylinderGeometry args={[width * 0.12, width * 0.12, depth * 0.8, 6]} />
            <meshStandardMaterial
              color="#A855F7"
              emissive="#7C3AED"
              emissiveIntensity={0.6}
              transparent
              opacity={1}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};

export default CrystalWall;
