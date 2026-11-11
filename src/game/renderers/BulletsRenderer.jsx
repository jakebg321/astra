import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { getWebSocketInstance } from '../services/UnifiedWebSocket';
import * as THREE from 'three';

const MAX_BULLETS = 500;
const MAX_SPARKS = 240;

const BulletsRenderer = () => {

  const coreRef = useRef();
  const glowRef = useRef();
  const bloomRef = useRef();
  const flashRef = useRef();

  const bulletTrails = useRef(new Map());
  const seenBullets = useRef(new Map());
  const frameCount = useRef(0);
  const lastHadImpacts = useRef(false);
  const [impactVersion, setImpactVersion] = useState(0);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const tempQuat = useMemo(() => new THREE.Quaternion(), []);
  const yAxis = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const tempVelNorm = useMemo(() => new THREE.Vector3(), []);

  const zeroMatrix = useMemo(() => {
    const m = new THREE.Matrix4();
    m.makeScale(0, 0, 0);
    return m;
  }, []);

  const layers = useMemo(() => {
    const additiveMat = () => new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    return {
      core: {
        geo: new THREE.CylinderGeometry(0.03, 0.03, 1, 6),
        mat: additiveMat()
      },
      glow: {
        geo: new THREE.CylinderGeometry(0.2, 0.2, 1, 6),
        mat: additiveMat()
      },
      bloom: {
        geo: new THREE.CylinderGeometry(0.8, 0.8, 1, 6),
        mat: additiveMat()
      },
      flash: {
        geo: new THREE.SphereGeometry(1, 8, 8),
        mat: additiveMat()
      }
    };
  }, []);

  useEffect(() => () => {
    Object.values(layers).forEach(l => { l.geo.dispose(); l.mat.dispose(); });
  }, [layers]);

  useEffect(() => {
    [coreRef, glowRef, bloomRef, flashRef].forEach(ref => {
      if (ref.current) ref.current.count = 0;
    });
  }, []);

  const getColor = (hex, hue) => {
    tempColor.set(hex);
    if (hue) {
      const hsl = {};
      tempColor.getHSL(hsl);
      hsl.h = (hsl.h + hue / 360 + 1) % 1;
      tempColor.setHSL(hsl.h, hsl.s, hsl.l);
    }
    return tempColor;
  };

  useFrame((state, delta) => {
    frameCount.current++;
    const now = Date.now();

    const serverBullets = getWebSocketInstance().getGameState()?.bullets || [];
    const trainingBullets = window.trainingBullets || [];
    const allBullets = [...serverBullets, ...trainingBullets];
    const trails = bulletTrails.current;

    const bsFrame = window.beamSettings || {};
    const BEAM_MAX_AGE = (bsFrame.holdMs ?? 80) + (bsFrame.fadeMs ?? 320) + 200;

    const seen = seenBullets.current;
    if (seen.size > 200) for (const [id, t] of seen) if (now - t > 5000) seen.delete(id);

    allBullets.forEach(bullet => {
      if (!trails.has(bullet.id)) {

        if (seen.has(bullet.id)) return;
        seen.set(bullet.id, now);

        const bulletCreatedTime = now;

        trails.set(bullet.id, {
          positions: [{
            x: bullet.position.x,
            y: bullet.position.y,
            z: bullet.position.z,
            time: now
          }],
          velocity: { ...bullet.velocity },
          created: bulletCreatedTime,
          lastSeen: now,
          originalBullet: bullet,
          startPosition: { ...bullet.spawnPosition },
          traveledDistance: 0,
          impacted: false,
          impactType: bullet.impactType,
          impactData: bullet.impactData,
          lifeDistance: bullet.lifeDistance || 1000
        });
      } else {
        const trail = trails.get(bullet.id);
        trail.lastSeen = now;

        const lastPos = trail.positions[trail.positions.length - 1];
        const distanceMoved = Math.sqrt(
          Math.pow(bullet.position.x - lastPos.x, 2) +
          Math.pow(bullet.position.y - lastPos.y, 2) +
          Math.pow(bullet.position.z - lastPos.z, 2)
        );
        trail.traveledDistance += distanceMoved;

        if (!trail.impacted && trail.impactType === 'planet' && trail.traveledDistance >= trail.lifeDistance) {
          trail.impacted = true;
          trail.impactTime = Date.now();
        }

        trail.positions.push({
          x: bullet.position.x,
          y: bullet.position.y,
          z: bullet.position.z,
          time: now
        });

        if (trail.positions.length > 5) {
          trail.positions.shift();
        }
      }
    });

    const BULLET_PERSIST_TIME = 300;
    const PLAYER_IMPACT_PERSIST_TIME = 300;
    const PLANET_IMPACT_PERSIST_TIME = 800;

    for (const [id, trail] of trails.entries()) {
      const impactDuration = trail.impactType === 'planet' ? PLANET_IMPACT_PERSIST_TIME : PLAYER_IMPACT_PERSIST_TIME;
      if (trail.impacted && now - trail.impactTime > impactDuration) {
        trails.delete(id);
        continue;
      }

      const trailAge = now - trail.created;
      if (trailAge > BEAM_MAX_AGE && !trail.impacted) {
        trails.delete(id);
        continue;
      }

      if (now - trail.lastSeen > BULLET_PERSIST_TIME) {
        trails.delete(id);
      } else if (now - trail.lastSeen > 0 && !trail.impacted) {
        const deltaTime = 16;
        const distanceMoved = Math.abs(trail.velocity.x * deltaTime * 0.001) +
                              Math.abs(trail.velocity.y * deltaTime * 0.001) +
                              Math.abs(trail.velocity.z * deltaTime * 0.001);
        trail.traveledDistance += distanceMoved;

        if (trail.impactType === 'planet' && trail.traveledDistance >= trail.lifeDistance) {
          trail.impacted = true;
          trail.impactTime = Date.now();
        }
      }
    }

    const core = coreRef.current;
    const glow = glowRef.current;
    const bloom = bloomRef.current;
    const flash = flashRef.current;
    if (!core || !glow || !bloom || !flash) return;

    const bs = window.beamSettings || {};
    const BEAM_HOLD = bs.holdMs ?? 80;
    const BEAM_FADE = bs.fadeMs ?? 320;
    const BEAM_TOTAL = BEAM_HOLD + BEAM_FADE;
    const beamLen = bs.beamLength ?? 1500;
    const halfLen = beamLen / 2;
    const hue = bs.hueShift ?? 0;
    const coreScale = (bs.coreRadius ?? 0.03) / 0.03;
    const glowScale = (bs.glowRadius ?? 0.2) / 0.2;
    const bloomScale = (bs.bloomRadius ?? 0.8) / 0.8;
    const cfgGlowOpacity = bs.glowOpacity ?? 0.45;
    const cfgBloomOpacity = bs.bloomOpacity ?? 0.12;
    const taper = bs.taperTip ?? 1.0;
    const flickerAmt = bs.flicker ?? 0;
    const flashMs = bs.flashMs ?? 80;
    const flashSize = bs.flashSize ?? 1.0;
    const flashMaxOpacity = bs.flashOpacity ?? 0.5;

    const coreBaseColor = getColor(bs.coreColor || '#ffffff', hue).clone();
    const glowBaseColor = getColor(bs.glowColor || '#ff2200', hue).clone();
    const bloomBaseColor = getColor(bs.bloomColor || '#ff3300', hue).clone();
    const flashBaseColor = getColor(bs.flashColor || '#ffaa33', hue).clone();

    const boostedCoreColor = new THREE.Color('#e8b4f8');
    const boostedGlowColor = new THREE.Color('#a855f7');
    const boostedBloomColor = new THREE.Color('#7c3aed');
    const boostedFlashColor = new THREE.Color('#c084fc');

    let beamIdx = 0;
    let flashIdx = 0;
    let hasImpacts = false;

    for (const trail of trails.values()) {

      if (trail.impacted) {
        hasImpacts = true;
        continue;
      }

      if (beamIdx >= MAX_BULLETS) continue;

      const age = now - trail.created;
      let opacity;
      if (age <= BEAM_HOLD) opacity = 1.0;
      else if (age <= BEAM_TOTAL) opacity = Math.pow(1.0 - (age - BEAM_HOLD) / BEAM_FADE, 2);
      else opacity = 0;
      if (opacity <= 0) continue;

      const origin = trail.startPosition;
      if (!origin || origin.x === undefined) continue;

      const vel = trail.velocity;
      const velLen = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z) || 1;
      const nx = vel.x / velLen, ny = vel.y / velLen, nz = vel.z / velLen;

      tempVelNorm.set(nx, ny, nz);
      tempQuat.setFromUnitVectors(yAxis, tempVelNorm);

      dummy.position.set(
        origin.x + nx * halfLen,
        origin.y + ny * halfLen,
        origin.z + nz * halfLen
      );
      dummy.quaternion.copy(tempQuat);

      let flickerMod = 1.0;
      if (flickerAmt > 0 && age <= BEAM_HOLD) {
        flickerMod = 1.0 - (Math.random() * flickerAmt * 0.3);
      }

      const isBoosted = trail.originalBullet?.wallBoosted;
      const useCoreColor = isBoosted ? boostedCoreColor : coreBaseColor;
      const useGlowColor = isBoosted ? boostedGlowColor : glowBaseColor;
      const useBloomColor = isBoosted ? boostedBloomColor : bloomBaseColor;
      const useFlashColor = isBoosted ? boostedFlashColor : flashBaseColor;

      const boostScale = isBoosted ? 1.4 : 1.0;

      dummy.scale.set(coreScale * taper * boostScale, beamLen, coreScale * boostScale);
      dummy.updateMatrix();
      core.setMatrixAt(beamIdx, dummy.matrix);
      tempColor.copy(useCoreColor).multiplyScalar(flickerMod);
      core.setColorAt(beamIdx, tempColor);

      dummy.scale.set(glowScale * opacity * taper * boostScale, beamLen, glowScale * opacity * boostScale);
      dummy.updateMatrix();
      glow.setMatrixAt(beamIdx, dummy.matrix);
      tempColor.copy(useGlowColor).multiplyScalar(cfgGlowOpacity * opacity * flickerMod);
      glow.setColorAt(beamIdx, tempColor);

      dummy.scale.set(bloomScale * opacity * taper * boostScale, beamLen, bloomScale * opacity * boostScale);
      dummy.updateMatrix();
      bloom.setMatrixAt(beamIdx, dummy.matrix);
      tempColor.copy(useBloomColor).multiplyScalar(cfgBloomOpacity * opacity * flickerMod);
      bloom.setColorAt(beamIdx, tempColor);

      beamIdx++;

      if (flashMs > 0 && age < flashMs && flashIdx < MAX_BULLETS) {
        const flashOpacity = Math.pow(1.0 - (age / flashMs), 2) * flashMaxOpacity * flickerMod;
        dummy.position.set(origin.x, origin.y, origin.z);
        dummy.quaternion.identity();
        const fScale = flashSize * boostScale;
        dummy.scale.set(fScale, fScale, fScale);
        dummy.updateMatrix();
        flash.setMatrixAt(flashIdx, dummy.matrix);
        tempColor.copy(useFlashColor).multiplyScalar(flashOpacity);
        flash.setColorAt(flashIdx, tempColor);
        flashIdx++;
      }
    }

    core.count = beamIdx;
    glow.count = beamIdx;
    bloom.count = beamIdx;
    flash.count = flashIdx;

    core.instanceMatrix.needsUpdate = true;
    glow.instanceMatrix.needsUpdate = true;
    bloom.instanceMatrix.needsUpdate = true;
    flash.instanceMatrix.needsUpdate = true;
    if (core.instanceColor) core.instanceColor.needsUpdate = true;
    if (glow.instanceColor) glow.instanceColor.needsUpdate = true;
    if (bloom.instanceColor) bloom.instanceColor.needsUpdate = true;
    if (flash.instanceColor) flash.instanceColor.needsUpdate = true;

    if (hasImpacts !== lastHadImpacts.current) {
      lastHadImpacts.current = hasImpacts;
      setImpactVersion(v => v + 1);
    } else if (hasImpacts) {

      setImpactVersion(v => v + 1);
    }
  });

  const impactMeshes = [];
  const now = Date.now();

  for (const trail of bulletTrails.current.values()) {
    if (!trail.impacted) continue;
    const timeSinceImpact = now - trail.impactTime;

    if (trail.impactType === 'planet') {

      if (timeSinceImpact < 800) {
        const hitPt = trail.impactData?.hitPoint;
        const center = trail.impactData?.planetCenter;
        if (hitPt && center) {
          const nx = hitPt.x - center.x;
          const ny = hitPt.y - center.y;
          const nz = hitPt.z - center.z;
          const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          const normal = new THREE.Vector3(nx / len, ny / len, nz / len);

          const quaternion = new THREE.Quaternion();
          quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
          const euler = new THREE.Euler().setFromQuaternion(quaternion);

          const px = hitPt.x + normal.x * 0.3;
          const py = hitPt.y + normal.y * 0.3;
          const pz = hitPt.z + normal.z * 0.3;

          const progress = timeSinceImpact / 800;
          const opacity = Math.max(0, 0.7 * (1 - progress));

          impactMeshes.push(
            <mesh
              key={`scorch-${trail.originalBullet.id}`}
              position={[px, py, pz]}
              rotation={[euler.x, euler.y, euler.z]}
            >
              <circleGeometry args={[3, 16]} />
              <meshBasicMaterial
                color="#331100"
                transparent
                opacity={opacity}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          );
        }
      }
    } else if (trail.impactType === 'asteroid') {

      if (timeSinceImpact < 400) {
        const impactPos = {
          x: trail.impactData?.hitPoint?.x || trail.positions[trail.positions.length - 1].x,
          y: trail.impactData?.hitPoint?.y || trail.positions[trail.positions.length - 1].y,
          z: trail.impactData?.hitPoint?.z || trail.positions[trail.positions.length - 1].z
        };

        if (!trail.sparks) {
          trail.sparks = [];
          const sparkCount = 10;
          for (let i = 0; i < sparkCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = 20 + Math.random() * 40;
            trail.sparks.push({
              velocity: {
                x: Math.sin(phi) * Math.cos(theta) * speed,
                y: Math.sin(phi) * Math.sin(theta) * speed,
                z: Math.cos(phi) * speed
              },
              color: ['#aa8855', '#887744', '#665533', '#ccaa77'][Math.floor(Math.random() * 4)]
            });
          }
        }

        const progress = timeSinceImpact / 400;
        const gravity = -180;
        const t = timeSinceImpact / 1000;

        trail.sparks.forEach((spark, idx) => {
          const sparkOpacity = Math.max(0, 1 - progress) * 0.7;
          const size = (1 - progress * 0.5) * 1.5;

          impactMeshes.push(
            <mesh
              key={`rock-${trail.originalBullet.id}-${idx}`}
              position={[
                impactPos.x + spark.velocity.x * t,
                impactPos.y + spark.velocity.y * t + 0.5 * gravity * t * t,
                impactPos.z + spark.velocity.z * t
              ]}
            >
              <sphereGeometry args={[size, 6, 6]} />
              <meshBasicMaterial
                color={spark.color}
                transparent
                opacity={sparkOpacity}
                depthWrite={false}
              />
            </mesh>
          );
        });
      }
    } else {

      if (timeSinceImpact < 300) {
        const impactPos = {
          x: trail.impactData?.hitPoint?.x || trail.positions[trail.positions.length - 1].x,
          y: trail.impactData?.hitPoint?.y || trail.positions[trail.positions.length - 1].y,
          z: trail.impactData?.hitPoint?.z || trail.positions[trail.positions.length - 1].z
        };

        if (!trail.sparks) {
          trail.sparks = [];
          const sparkCount = 12;
          for (let i = 0; i < sparkCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = 30 + Math.random() * 60;
            trail.sparks.push({
              velocity: {
                x: Math.sin(phi) * Math.cos(theta) * speed,
                y: Math.sin(phi) * Math.sin(theta) * speed,
                z: Math.cos(phi) * speed
              },
              color: [
                '#ffff00', '#ff4500', '#ff69b4', '#00ff00',
                '#00ffff', '#ff00ff', '#ffffff'
              ][Math.floor(Math.random() * 7)]
            });
          }
        }

        const progress = timeSinceImpact / 300;
        const gravity = -250;
        const t = timeSinceImpact / 1000;

        trail.sparks.forEach((spark, idx) => {
          const sparkOpacity = Math.max(0, 1 - progress) * 0.8;
          const size = (1 - progress * 0.5) * 2;

          impactMeshes.push(
            <mesh
              key={`spark-${trail.originalBullet.id}-${idx}`}
              position={[
                impactPos.x + spark.velocity.x * t,
                impactPos.y + spark.velocity.y * t + 0.5 * gravity * t * t,
                impactPos.z + spark.velocity.z * t
              ]}
            >
              <sphereGeometry args={[size, 8, 8]} />
              <meshBasicMaterial
                color={spark.color}
                transparent
                opacity={sparkOpacity}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          );
        });
      }
    }
  }

  return (
    <>

      <instancedMesh ref={coreRef} args={[layers.core.geo, layers.core.mat, MAX_BULLETS]} frustumCulled={false} />
      <instancedMesh ref={glowRef} args={[layers.glow.geo, layers.glow.mat, MAX_BULLETS]} frustumCulled={false} />
      <instancedMesh ref={bloomRef} args={[layers.bloom.geo, layers.bloom.mat, MAX_BULLETS]} frustumCulled={false} />
      <instancedMesh ref={flashRef} args={[layers.flash.geo, layers.flash.mat, MAX_BULLETS]} frustumCulled={false} />

      {impactMeshes}
    </>
  );
};

export default BulletsRenderer;
