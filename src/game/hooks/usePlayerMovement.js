import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GAME_CONFIG } from '../config/GameConfig.js';
import { isTestModeEnabled } from '../debug/TestModeConfig.js';

import { getAudioManager } from '../services/AudioManager.js';
import inputManager from '../systems/InputManager.js';
import { getWebSocketInstance } from '../services/UnifiedWebSocket.js';

export const usePlayerMovement = () => {

  if (typeof window !== 'undefined') {
    const storedPitch = sessionStorage.getItem('FORCE_PITCH');
    const storedYaw = sessionStorage.getItem('FORCE_YAW');
    
    if (storedPitch && !isNaN(parseFloat(storedPitch))) {
      window.FORCE_PITCH = parseFloat(storedPitch);
      if (!window.pitchRestoreLogged) {
        console.log('PITCH SYSTEM: Successfully restored values from session storage');
        window.pitchRestoreLogged = true;
      }
    }
    if (storedYaw && !isNaN(parseFloat(storedYaw))) {
      window.FORCE_YAW = parseFloat(storedYaw);
    }
  }

  const TARGET_FPS = 60;

  const debugState = useRef({
    lastLogTime: 0,
    lastStrafeState: null,
    logInterval: 100
  });

  const gameState = useRef({
    position: new THREE.Vector3(0, 0, 0),
    pitch: 0,
    yaw: 0,
    roll: 0,
    velocity: new THREE.Vector3(0, 0, 0),
    visualTilt: 0,
    dodgeVisualTilt: 0,
    targetDodgeVisualTilt: 0,
    health: 100,
    boost: 100,
    isBoosting: false,
    isBraking: false,
    initialized: false,
    strafeOffset: 0,
    inCollisionResponse: false,
    spawnReceived: false,
    
    lastSpacePressed: false,
    spaceFrameCount: 0,
    lastFrameTime: 0,

    portalAbility: {
      isReady: true,
      cooldownDuration: 5000,
      isDeploying: false,
      cooldownEndTime: 0,
      previewPosition: null,
      distance: (() => {
        const stored = localStorage.getItem('portalDistance');
        const parsed = stored ? parseFloat(stored) : NaN;
        return !isNaN(parsed) ? Math.max(100, Math.min(1500, parsed)) : 300;
      })()
    },

    crystalWallAbility: {
      isReady: true,
      cooldownDuration: GAME_CONFIG.crystalWall.cooldown,
      isDeploying: false,
      cooldownEndTime: 0,
      previewPosition: null,
      previewRotation: null,
      distance: GAME_CONFIG.crystalWall.deployDistance,
    },

    dodge: {
      cooldownLeft: 0,
      cooldownRight: 0,
      cooldownUp: 0,
      cooldownDown: 0,
      cooldownDuration: 2000,
      dodgeForce: 750,
      dodgeDuration: 560,
      visualDuration: 1000,
      isLeftDodging: false,
      isRightDodging: false,
      isUpDodging: false,
      isDownDodging: false,
      isLeftVisualActive: false,
      isRightVisualActive: false,
      isUpVisualActive: false,
      isDownVisualActive: false,
      leftStartTime: 0,
      rightStartTime: 0,
      upStartTime: 0,
      downStartTime: 0,
      lastUpPress: false,
      lastDownPress: false,
      lastLeftPress: false,
      lastRightPress: false
    }
  });

  useEffect(() => {
    const handleReplayReset = () => {
      gameState.current.spawnReceived = false;
      gameState.current.initialized = false;
      console.log('Movement reset: spawnReceived cleared for replay');
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('astra:replay-reset', handleReplayReset);
      return () => window.removeEventListener('astra:replay-reset', handleReplayReset);
    }
  }, []);

  if (typeof window !== 'undefined') {
    window.gameMovementState = gameState.current;
  }

  const cachedVectors = useRef({
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0),
    tempVector1: new THREE.Vector3(),
    tempVector2: new THREE.Vector3(),
    tempVector3: new THREE.Vector3(),

    forwardForce: new THREE.Vector3(),
    strafeForce: new THREE.Vector3(),
    rightForce: new THREE.Vector3(),
    upForce: new THREE.Vector3(),
    cachedEuler1: new THREE.Euler(),
    cachedEuler2: new THREE.Euler()
  });

  const cameraState = useRef({
    currentSpeedMultiplier: 1.0,
    targetSpeedMultiplier: 1.0
  });

  const updateMovement = (input, delta) => {
    if (!window.movementCallCount) window.movementCallCount = 0;
    window.movementCallCount++;
    const callId = window.movementCallCount;
    
    if (gameState.current.portalAbility.cooldownEndTime > 0) {
      const now = Date.now();
      if (now >= gameState.current.portalAbility.cooldownEndTime) {
        gameState.current.portalAbility.isReady = true;
        gameState.current.portalAbility.cooldownEndTime = 0;
      }
    }

    if (gameState.current.crystalWallAbility.cooldownEndTime > 0) {
      const now = Date.now();
      if (now >= gameState.current.crystalWallAbility.cooldownEndTime) {
        gameState.current.crystalWallAbility.isReady = true;
        gameState.current.crystalWallAbility.cooldownEndTime = 0;
      }
    }
    
    if (gameState.current.portalAbility.isDeploying) {
      const mouseWheel = inputManager.getMouseWheel();
      if (mouseWheel && mouseWheel.delta !== 0) {
        const currentDistance = gameState.current.portalAbility.distance || 30;

        const adjustment = mouseWheel.delta * 50;
        const newDistance = currentDistance + adjustment;
        
        gameState.current.portalAbility.distance = THREE.MathUtils.clamp(
          newDistance,
          100,
          1500
        );
        
        localStorage.setItem('portalDistance', gameState.current.portalAbility.distance.toString());

        inputManager.mouseWheel.delta = 0;
      }
    }

    if (gameState.current.crystalWallAbility.isDeploying) {
      const mouseWheel = inputManager.getMouseWheel();
      if (mouseWheel && mouseWheel.delta !== 0) {
        const currentDistance = gameState.current.crystalWallAbility.distance || GAME_CONFIG.crystalWall.deployDistance;
        const adjustment = mouseWheel.delta * 30;
        gameState.current.crystalWallAbility.distance = THREE.MathUtils.clamp(
          currentDistance + adjustment,
          GAME_CONFIG.crystalWall.minDistance,
          GAME_CONFIG.crystalWall.maxDistance
        );
        inputManager.mouseWheel.delta = 0;
      }
    }

    const performanceMode = window.PERFORMANCE_MODE || { targetFPS: 60 };
    const fpsScaling = performanceMode.targetFPS / TARGET_FPS;
    const adaptiveDelta = delta * fpsScaling;
    
    if (!gameState.current.initialized) return;
    
    if (!input) {
      const current = gameState.current;
      
      if (current.isBoosting) {
        current.boost = Math.max(0, current.boost - (GAME_CONFIG.boost.drainRate * adaptiveDelta));
        if (current.boost <= 0) {
          current.isBoosting = false;
        }
      } else {
        current.boost = Math.min(100, current.boost + (GAME_CONFIG.boost.fillRate * adaptiveDelta));
      }
      
      return;
    }
    
    const current = gameState.current;
    const vectors = cachedVectors.current;

    if (Math.abs(current.pitch) > Math.PI/2) {
      current.pitch = 0;
    }

    delta = Math.min(delta, 0.033);

    if (input.mouse && (Math.abs(input.mouse.x) > 0 || Math.abs(input.mouse.y) > 0)) {
      const mouseSensitivity = parseFloat(localStorage.getItem('mouseSensitivity')) || GAME_CONFIG.input.mouseSensitivity;
      const invertY = localStorage.getItem('invertY') === 'true';
      
      const mouseY = invertY ? -input.mouse.y : input.mouse.y;

      if (typeof window.FORCE_PITCH === 'undefined') {
        window.FORCE_PITCH = current.pitch || 0;
      }
      if (typeof window.FORCE_YAW === 'undefined') {
        window.FORCE_YAW = current.yaw || 0;
      }

      window.FORCE_PITCH += mouseY * mouseSensitivity;
      window.FORCE_YAW += input.mouse.x * mouseSensitivity;

      if (Math.abs(window.FORCE_YAW) > Math.PI * 2) {
        window.FORCE_YAW = window.FORCE_YAW % (Math.PI * 2);
      }

      window.BACKUP_PITCH = window.FORCE_PITCH;
      window.BACKUP_YAW = window.FORCE_YAW;
      sessionStorage.setItem('FORCE_PITCH', window.FORCE_PITCH.toString());
      sessionStorage.setItem('FORCE_YAW', window.FORCE_YAW.toString());
      
      const newPitch = window.FORCE_PITCH;

      current.pitch = window.FORCE_PITCH;

      setTimeout(() => {
        if (window.FORCE_PITCH !== current.pitch) {
          
          if (window.BACKUP_PITCH !== undefined && Math.abs(window.BACKUP_PITCH) > Math.abs(window.FORCE_PITCH)) {
            window.FORCE_PITCH = window.BACKUP_PITCH;
          } else if (sessionStorage.getItem('FORCE_PITCH')) {
            const stored = parseFloat(sessionStorage.getItem('FORCE_PITCH'));
            if (!isNaN(stored) && Math.abs(stored) > Math.abs(window.FORCE_PITCH)) {
              window.FORCE_PITCH = stored;
            }
          }

          current.pitch = window.FORCE_PITCH;
        }
      }, 0);

      current.yaw = window.FORCE_YAW;
      
    }

    let rotationVectors;
    const visualRollOnly = localStorage.getItem('visualRollOnly') === 'true';
    
    if (window.gameAssetsReady && window.gameAssetCaches?.rotationVectors?.size > 0) {

      const pitchDeg = Math.round(current.pitch * 180 / Math.PI);
      const yawDeg = Math.round(current.yaw * 180 / Math.PI) % 360;
      const key = `${pitchDeg},${yawDeg}`;
      rotationVectors = window.gameAssetCaches.rotationVectors.get(key);
      if (rotationVectors) {
        vectors.forward.copy(rotationVectors.forward);
        vectors.right.copy(rotationVectors.right);
      }
    }
    
    if (!rotationVectors) {

      const movementRoll = visualRollOnly ? 0 : current.roll;
      const shipRotation = vectors.cachedEuler1.set(current.pitch, current.yaw, movementRoll, 'YXZ');
      vectors.forward.set(0, 0, -1).applyEuler(shipRotation);

      const worldYawOnly = vectors.cachedEuler2.set(0, current.yaw, 0, 'YXZ');
      vectors.right.set(1, 0, 0).applyEuler(worldYawOnly);
      
    }

    const boostInput = input.boost || false;
    const wantsToBoosting = boostInput;
    const canBoost = current.boost > 0;

    if (wantsToBoosting && canBoost) {
      if (!current.isBoosting) {
        current.isBoosting = true;
        
        getAudioManager().startBoost();
      }
      current.boost = Math.max(0, current.boost - (GAME_CONFIG.boost.drainRate * adaptiveDelta));
      
      if (current.boost <= 0) {
        current.isBoosting = false;
        
        getAudioManager().stopBoost();
      }
    } else {
      if (current.isBoosting) {
        current.isBoosting = false;
        
        getAudioManager().stopBoost();
      }
    }
    
    if (!current.isBoosting) {
      current.boost = Math.min(100, current.boost + (GAME_CONFIG.boost.fillRate * adaptiveDelta));
    }

    const wantsToBraking = (input.keys?.Control || input.brake);
    current.isBraking = wantsToBraking;

    const camState = cameraState.current;
    const effectiveBoostState = current.isBoosting && current.boost > 0;
    camState.targetSpeedMultiplier = 1.0;
    
    const speedLerpRate = 1.0 - Math.pow(1.0 - 0.12, adaptiveDelta * TARGET_FPS);
    camState.currentSpeedMultiplier = THREE.MathUtils.lerp(
      camState.currentSpeedMultiplier, 
      camState.targetSpeedMultiplier, 
      speedLerpRate
    );
    
    const baseSpeed = effectiveBoostState ? GAME_CONFIG.physics.boostMaxSpeed : GAME_CONFIG.physics.normalMaxSpeed;
    let forwardSpeed = baseSpeed * GAME_CONFIG.physics.forwardMultiplier * camState.currentSpeedMultiplier;

    const isForwardPressed = input.keys?.w || input.keys?.W || input.keys?.ArrowUp;
    if (isForwardPressed) {
      vectors.forwardForce.copy(vectors.forward).multiplyScalar(forwardSpeed * adaptiveDelta);
      current.velocity.add(vectors.forwardForce);
    }
    if (input.keys?.s || input.keys?.S || input.keys?.ArrowDown) {
      vectors.forwardForce.copy(vectors.forward).multiplyScalar(-forwardSpeed * adaptiveDelta * GAME_CONFIG.physics.backwardMultiplier);
      current.velocity.add(vectors.forwardForce);
    }

    const leftPressed = input.keys?.a || input.keys?.A || input.keys?.ArrowLeft;
    const rightPressed = input.keys?.d || input.keys?.D || input.keys?.ArrowRight;
    
    const now = Date.now();
    if (current.dodge.cooldownLeft > 0) {
      current.dodge.cooldownLeft -= delta * 1000;
      if (current.dodge.cooldownLeft <= 0) {
        current.dodge.cooldownLeft = 0;
      }
    }
    if (current.dodge.cooldownRight > 0) {
      current.dodge.cooldownRight -= delta * 1000;
      if (current.dodge.cooldownRight <= 0) {
        current.dodge.cooldownRight = 0;
      }
    }

    if (leftPressed && !current.dodge.lastLeftPress && !current.dodge.isLeftDodging && current.dodge.cooldownLeft <= 0) {
      current.dodge.isLeftDodging = true;
      current.dodge.isLeftVisualActive = true;
      current.dodge.leftStartTime = now;
      current.dodge.cooldownLeft = current.dodge.cooldownDuration;

      try { getWebSocketInstance()?.send('dodgeStart', {}); } catch(e) {}

      current.targetDodgeVisualTilt = 0.26;

      const audioManager = getAudioManager();
      if (audioManager && audioManager.startBoost) {
        setTimeout(() => {
          audioManager.startBoost();
          setTimeout(() => audioManager.stopBoost(), 100);
        }, 150);
      }
    }
    
    current.dodge.lastLeftPress = leftPressed;
    
    if (rightPressed && !current.dodge.lastRightPress && !current.dodge.isRightDodging && current.dodge.cooldownRight <= 0) {
      current.dodge.isRightDodging = true;
      current.dodge.isRightVisualActive = true;
      current.dodge.rightStartTime = now;
      current.dodge.cooldownRight = current.dodge.cooldownDuration;

      try { getWebSocketInstance()?.send('dodgeStart', {}); } catch(e) {}

      current.targetDodgeVisualTilt = -0.26;
      
      const audioManager = getAudioManager();
      if (audioManager && audioManager.startBoost) {
        setTimeout(() => {
          audioManager.startBoost();
          setTimeout(() => audioManager.stopBoost(), 100);
        }, 150);
      }
    }

    current.dodge.lastRightPress = rightPressed;

    if (current.dodge.isLeftDodging) {
      const elapsed = now - current.dodge.leftStartTime;
      const progress = Math.min(elapsed / current.dodge.dodgeDuration, 1);

      const easedProgress = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      const dodgeForce = current.dodge.dodgeForce * easedProgress * (1 - progress) * 4;
      vectors.rightForce.copy(vectors.right).multiplyScalar(-dodgeForce * adaptiveDelta);
      current.velocity.add(vectors.rightForce);
      
      if (progress >= 1) {
        current.dodge.isLeftDodging = false;
        current.targetDodgeVisualTilt = 0;
        try { getWebSocketInstance()?.send('dodgeEnd', {}); } catch(e) {}
      }
    } else if (current.dodge.isRightDodging) {
      const elapsed = now - current.dodge.rightStartTime;
      const progress = Math.min(elapsed / current.dodge.dodgeDuration, 1);

      const easedProgress = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      const dodgeForce = current.dodge.dodgeForce * easedProgress * (1 - progress) * 4;
      vectors.rightForce.copy(vectors.right).multiplyScalar(dodgeForce * adaptiveDelta);
      current.velocity.add(vectors.rightForce);
      
      if (progress >= 1) {
        current.dodge.isRightDodging = false;
        current.targetDodgeVisualTilt = 0;
        try { getWebSocketInstance()?.send('dodgeEnd', {}); } catch(e) {}
      }
    } else {

      current.targetDodgeVisualTilt = 0;
    }

    if (current.dodge.isLeftVisualActive) {
      const elapsed = now - current.dodge.leftStartTime;
      const visualProgress = Math.min(elapsed / current.dodge.visualDuration, 1);
      
      if (visualProgress >= 1) {
        current.dodge.isLeftVisualActive = false;
      }
    }
    if (current.dodge.isRightVisualActive) {
      const elapsed = now - current.dodge.rightStartTime;
      const visualProgress = Math.min(elapsed / current.dodge.visualDuration, 1);
      
      if (visualProgress >= 1) {
        current.dodge.isRightVisualActive = false;
      }
    }

    const tiltSpeed = 0.3;
    current.dodgeVisualTilt = THREE.MathUtils.lerp(
      current.dodgeVisualTilt,
      current.targetDodgeVisualTilt,
      tiltSpeed
    );
    
    current.visualTilt = current.dodgeVisualTilt;

    if (Math.abs(current.roll) > 0.001) {
      const rollCenteringRate = 1.0 - Math.pow(1.0 - 0.18, adaptiveDelta * TARGET_FPS);
      current.roll = THREE.MathUtils.lerp(current.roll, 0, rollCenteringRate);
    } else {
      current.roll = 0;
    }

    const upPressed = input.keys?.q || input.keys?.Q;
    const downPressed = input.keys?.e || input.keys?.E;

    if (current.dodge.cooldownUp > 0) {
      current.dodge.cooldownUp -= delta * 1000;
      if (current.dodge.cooldownUp <= 0) current.dodge.cooldownUp = 0;
    }
    if (current.dodge.cooldownDown > 0) {
      current.dodge.cooldownDown -= delta * 1000;
      if (current.dodge.cooldownDown <= 0) current.dodge.cooldownDown = 0;
    }

    if (upPressed && !current.dodge.lastUpPress && !current.dodge.isUpDodging && current.dodge.cooldownUp <= 0) {
      current.dodge.isUpDodging = true;
      current.dodge.isUpVisualActive = true;
      current.dodge.upStartTime = now;
      current.dodge.cooldownUp = current.dodge.cooldownDuration;
      try { getWebSocketInstance()?.send('dodgeStart', {}); } catch(e) {}
      current.targetDodgePitchNudge = -0.18;
    }
    current.dodge.lastUpPress = upPressed;

    if (downPressed && !current.dodge.lastDownPress && !current.dodge.isDownDodging && current.dodge.cooldownDown <= 0) {
      current.dodge.isDownDodging = true;
      current.dodge.isDownVisualActive = true;
      current.dodge.downStartTime = now;
      current.dodge.cooldownDown = current.dodge.cooldownDuration;
      try { getWebSocketInstance()?.send('dodgeStart', {}); } catch(e) {}
      current.targetDodgePitchNudge = 0.18;
    }
    current.dodge.lastDownPress = downPressed;

    if (current.dodge.isUpDodging) {
      const elapsed = now - current.dodge.upStartTime;
      const progress = Math.min(elapsed / current.dodge.dodgeDuration, 1);
      const easedProgress = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      const dodgeForce = current.dodge.dodgeForce * easedProgress * (1 - progress) * 4;
      vectors.upForce.copy(vectors.up).multiplyScalar(dodgeForce * adaptiveDelta);
      current.velocity.add(vectors.upForce);
      if (progress >= 1) {
        current.dodge.isUpDodging = false;
        current.targetDodgePitchNudge = 0;
        try { getWebSocketInstance()?.send('dodgeEnd', {}); } catch(e) {}
      }
    }

    if (current.dodge.isDownDodging) {
      const elapsed = now - current.dodge.downStartTime;
      const progress = Math.min(elapsed / current.dodge.dodgeDuration, 1);
      const easedProgress = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      const dodgeForce = current.dodge.dodgeForce * easedProgress * (1 - progress) * 4;
      vectors.upForce.copy(vectors.up).multiplyScalar(-dodgeForce * adaptiveDelta);
      current.velocity.add(vectors.upForce);
      if (progress >= 1) {
        current.dodge.isDownDodging = false;
        current.targetDodgePitchNudge = 0;
        try { getWebSocketInstance()?.send('dodgeEnd', {}); } catch(e) {}
      }
    }

    if (current.dodge.isUpVisualActive) {
      const elapsed = now - current.dodge.upStartTime;
      if (elapsed / current.dodge.visualDuration >= 1) current.dodge.isUpVisualActive = false;
    }
    if (current.dodge.isDownVisualActive) {
      const elapsed = now - current.dodge.downStartTime;
      if (elapsed / current.dodge.visualDuration >= 1) current.dodge.isDownVisualActive = false;
    }

    if (!current.dodgePitchNudge) current.dodgePitchNudge = 0;
    if (!current.targetDodgePitchNudge) current.targetDodgePitchNudge = 0;
    current.dodgePitchNudge = THREE.MathUtils.lerp(current.dodgePitchNudge, current.targetDodgePitchNudge, 0.3);

    if (input.keys?.r || input.keys?.R) {
      current.pitch = 0;
      current.roll = 0;
      current.strafeOffset = 0;
    }

    if (window.portalTravelInfo && window.portalTravelInfo.active) {
      const elapsed = Date.now() - window.portalTravelInfo.startTime;
      const progress = Math.min(elapsed / window.portalTravelInfo.duration, 1);
      
      const easeProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      const start = window.portalTravelInfo.startPos;
      const end = window.portalTravelInfo.endPos;
      
      current.position.x = start.x + (end.x - start.x) * easeProgress;
      current.position.y = start.y + (end.y - start.y) * easeProgress;
      current.position.z = start.z + (end.z - start.z) * easeProgress;
      
      current.velocity.set(0, 0, 0);

      if (progress >= 1) {
        window.portalTravelInfo = null;
      }
    } else if (window.portalTeleportLock && window.portalTeleportLock.active) {

      const lock = window.portalTeleportLock;
      current.position.set(lock.position.x, lock.position.y, lock.position.z);
      current.velocity.set(0, 0, 0);

      const unlockAt = lock.unlockAt
        || ((lock.timestamp || Date.now()) + (lock.durationMs || 120));
      if (Date.now() >= unlockAt) {
        lock.active = false;
      }
    } else {
      current.position.x += current.velocity.x * adaptiveDelta;
      current.position.y += current.velocity.y * adaptiveDelta;
      current.position.z += current.velocity.z * adaptiveDelta;
    }
    
    if (!current.inCollisionResponse) {
      if (current.isBraking) {

        current.velocity.multiplyScalar(GAME_CONFIG.physics.brakeMultiplier);
        current.velocity.multiplyScalar(GAME_CONFIG.physics.brakePower);
      } else {

        current.velocity.multiplyScalar(GAME_CONFIG.physics.velocityDampening);
      }
      
      const velocityMagnitude = current.velocity.length();
      if (velocityMagnitude < 0.001) {
        current.velocity.set(0, 0, 0);
      }
      
      if (typeof window !== 'undefined') {
        if (!current.lastSpeedReported || Math.abs(velocityMagnitude - current.lastSpeedReported) > 1) {
          window.dispatchEvent(new CustomEvent('speed-update', {
            detail: { speed: velocityMagnitude }
          }));
          current.lastSpeedReported = velocityMagnitude;
        }
      }
    } else {
      current.inCollisionResponse = false;
    }

    const maxSpeed = effectiveBoostState ? GAME_CONFIG.physics.boostMaxSpeed : GAME_CONFIG.physics.maxSpeed;
    if (current.velocity.length() > maxSpeed) {
      current.velocity.setLength(maxSpeed);
    }

    if (current.position.x > 1000000 || isNaN(current.position.x)) {
      console.error('POSITION CORRUPTION DETECTED!');
      current.position.set(0, 0, 0);
      current.velocity.set(0, 0, 0);
    }
    
  };

  const initializePosition = (serverPosition) => {
    if (serverPosition && !gameState.current.spawnReceived) {

      if (!window.lastSpawnLog || performance.now() - window.lastSpawnLog > 3000) {
        window.lastSpawnLog = performance.now();
      }
      
      const distanceFromCurrent = gameState.current.position.distanceTo(serverPosition);
      if (distanceFromCurrent > 50) {
        console.log('SPAWN POSITION FIGHTING:', {
          currentPos: gameState.current.position.toArray(),
          serverPos: serverPosition.toArray(),
          distance: distanceFromCurrent.toFixed(3)
        });
      }
      
      gameState.current.position.copy(serverPosition);
      gameState.current.initialized = true;
      gameState.current.spawnReceived = true;
    }
  };

  const setPosition = (position) => {

    if (!gameState.current.spawnReceived && !gameState.current.initialized) {
      gameState.current.position.copy(position);
    } else if (gameState.current.spawnReceived) {
      const distance = gameState.current.position.distanceTo(position);
      if (distance > 5) {
        console.log('POSITION SET BLOCKED:', {
          currentPos: gameState.current.position.toArray(),
          attemptedPos: position,
          distance: distance.toFixed(3),
          source: 'setPosition call'
        });
      }
    }
  };

  const setVelocity = (velocity) => {
    gameState.current.velocity.copy(velocity);
  };

  if (typeof window !== 'undefined' && window.FORCE_PITCH !== undefined) {
    gameState.current.pitch = window.FORCE_PITCH;
    gameState.current.yaw = window.FORCE_YAW;
  }

  return {
    gameState: gameState.current,
    updateMovement,
    initializePosition,
    setPosition,
    setVelocity
  };
};
