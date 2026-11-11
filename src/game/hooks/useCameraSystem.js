import React, { useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const useCameraSystem = (playerPosition, playerRotation) => {
  const { camera } = useThree();
  
  const cachedVectors = useRef({
    cameraOffset: new THREE.Vector3(),
    idealCameraPos: new THREE.Vector3(),
    predictedPos: new THREE.Vector3(),
    velocityOffset: new THREE.Vector3(),
    cachedEuler: new THREE.Euler()
  });

  const cameraState = useRef({
    lastPlayerVelocity: new THREE.Vector3(),
    smoothingFactor: 0.15,
    lastFrameTime: 0,
    baseFOV: 75,
    currentFOV: 75,
    targetFOV: 75,
    fovSmoothingFactor: 0.1,

    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    lookAtTarget: new THREE.Vector3(),
    lookAtVelocity: new THREE.Vector3(),
    initialized: false,
    springStrength: 8.0,
    damping: 0.9,
    swayMultiplier: 0.15,
    lookAheadMultiplier: 0.1,
    currentCameraDistance: 0,
    targetCameraDistance: 0,

    lastPosition: new THREE.Vector3(),
    calculatedVelocity: new THREE.Vector3(),
    smoothVelocity: new THREE.Vector3(),

    dodgeTilt: 0,
    targetDodgeTilt: 0,
    dodgeTiltSpeed: 0.15,
    maxDodgeTilt: 0.15,
    dodgeOffset: new THREE.Vector3(0, 0, 0),
    targetDodgeOffset: new THREE.Vector3(0, 0, 0),
    dodgeOffsetStrength: 2,

    dodgeFOVPunch: 0,
    wasDodging: false,

    driftLag: new THREE.Vector3(0, 0, 0),
    driftLagSpeed: 0.25,
    settingsCache: {
      cameraDistance: 25,
      cameraMode: 'simple',
      visualRollOnly: true,
      lastUpdate: 0
    }
  });

  if (typeof window !== 'undefined') {
    window.cameraState = cameraState.current;
    window.gameCamera = camera;
  }

  React.useEffect(() => {
    const handleForceSync = (event) => {
      const { position } = event.detail;
      if (position && cameraState.current) {
        console.log('Camera: Force position sync received');
        cameraState.current.position.set(position.x, position.y, position.z);
        cameraState.current.lastPosition.set(position.x, position.y, position.z);
        cameraState.current.lookAtTarget.set(position.x, position.y + 1.5, position.z);
        cameraState.current.velocity.set(0, 0, 0);
        cameraState.current.lookAtVelocity.set(0, 0, 0);
        cameraState.current.smoothVelocity.set(0, 0, 0);
        cameraState.current.calculatedVelocity.set(0, 0, 0);
      }
    };
    
    window.addEventListener('force-position-sync', handleForceSync);
    return () => window.removeEventListener('force-position-sync', handleForceSync);
  }, []);

  const updateCamera = () => {
    if (!playerPosition || !playerRotation) return;

    const vectors = cachedVectors.current;
    const camState = cameraState.current;
    const now = performance.now();

    if (now - camState.settingsCache.lastUpdate > 500) {
      camState.settingsCache.cameraDistance = window.debugCameraDistance || 
                                             parseFloat(localStorage.getItem('cameraDistance')) || 25;
      camState.settingsCache.cameraMode = localStorage.getItem('cameraMode') || 'simple';
      camState.settingsCache.visualRollOnly = localStorage.getItem('visualRollOnly') === 'true';
      camState.settingsCache.lastUpdate = now;
    }
    
    const baseCameraDistance = camState.settingsCache.cameraDistance;
    const cameraMode = camState.settingsCache.cameraMode;
    const visualRollOnly = camState.settingsCache.visualRollOnly !== false;
    const delta = Math.min((now - camState.lastFrameTime) / 1000, 0.1);

    if (camState.lastPosition.distanceTo(playerPosition) > 0.01) {
      camState.calculatedVelocity.copy(playerPosition).sub(camState.lastPosition);
      camState.calculatedVelocity.divideScalar(delta || 0.016);
      
      camState.smoothVelocity.lerp(camState.calculatedVelocity, 0.3);
      camState.lastPosition.copy(playerPosition);
    }
    
    camState.lastFrameTime = now;

    if (window.gameMovementState && window.gameMovementState.dodge) {
      const dodgeState = window.gameMovementState.dodge;

      const isAnyDodge = dodgeState.isLeftDodging || dodgeState.isRightDodging ||
                         dodgeState.isUpDodging || dodgeState.isDownDodging;
      if (isAnyDodge && !camState.wasDodging) {
        camState.dodgeFOVPunch = 15;
      }
      camState.wasDodging = isAnyDodge;

      if (dodgeState.isLeftDodging) {
        camState.targetDodgeTilt = -camState.maxDodgeTilt * 0.5;
        camState.targetDodgeOffset.set(camState.dodgeOffsetStrength, 0, 0);
        
        camState.driftLag.x = -0.5;
      } else if (dodgeState.isRightDodging) {
        camState.targetDodgeTilt = camState.maxDodgeTilt * 0.5;
        camState.targetDodgeOffset.set(-camState.dodgeOffsetStrength, 0, 0);
        
        camState.driftLag.x = 0.5;
      } else {
        camState.targetDodgeTilt = 0;
        camState.targetDodgeOffset.set(0, 0, 0);
      }
    } else {
      camState.targetDodgeTilt = 0;
      camState.targetDodgeOffset.set(0, 0, 0);
      camState.wasDodging = false;
    }
    
    camState.dodgeTilt = THREE.MathUtils.lerp(
      camState.dodgeTilt,
      camState.targetDodgeTilt,
      camState.dodgeTiltSpeed * 0.5
    );
    
    camState.dodgeOffset.lerp(camState.targetDodgeOffset, camState.dodgeTiltSpeed);
    
    camState.driftLag.lerp(vectors.tempVector1.set(0, 0, 0), camState.driftLagSpeed);

    if (camState.dodgeFOVPunch > 0.1) {
      camState.dodgeFOVPunch *= 0.88;
    } else {
      camState.dodgeFOVPunch = 0;
    }

    const tempVec1 = vectors.velocityOffset;
    const tempVec2 = vectors.predictedPos;
    const tempVec3 = vectors.cameraOffset;
    
    if (cameraMode === 'momentum') {

      if (!camState.initialized) {
        vectors.cameraOffset.set(0, 2.2, baseCameraDistance);
        const cameraRotation = new THREE.Euler(playerRotation.pitch || 0, playerRotation.yaw || 0, 0, 'YXZ');
        vectors.cameraOffset.applyEuler(cameraRotation);
        camState.position.copy(playerPosition).add(vectors.cameraOffset);
        camState.lookAtTarget.copy(playerPosition);
        camState.lastPosition.copy(playerPosition);
        camState.initialized = true;
      }
      
      const isBoosting = playerRotation.isBoosting || false;
      camState.targetCameraDistance = isBoosting ? baseCameraDistance * 1.5 : baseCameraDistance;
      
      if (camState.currentCameraDistance === 0) {
        camState.currentCameraDistance = camState.targetCameraDistance;
      }
      
      const cameraLerpRate = 0.12;
      camState.currentCameraDistance = THREE.MathUtils.lerp(
        camState.currentCameraDistance,
        camState.targetCameraDistance,
        cameraLerpRate
      );
      
      vectors.cameraOffset.set(0, 2.2, camState.currentCameraDistance);
      const cameraRoll = visualRollOnly ? 0 : (playerRotation.roll || 0);
      const cameraRotation = new THREE.Euler(playerRotation.pitch || 0, playerRotation.yaw || 0, cameraRoll, 'YXZ');
      vectors.cameraOffset.applyEuler(cameraRotation);
      vectors.idealCameraPos.copy(playerPosition).add(vectors.cameraOffset);

      const forward = new THREE.Vector3(0, 0, -1);
      const right = new THREE.Vector3(1, 0, 0);
      forward.applyEuler(new THREE.Euler(playerRotation.pitch || 0, playerRotation.yaw || 0, 0, 'YXZ'));
      right.applyEuler(new THREE.Euler(playerRotation.pitch || 0, playerRotation.yaw || 0, 0, 'YXZ'));
      
      const lateralVelocity = camState.smoothVelocity.dot(right);
      tempVec1.copy(right).multiplyScalar(-lateralVelocity * camState.swayMultiplier);
      vectors.idealCameraPos.add(tempVec1);
      
      tempVec1.copy(vectors.idealCameraPos).sub(camState.position);
      tempVec2.copy(tempVec1).multiplyScalar(camState.springStrength * delta);
      camState.velocity.add(tempVec2);
      camState.velocity.multiplyScalar(camState.damping);
      
      tempVec1.copy(camState.velocity).multiplyScalar(delta);
      camState.position.add(tempVec1);
      camera.position.copy(camState.position);
      
      tempVec1.copy(playerPosition);
      tempVec1.y += 1.5;
      
      tempVec2.copy(camState.smoothVelocity).multiplyScalar(camState.lookAheadMultiplier);
      tempVec1.add(tempVec2);
      
      tempVec2.copy(tempVec1).sub(camState.lookAtTarget);
      tempVec3.copy(tempVec2).multiplyScalar(camState.springStrength * delta);
      camState.lookAtVelocity.add(tempVec3);
      camState.lookAtVelocity.multiplyScalar(camState.damping);
      tempVec3.copy(camState.lookAtVelocity).multiplyScalar(delta);
      camState.lookAtTarget.add(tempVec3);
      
      camera.lookAt(camState.lookAtTarget);
      
      if (Math.abs(camState.dodgeTilt) > 0.001) {
        camera.rotation.z = camState.dodgeTilt;
      }

      if (camState.dodgeFOVPunch > 0.1) {
        camera.fov = camState.baseFOV + camState.dodgeFOVPunch;
        camera.updateProjectionMatrix();
      }

    } else {

      const smoothingFactor = 0.15;
      const predictionStrength = 0.2;

      const deltaTime = Math.min(delta, 0.016);
      
      const currentVelocity = playerRotation.velocity || camState.lastPlayerVelocity;

      const predictionTime = 0.015 * predictionStrength;
      vectors.predictedPos.copy(playerPosition);
      if (currentVelocity && currentVelocity.length && currentVelocity.length() > 1.0) {
        vectors.velocityOffset.copy(currentVelocity).multiplyScalar(predictionTime);
        vectors.predictedPos.add(vectors.velocityOffset);
      }

      vectors.cameraOffset.set(0, 4.0, baseCameraDistance);
      
      const cameraRoll = visualRollOnly ? 0 : playerRotation.roll;
      const cameraRotation = vectors.cachedEuler.set(
        playerRotation.pitch, 
        playerRotation.yaw, 
        cameraRoll, 
        'YXZ'
      );
      
      vectors.cameraOffset.applyEuler(cameraRotation);
      
      vectors.idealCameraPos.copy(vectors.predictedPos).add(vectors.cameraOffset);
      
      vectors.idealCameraPos.add(camState.dodgeOffset);

      vectors.idealCameraPos.add(camState.driftLag);

      const cameraDiff = camera.position.distanceTo(vectors.idealCameraPos);
      
      if (cameraDiff > 0.001) {

        const movementSpeed = currentVelocity && currentVelocity.length ? currentVelocity.length() : 0;
        const speedFactor = Math.min(movementSpeed / 50, 1.0);
        const adaptiveSmoothingFactor = smoothingFactor + (speedFactor * 0.05);
        
        camera.position.lerp(vectors.idealCameraPos, Math.min(adaptiveSmoothingFactor, 0.5));
      } else {
        camera.position.copy(vectors.idealCameraPos);
      }
      
      if (currentVelocity && currentVelocity.copy) {
        camState.lastPlayerVelocity.copy(currentVelocity);
      }

      const speed = currentVelocity ? currentVelocity.length() : 0;
      const speedThreshold = 10.5;
      const maxSpeed = 35;
      const speedFactor = Math.min(Math.max(speed - speedThreshold, 0) / (maxSpeed - speedThreshold), 1);
      
      camState.targetFOV = camState.baseFOV + (speedFactor * 15) + camState.dodgeFOVPunch;

      const fovLerpSpeed = camState.dodgeFOVPunch > 1 ? 0.3 : camState.fovSmoothingFactor;
      camState.currentFOV += (camState.targetFOV - camState.currentFOV) * fovLerpSpeed;
      
      if (Math.abs(camera.fov - camState.currentFOV) > 0.1) {
        camera.fov = camState.currentFOV;
        camera.updateProjectionMatrix();
      }

      camera.lookAt(
        vectors.predictedPos.x, 
        vectors.predictedPos.y + 1.5, 
        vectors.predictedPos.z
      );
      
      if (Math.abs(camState.dodgeTilt) > 0.001) {
        camera.rotation.z = camState.dodgeTilt;
      }
    }
  };

  return {
    updateCamera
  };
};