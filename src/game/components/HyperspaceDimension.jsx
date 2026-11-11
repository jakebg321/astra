import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const LightspeedEffect = ({ isActive, camera }) => {
  const linesRef = useRef();
  const groupRef = useRef();
  const activationTime = useRef(0);
  const wasActive = useRef(false);

  const starData = React.useMemo(() => {
    const data = [];
    for (let i = 0; i < 600; i++) {

      const angle = Math.random() * Math.PI * 2;
      const radius = 0.5 + Math.random() * 7.5;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      const z = -Math.random() * 40;

      const maxStreak = 1.5 + Math.random() * 3.5;

      const brightness = Math.max(0.3, 1.0 - (radius / 8) * 0.6);
      data.push({ x, y, z, radius, angle, maxStreak, brightness });
    }
    return data;
  }, []);

  const geometry = React.useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(600 * 2 * 3);
    const colors = new Float32Array(600 * 2 * 3);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, []);

  const material = React.useMemo(() => new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    linewidth: 1,
    depthTest: false,
    depthWrite: false
  }), []);

  useEffect(() => {
    if (groupRef.current && camera) {
      camera.add(groupRef.current);
      return () => {
        if (groupRef.current) camera.remove(groupRef.current);
      };
    }
  }, [camera]);

  useFrame(() => {
    if (!linesRef.current) return;

    const now = performance.now();

    if (isActive && !wasActive.current) {
      activationTime.current = now;
      wasActive.current = true;
    } else if (!isActive && wasActive.current) {

    }

    if (!wasActive.current) return;

    const elapsed = now - activationTime.current;
    const positions = linesRef.current.geometry.attributes.position;
    const colors = linesRef.current.geometry.attributes.color;

    let phase, phaseProgress;
    if (elapsed < 400) {
      phase = 1;
      phaseProgress = elapsed / 400;
    } else if (elapsed < 1600) {
      phase = 2;
      phaseProgress = (elapsed - 400) / 1200;
    } else {
      phase = 3;
      phaseProgress = Math.min((elapsed - 1600) / 400, 1);
    }

    let streakMult;
    if (phase === 1) {

      streakMult = easeInCubic(phaseProgress);
    } else if (phase === 2) {
      streakMult = 1.0;
    } else {

      streakMult = 1.0 - easeInCubic(phaseProgress);
    }

    let zSpeed;
    if (phase === 1) {
      zSpeed = easeInCubic(phaseProgress) * 0.8;
    } else if (phase === 2) {
      zSpeed = 0.8;
    } else {
      zSpeed = 0.8 * (1.0 - phaseProgress);
    }

    if (phase === 1) {
      material.opacity = easeInCubic(phaseProgress);
    } else if (phase === 2) {
      material.opacity = 1.0;
    } else {
      material.opacity = 1.0 - easeInCubic(phaseProgress);
    }

    let blueShift;
    if (phase === 1) {
      blueShift = phaseProgress;
    } else if (phase === 2) {
      blueShift = 1.0;
    } else {
      blueShift = 1.0 - phaseProgress * 0.5;
    }

    let convergence = 0;
    if (phase === 2) {
      convergence = 0.05 + Math.sin(phaseProgress * Math.PI) * 0.05;
    }

    for (let i = 0; i < 600; i++) {
      const star = starData[i];
      const idx = i * 6;

      let z = star.z + elapsed * zSpeed * 0.04;

      const tunnelLen = 40;
      z = ((z % tunnelLen) + tunnelLen) % tunnelLen;
      z = -z;

      const cx = star.x * (1 - convergence);
      const cy = star.y * (1 - convergence);

      const streakLen = star.maxStreak * streakMult;
      positions.array[idx] = cx;
      positions.array[idx + 1] = cy;
      positions.array[idx + 2] = z;

      positions.array[idx + 3] = cx;
      positions.array[idx + 4] = cy;
      positions.array[idx + 5] = z - streakLen;

      const b = star.brightness;

      const rNear = b * (1.0 - blueShift * 0.2);
      const gNear = b * (0.9 + blueShift * 0.1);
      const bNear = b * (0.8 + blueShift * 0.2);

      const tailDim = 0.3;
      const rFar = rNear * tailDim;
      const gFar = gNear * tailDim;
      const bFar = bNear * (tailDim + 0.15);

      colors.array[idx] = rNear;
      colors.array[idx + 1] = gNear;
      colors.array[idx + 2] = bNear;
      colors.array[idx + 3] = rFar;
      colors.array[idx + 4] = gFar;
      colors.array[idx + 5] = bFar;
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
  });

  useEffect(() => {
    if (!isActive) {

      wasActive.current = false;
    }
  }, [isActive]);

  return (
    <group ref={groupRef}>
      <lineSegments
        ref={linesRef}
        geometry={geometry}
        material={material}
        renderOrder={2}
      />
    </group>
  );
};

function easeInCubic(t) {
  return t * t * t;
}

export function HyperspaceDimension({ isActive = false, duration = 2000 }) {
  const overlayRef = useRef();
  const { camera } = useThree();
  const [showWormhole, setShowWormhole] = useState(false);
  const wormholeTimer = useRef(null);
  const overlayOpacity = useRef(0);
  const activationTime = useRef(0);

  const WORMHOLE_HOLD_MS = 500;

  useEffect(() => {
    if (isActive) {
      setShowWormhole(true);
      activationTime.current = performance.now();
      if (wormholeTimer.current) {
        clearTimeout(wormholeTimer.current);
      }
    } else if (showWormhole) {
      wormholeTimer.current = setTimeout(() => {
        setShowWormhole(false);
      }, WORMHOLE_HOLD_MS);
    }

    return () => {
      if (wormholeTimer.current) {
        clearTimeout(wormholeTimer.current);
      }
    };
  }, [isActive, showWormhole]);

  const overlayMaterial = React.useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x0a0a1a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false
  }), []);

  useFrame((state, delta) => {
    if (!overlayRef.current) return;

    const elapsed = performance.now() - activationTime.current;

    if (isActive || showWormhole) {

      let targetOpacity;
      if (!isActive) {

        targetOpacity = 0;
      } else if (elapsed < 400) {

        targetOpacity = 0.3 * easeInCubic(elapsed / 400);
      } else if (elapsed < 1600) {

        targetOpacity = 0.35;
      } else if (elapsed < 1700) {

        const flashProgress = (elapsed - 1600) / 100;
        targetOpacity = 0.35 + 0.55 * easeInCubic(flashProgress);
      } else {

        const fadeProgress = Math.min((elapsed - 1700) / 300, 1);
        targetOpacity = 0.9 * (1 - easeInCubic(fadeProgress));
      }

      overlayOpacity.current = THREE.MathUtils.damp(
        overlayOpacity.current,
        targetOpacity,
        isActive ? 8 : 5,
        delta
      );
    } else {
      overlayOpacity.current = THREE.MathUtils.damp(overlayOpacity.current, 0, 5, delta);
    }

    overlayRef.current.material.opacity = overlayOpacity.current;

    const distance = 1;
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance;
    const width = height * camera.aspect;
    overlayRef.current.scale.set(width, height, 1);
    overlayRef.current.position.set(0, 0, -distance);
  });

  useEffect(() => {
    if (overlayRef.current && camera) {
      camera.add(overlayRef.current);
      return () => {
        if (overlayRef.current) camera.remove(overlayRef.current);
      };
    }
  }, [camera]);

  return (
    <>
      <mesh ref={overlayRef} material={overlayMaterial} renderOrder={1}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      {showWormhole && <LightspeedEffect isActive={isActive || showWormhole} camera={camera} />}
    </>
  );
}

export default HyperspaceDimension;
