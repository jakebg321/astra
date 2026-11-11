import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getConfiguredSpeedForState, getSpeedPerceptionFactor } from '../utils/speedPerception.js';

const MIN_VISIBLE_SPEED = 12;
const BASE_PARTICLE_COUNT = 130;
const MEDIUM_PARTICLE_COUNT = 220;
const HIGH_PARTICLE_COUNT = 340;
const BOOST_PARTICLE_BONUS = 55;
const DODGE_PARTICLE_BONUS = 80;

const clamp = THREE.MathUtils.clamp;

function getSpeedMagnitude(velocity) {
  if (!velocity) return 0;
  return Math.sqrt(
    velocity.x * velocity.x +
    velocity.y * velocity.y +
    velocity.z * velocity.z
  );
}

export default function CameraDustField({
  playerVelocity,
  isBoosting = false,
  enabled = true,
  maxParticles = 420
}) {
  const { camera } = useThree();
  const dustRef = useRef();
  const speedMultipliersRef = useRef(new Float32Array(maxParticles));
  const burstRef = useRef({ value: 0, lastDirection: 0 });

  const positions = useMemo(() => new Float32Array(maxParticles * 3), [maxParticles]);

  const dustGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, BASE_PARTICLE_COUNT);
    return geometry;
  }, [positions]);

  const dustMaterial = useMemo(() => (
    new THREE.PointsMaterial({
      color: '#d9f7ff',
      size: 0.09,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false
    })
  ), []);

  const respawnParticle = (index, spreadDepth = true) => {
    const i3 = index * 3;
    const speedMultipliers = speedMultipliersRef.current;

    const angle = Math.random() * Math.PI * 2;
    const radius = 0.45 + Math.pow(Math.random(), 0.6) * 10.5;

    const z = spreadDepth
      ? -(8 + Math.random() * 95)
      : -(2 + Math.random() * 6);

    positions[i3] = Math.cos(angle) * radius;
    positions[i3 + 1] = Math.sin(angle) * radius;
    positions[i3 + 2] = z;

    speedMultipliers[index] = 0.75 + Math.random() * 1.05;
  };

  const respawnLateralParticle = (index, direction) => {
    const i3 = index * 3;
    const speedMultipliers = speedMultipliersRef.current;
    const side = direction > 0 ? -1 : 1;

    positions[i3] = side * (10 + Math.random() * 16);
    positions[i3 + 1] = -8 + Math.random() * 16;
    positions[i3 + 2] = -(2 + Math.random() * 26);

    speedMultipliers[index] = 0.9 + Math.random() * 1.4;
  };

  useEffect(() => {
    for (let i = 0; i < maxParticles; i++) {
      respawnParticle(i, true);
    }
    dustGeometry.attributes.position.needsUpdate = true;
  }, [maxParticles, dustGeometry]);

  useEffect(() => {
    if (dustRef.current && camera) {
      camera.add(dustRef.current);
      return () => {
        if (dustRef.current) {
          camera.remove(dustRef.current);
        }
      };
    }
    return undefined;
  }, [camera]);

  useEffect(() => {
    return () => {
      dustGeometry.dispose();
      dustMaterial.dispose();
    };
  }, [dustGeometry, dustMaterial]);

  useFrame((state, delta) => {
    if (!dustRef.current || !enabled) {
      if (dustRef.current) dustRef.current.visible = false;
      return;
    }

    dustRef.current.visible = true;

    const speed = getSpeedMagnitude(playerVelocity);
    const maxSpeed = getConfiguredSpeedForState(isBoosting);
    const speedFactor = getSpeedPerceptionFactor(speed, isBoosting, { threshold: MIN_VISIBLE_SPEED, maxSpeed });

    const dodgeState = window.gameMovementState?.dodge;
    const dodgeDirection = dodgeState?.isLeftVisualActive ? -1 : dodgeState?.isRightVisualActive ? 1 : 0;
    const isDodging = dodgeDirection !== 0;

    if (speed < MIN_VISIBLE_SPEED && !isBoosting && !isDodging) {
      dustRef.current.visible = false;
      return;
    }

    if (isDodging && burstRef.current.lastDirection !== dodgeDirection) {
      burstRef.current.value = 1;
    }
    burstRef.current.lastDirection = dodgeDirection;
    burstRef.current.value = Math.max(0, burstRef.current.value - delta * 2.7);
    const burst = burstRef.current.value;

    const fps = 1 / Math.max(delta, 0.001);
    let targetCount = speedFactor < 0.12 ? BASE_PARTICLE_COUNT : MEDIUM_PARTICLE_COUNT;
    if (speedFactor > 0.55) targetCount = HIGH_PARTICLE_COUNT;
    if (isBoosting) targetCount += BOOST_PARTICLE_BONUS;
    if (isDodging) targetCount += DODGE_PARTICLE_BONUS;
    if (burst > 0) targetCount += Math.floor(45 * burst);

    if (fps < 45) targetCount = Math.floor(targetCount * 0.8);
    if (fps < 35) targetCount = Math.floor(targetCount * 0.65);
    targetCount = clamp(targetCount, BASE_PARTICLE_COUNT, maxParticles);

    dustGeometry.setDrawRange(0, targetCount);

    const baseOpacity = 0.05 + speedFactor * 0.22 + (isBoosting ? 0.07 : 0) + (isDodging ? 0.06 : 0) + (burst * 0.08);
    dustMaterial.opacity = clamp(baseOpacity, 0.04, 0.44);

    const forwardSpeed = 8 + speedFactor * 180 + (isBoosting ? 85 : 0);
    const swirlStrength = delta * (0.006 + speedFactor * 0.025 + (isBoosting ? 0.015 : 0));
    const lateralSpeed = 48 + speedFactor * 80 + (isBoosting ? 25 : 0) + (burst * 70);

    const pos = dustGeometry.attributes.position.array;
    const speedMultipliers = speedMultipliersRef.current;

    for (let i = 0; i < targetCount; i++) {
      const i3 = i * 3;
      const driftScale = speedMultipliers[i];

      if (isDodging) {

        pos[i3] += delta * lateralSpeed * driftScale * dodgeDirection;
        pos[i3 + 2] += delta * (forwardSpeed * 0.75) * driftScale;

        pos[i3 + 1] += Math.sin(state.clock.elapsedTime * 10 + i * 0.19) * delta * (1.5 + burst * 0.8);

        if (
          pos[i3 + 2] > -0.6 ||
          (dodgeDirection > 0 && pos[i3] > 34) ||
          (dodgeDirection < 0 && pos[i3] < -34)
        ) {
          respawnLateralParticle(i, dodgeDirection);
        }
      } else {

        pos[i3 + 2] += delta * forwardSpeed * driftScale;

        const x = pos[i3];
        const y = pos[i3 + 1];
        pos[i3] = x - (y * swirlStrength);
        pos[i3 + 1] = y + (x * swirlStrength);

        if (pos[i3 + 2] > -0.6) {
          respawnParticle(i, true);
        }
      }
    }

    dustGeometry.attributes.position.needsUpdate = true;
  });

  return (
    <points
      ref={dustRef}
      geometry={dustGeometry}
      material={dustMaterial}
      position={[0, 0, -1.8]}
      frustumCulled={false}
    />
  );
}
