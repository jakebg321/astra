import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '../utils/localGltf';
import * as THREE from 'three';
import { GAME_CONFIG } from '../config/GameConfig.js';

const ASTEROID_DATA = GAME_CONFIG.environment?.asteroids?.data || [];
const HIT_RADIUS_MULT = GAME_CONFIG.environment?.asteroids?.hitRadiusMultiplier || 1.0;

const destroyedSet = new Set();

const Asteroid = ({ index, position, scale, rotationY, gltf }) => {
  const groupRef = useRef();
  const mixerRef = useRef(null);
  const destroyedRef = useRef(destroyedSet.has(index));

  const clonedScene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.emissive = new THREE.Color(0x222222);
        child.material.emissiveIntensity = 0.3;
      }
      if (child.name && child.name.includes('cell')) {
        child.visible = false;
      }
    });

    if (destroyedSet.has(index)) {
      clone.visible = false;
    }
    return clone;
  }, [gltf, index]);

  useEffect(() => {
    if (gltf.animations.length === 0) return;

    const mixer = new THREE.AnimationMixer(clonedScene);
    mixerRef.current = mixer;

    const actions = gltf.animations.map(clip => {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce);
      action.clampWhenFinished = true;
      return action;
    });

    if (destroyedSet.has(index) && groupRef.current) {
      groupRef.current.visible = false;
      destroyedRef.current = true;
    }

    if (groupRef.current) {
      groupRef.current.userData.explode = () => {
        if (destroyedRef.current) return;
        destroyedRef.current = true;
        destroyedSet.add(index);

        clonedScene.traverse((child) => {
          if (child.isMesh) {
            child.visible = child.name?.includes('cell') ?? false;
          }
        });
        actions.forEach(a => { a.reset(); a.timeScale = 3.0; a.play(); });

        setTimeout(() => {
          if (groupRef.current) groupRef.current.visible = false;
        }, 600);
      };
    }

    return () => mixer.stopAllAction();
  }, [gltf, clonedScene, index]);

  useEffect(() => {
    const handleDestroyed = (e) => {
      if (e.detail?.asteroidIndex === index && groupRef.current?.userData?.explode) {
        groupRef.current.userData.explode();
      }
    };
    window.addEventListener('asteroid-destroyed', handleDestroyed);
    return () => window.removeEventListener('asteroid-destroyed', handleDestroyed);
  }, [index]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (mixerRef.current) mixerRef.current.update(delta);
    if (destroyedRef.current) return;
    groupRef.current.rotation.y += delta * 0.05;
    groupRef.current.rotation.x += delta * 0.02;
  });

  return (
    <group
      ref={groupRef}
      position={position}
      scale={[scale, scale, scale]}
      rotation={[0, rotationY, 0]}
    >
      <primitive object={clonedScene} />
    </group>
  );
};

const AsteroidField = () => {
  const gltf = useGLTF('/asteroid_exploding.glb');

  useEffect(() => {
    window.asteroidPositions = ASTEROID_DATA.map((a, i) => ({
      position: { x: a.pos[0], y: a.pos[1], z: a.pos[2] },
      radius: a.scale * HIT_RADIUS_MULT,
      destroyed: destroyedSet.has(i),
      index: i
    }));

    const handleDestroyed = (e) => {
      const idx = e.detail?.asteroidIndex;
      if (window.asteroidPositions?.[idx]) {
        window.asteroidPositions[idx].destroyed = true;
      }
    };
    window.addEventListener('asteroid-destroyed', handleDestroyed);

    const handleReset = () => {
      destroyedSet.clear();
      if (window.asteroidPositions) {
        window.asteroidPositions.forEach(a => { a.destroyed = false; });
      }
    };
    window.addEventListener('game-reset', handleReset);

    return () => {
      window.removeEventListener('asteroid-destroyed', handleDestroyed);
      window.removeEventListener('game-reset', handleReset);
      delete window.asteroidPositions;
    };
  }, []);

  return (
    <group>
      {ASTEROID_DATA.map((asteroid, i) => (
        <Asteroid
          key={i}
          index={i}
          position={asteroid.pos}
          scale={asteroid.scale}
          rotationY={asteroid.rotY}
          gltf={gltf}
        />
      ))}
    </group>
  );
};

useGLTF.preload('/asteroid_exploding.glb');

export default AsteroidField;
