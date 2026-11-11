import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getConfiguredSpeedForState, getSpeedPerceptionFactor } from '../utils/speedPerception.js';

const MIN_VISIBLE_SPEED = 6;
const BASE_STREAKS = 30;

const clamp = THREE.MathUtils.clamp;

function getSpeedMagnitude(velocity) {
  if (!velocity) return 0;
  return Math.sqrt(
    velocity.x * velocity.x +
    velocity.y * velocity.y +
    velocity.z * velocity.z
  );
}

export default function CameraDashStreaks({
  playerVelocity,
  isBoosting = false,
  enabled = true,
  maxStreaks = 180
}) {
  const { camera } = useThree();
  const streaksRef = useRef();
  const burstRef = useRef({ value: 0, lastDirection: 0 });
  const lineDataRef = useRef([]);

  const positions = useMemo(() => new Float32Array(maxStreaks * 2 * 3), [maxStreaks]);
  const colors = useMemo(() => new Float32Array(maxStreaks * 2 * 3), [maxStreaks]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setDrawRange(0, BASE_STREAKS * 2);
    return geo;
  }, [positions, colors]);

  const material = useMemo(() => (
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false
    })
  ), []);

  const resetForwardLine = (line) => {
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.2 + Math.random() * 12;
    line.x = Math.cos(angle) * radius;
    line.y = Math.sin(angle) * radius;
    line.z = -(7 + Math.random() * 115);
    line.length = 0.35 + Math.random() * 1.7;
    line.speed = 0.7 + Math.random() * 1.4;
    line.mode = 'forward';
  };

  const resetLateralLine = (line, direction) => {
    const side = direction > 0 ? -1 : 1;
    line.x = side * (7 + Math.random() * 13);
    line.y = -7 + Math.random() * 14;
    line.z = -(2 + Math.random() * 30);
    line.length = 0.8 + Math.random() * 2.2;
    line.speed = 0.85 + Math.random() * 1.45;
    line.mode = 'lateral';
    line.direction = direction;
  };

  useEffect(() => {
    const lines = new Array(maxStreaks);
    for (let i = 0; i < maxStreaks; i++) {
      lines[i] = {
        x: 0,
        y: 0,
        z: 0,
        length: 1,
        speed: 1,
        mode: 'forward',
        direction: 0
      };
      resetForwardLine(lines[i]);
    }
    lineDataRef.current = lines;
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }, [maxStreaks, geometry]);

  useEffect(() => {
    if (!streaksRef.current || !camera) return undefined;
    camera.add(streaksRef.current);
    return () => {
      if (streaksRef.current) {
        camera.remove(streaksRef.current);
      }
    };
  }, [camera]);

  useEffect(() => (
    () => {
      geometry.dispose();
      material.dispose();
    }
  ), [geometry, material]);

  useFrame((state, delta) => {
    if (!streaksRef.current || !enabled) {
      if (streaksRef.current) streaksRef.current.visible = false;
      return;
    }

    streaksRef.current.visible = true;

    const speed = getSpeedMagnitude(playerVelocity);
    const maxSpeed = getConfiguredSpeedForState(isBoosting);
    const speedFactor = getSpeedPerceptionFactor(speed, isBoosting, { threshold: MIN_VISIBLE_SPEED, maxSpeed });

    const dodgeState = window.gameMovementState?.dodge;
    const dodgeDirection = dodgeState?.isLeftVisualActive ? -1 : dodgeState?.isRightVisualActive ? 1 : 0;
    const verticalDodgeDirection = dodgeState?.isUpVisualActive ? 1 : dodgeState?.isDownVisualActive ? -1 : 0;
    const isDodging = dodgeDirection !== 0 || verticalDodgeDirection !== 0;

    const dodgeKey = dodgeDirection * 3 + verticalDodgeDirection;
    if (isDodging && burstRef.current.lastDodgeKey !== dodgeKey) {
      burstRef.current.value = 1;
    }
    burstRef.current.lastDodgeKey = isDodging ? dodgeKey : 0;
    burstRef.current.lastDirection = dodgeDirection;
    if (dodgeDirection !== 0) burstRef.current.lastLateralDir = dodgeDirection;
    burstRef.current.value = Math.max(0, burstRef.current.value - delta * 2.9);
    const burst = burstRef.current.value;

    let targetCount = BASE_STREAKS + Math.floor(speedFactor * 42);
    if (isBoosting) targetCount += 22;
    if (isDodging) targetCount += 34;
    if (burst > 0) targetCount += Math.floor(18 * burst);

    const fps = 1 / Math.max(delta, 0.001);
    if (fps < 45) targetCount = Math.floor(targetCount * 0.84);
    if (fps < 35) targetCount = Math.floor(targetCount * 0.66);
    targetCount = clamp(targetCount, BASE_STREAKS, maxStreaks);
    geometry.setDrawRange(0, targetCount * 2);

    const targetOpacity = clamp(
      0.06 +
      speedFactor * 0.08 +
      (isBoosting ? 0.1 : 0) +
      (isDodging ? 0.14 : 0) +
      burst * 0.14,
      0.05,
      0.62
    );
    material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.22);

    const pos = geometry.attributes.position.array;
    const col = geometry.attributes.color.array;
    const lines = lineDataRef.current;

    const forwardSpeed = 88 + speedFactor * 250 + (isBoosting ? 80 : 0);
    const lateralSpeed = 92 + speedFactor * 110 + (isBoosting ? 35 : 0);
    const lateralModeActive = dodgeDirection !== 0 || (burst > 0.1 && burstRef.current.lastLateralDir !== 0);

    for (let i = 0; i < targetCount; i++) {
      const line = lines[i];
      const i6 = i * 6;

      if (lateralModeActive) {
        const effectiveDirection = isDodging ? dodgeDirection : (line.direction || burstRef.current.lastDirection || 1);
        if (line.mode !== 'lateral' || line.direction !== effectiveDirection) {
          resetLateralLine(line, effectiveDirection);
        }

        line.x += delta * lateralSpeed * line.speed * effectiveDirection;
        line.z += delta * (forwardSpeed * 0.8) * line.speed;
        line.y += Math.sin(state.clock.elapsedTime * 12 + i * 0.31) * delta * 1.1;

        if (
          line.z > -0.25 ||
          (effectiveDirection > 0 && line.x > 34) ||
          (effectiveDirection < 0 && line.x < -34)
        ) {
          resetLateralLine(line, effectiveDirection);
        }

        const endX = line.x - (effectiveDirection * line.length * 0.55);
        const endY = line.y * 0.97;
        const endZ = line.z - line.length * 1.35;

        pos[i6] = line.x;
        pos[i6 + 1] = line.y;
        pos[i6 + 2] = line.z;
        pos[i6 + 3] = endX;
        pos[i6 + 4] = endY;
        pos[i6 + 5] = endZ;

        const hot = clamp(0.82 + burst * 0.25, 0, 1);
        col[i6] = 0.45 * hot;
        col[i6 + 1] = 0.95 * hot;
        col[i6 + 2] = 1.0 * hot;
        col[i6 + 3] = 0.18;
        col[i6 + 4] = 0.58;
        col[i6 + 5] = 0.95;
      } else {
        if (line.mode !== 'forward') {
          resetForwardLine(line);
        }

        line.z += delta * forwardSpeed * line.speed;
        line.x += Math.sin(state.clock.elapsedTime * 6 + i * 0.22) * delta * 0.55;
        line.y += Math.cos(state.clock.elapsedTime * 7 + i * 0.19) * delta * 0.55;

        if (line.z > -0.25) {
          resetForwardLine(line);
        }

        const endX = line.x * 0.93;
        const endY = line.y * 0.93;
        const endZ = line.z - line.length;

        pos[i6] = line.x;
        pos[i6 + 1] = line.y;
        pos[i6 + 2] = line.z;
        pos[i6 + 3] = endX;
        pos[i6 + 4] = endY;
        pos[i6 + 5] = endZ;

        col[i6] = 0.34;
        col[i6 + 1] = 0.78;
        col[i6 + 2] = 1.0;
        col[i6 + 3] = 0.08;
        col[i6 + 4] = 0.28;
        col[i6 + 5] = 0.52;
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  });

  return (
    <lineSegments
      ref={streaksRef}
      geometry={geometry}
      material={material}
      position={[0, 0, -1.8]}
      frustumCulled={false}
    />
  );
}
