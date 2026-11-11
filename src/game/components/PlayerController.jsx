import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '../utils/localGltf';
import * as THREE from 'three';

import ShipRenderer from './ShipRenderer.jsx';
import SimpleCrosshair from './SimpleCrosshair.jsx';
import OtherPlayersRenderer from './OtherPlayersRenderer.jsx';
import PortalCycler from './portals/PortalCycler.jsx';

const ProfessionalTrail = React.lazy(() => import('./ProfessionalTrail.jsx'));
const DamageVisualization = React.lazy(() => import('./DamageVisualization.jsx'));
const CameraDustField = React.lazy(() => import('./CameraDustField.jsx'));
const CameraDashStreaks = React.lazy(() => import('./CameraDashStreaks.jsx'));
const DodgeThrusterGlow = React.lazy(() => import('./DodgeThrusterGlow.jsx'));

import { usePlayerMovement } from '../hooks/usePlayerMovement.js';
import { useCameraSystem } from '../hooks/useCameraSystem.js';
import { useNetworkSync } from '../hooks/useNetworkSync.js';
import { useWeaponSystem } from '../hooks/useWeaponSystem.js';
import { useTrainingWeapons } from '../hooks/useTrainingWeapons.js';
import { useCollisionSystem } from '../hooks/useCollisionSystem.js';
import { useStateManager } from '../hooks/useStateManager.js';
import { usePlayerInitializer } from '../hooks/usePlayerInitializer.js';
import { usePortalHandler } from '../hooks/usePortalHandler.js';
import { usePortalPlacement } from '../hooks/usePortalPlacement.js';
import { useCrystalWallPlacement } from '../hooks/useCrystalWallPlacement.js';

import SimpleInputManager from '../systems/SimpleInputManager.js';
import inputManager from '../systems/InputManager.js';
import { pollGamepad } from '../systems/GamepadBridge.js';
import { getWebSocketInstance } from '../services/UnifiedWebSocket.js';
import { isTestModeEnabled } from '../debug/TestModeConfig.js';
import { getMasterRenderLoop } from '../systems/MasterRenderLoop.js';
import { useLimitedFrame } from '../systems/FrameLimiter.js';
import { GAME_CONFIG } from '../config/GameConfig.js';
import { getSpeedPerceptionFactor } from '../utils/speedPerception.js';
import inputCaptureRecorder from '../services/InputCaptureRecorder.js';




const CockpitModel = ({ playerPosition, playerRotation, gameState }) => {
  const { camera } = useThree();
  const cockpitGroupRef = useRef();
  

  const pilotMovement = useRef({
    currentOffset: new THREE.Vector3(0, 0, 0),
    targetOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    boostShakeCurrent: new THREE.Vector3(0, 0, 0),
    boostShakeTarget: new THREE.Vector3(0, 0, 0),
    lastBoostShakeUpdate: 0,
    lastYaw: 0,
    lastPitch: 0
  });

  const radarAnchorLocal = useRef((() => {
    try {
      const raw = localStorage.getItem('cockpitRadarAnchorLocal');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          Number.isFinite(parsed?.x) &&
          Number.isFinite(parsed?.y) &&
          Number.isFinite(parsed?.z)
        ) {
          return new THREE.Vector3(parsed.x, parsed.y, parsed.z);
        }
      }
    } catch {

    }

    return new THREE.Vector3(0.0, -0.26, -0.44);
  })());
  const radarAnchorWorld = useRef(new THREE.Vector3());
  const radarAnchorNdc = useRef(new THREE.Vector3());
  

  const cockpitTransform = { 
    position: { x: 0.00, y: 0.01, z: -0.2 }, 
    rotation: { x: -3.23, y: -3.1416, z: -3.15 }, 
    scale: { x: 1.00, y: 1.00, z: -1.00 }
  };


  const modelPath = '/povglb/astra_cockpit.glb';
  const gltf = window.preloadedCockpitModel || useGLTF(modelPath);
  const processedScene = useMemo(() => {
    if (!gltf?.scene) return null;
    const scene = gltf.scene.clone(true);
    const glassHints = ['glass', 'canopy', 'windshield', 'window', 'visor'];
    const scratchSoften = 0.25;
    const hazeReduce = 0.5;

    scene.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((mat) => {
        if (!mat) return;
        const name = (mat.name || '').toLowerCase();
        const isGlass =
          glassHints.some((hint) => name.includes(hint)) ||
          mat.transparent ||
          (typeof mat.opacity === 'number' && mat.opacity < 1) ||
          (typeof mat.transmission === 'number' && mat.transmission > 0);
        if (!isGlass) return;

        if (mat.normalMap && mat.normalScale) {
          mat.normalScale.multiplyScalar(scratchSoften);
        }
        if (typeof mat.roughness === 'number') {
          mat.roughness = Math.max(0, mat.roughness * hazeReduce);
        }
        if (typeof mat.metalness === 'number') {
          mat.metalness = Math.min(mat.metalness, 0.1);
        }
        mat.needsUpdate = true;
      });
    });
    return scene;
  }, [gltf]);
  

  useEffect(() => {
    if (cockpitGroupRef.current && camera) {
      camera.add(cockpitGroupRef.current);

      camera.layers.enable(2);
      

      cockpitGroupRef.current.traverse((child) => {
        if (child.isMesh) {
          child.layers.set(2);
        }
      });
      
      console.log('Cockpit model set to layer 2 (raycast excluded)');

      window.setCockpitRadarAnchorLocal = (x, y, z) => {
        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          !Number.isFinite(z)
        ) {
          return radarAnchorLocal.current.toArray();
        }
        radarAnchorLocal.current.set(x, y, z);
        try {
          localStorage.setItem(
            'cockpitRadarAnchorLocal',
            JSON.stringify({ x, y, z })
          );
        } catch {

        }
        return radarAnchorLocal.current.toArray();
      };
      window.getCockpitRadarAnchorLocal = () => {
        const value = radarAnchorLocal.current;
        return { x: value.x, y: value.y, z: value.z };
      };
      
      return () => {
        if (cockpitGroupRef.current) {
          camera.remove(cockpitGroupRef.current);
        }
        camera.layers.disable(2);
        delete window.__astraCockpitRadarAnchor;
        delete window.setCockpitRadarAnchorLocal;
        delete window.getCockpitRadarAnchorLocal;
      };
    }
  }, [camera]);
  

  useFrame((state, delta) => {
    if (!cockpitGroupRef.current || !gameState) return;
    
    const pilot = pilotMovement.current;
    
    const yawDelta = (gameState.yaw || 0) - pilot.lastYaw;
    const pitchDelta = (gameState.pitch || 0) - pilot.lastPitch;
    

    const swayStrength = 0.0125;
    const maxSway = 0.025;
    
    const dodgeState = gameState.dodge;
    const isDodgingLeft = dodgeState?.isLeftDodging;
    const isDodgingRight = dodgeState?.isRightDodging;
    const isDodgingUp = dodgeState?.isUpDodging;
    const isDodgingDown = dodgeState?.isDownDodging;


    const isBoosting = gameState.isBoosting || false;
    const hasBoost = (gameState.boost || 0) > 0;
    const isActuallyBoosting = isBoosting && hasBoost;


    if (isDodgingLeft || isDodgingRight) {
      const dodgeDirection = isDodgingLeft ? -1 : 1;
      const dodgeStrength = 0.08;


      pilot.targetOffset.x = dodgeDirection * dodgeStrength;

      pilot.targetOffset.y = -0.02;


      pilot.targetOffset.z = -0.03;

      pilot.rotationOffset.z = dodgeDirection * 0.15;
    } else if (isDodgingUp || isDodgingDown) {
      const vertDirection = isDodgingUp ? 1 : -1;
      const dodgeStrength = 0.08;


      pilot.targetOffset.y = vertDirection * dodgeStrength;


      pilot.targetOffset.x = 0;


      pilot.targetOffset.z = -0.03;


      pilot.rotationOffset.x = vertDirection * -0.12;
      pilot.rotationOffset.z *= 0.9;
      
    } else {

      pilot.targetOffset.x = THREE.MathUtils.clamp(
        -yawDelta * swayStrength * 50, 
        -maxSway, 
        maxSway
      );
      

      pilot.targetOffset.y = THREE.MathUtils.clamp(
        pitchDelta * swayStrength * 30,
        -maxSway * 0.7,
        maxSway * 0.7
      );
      

      pilot.targetOffset.z = isActuallyBoosting ? -0.02 : 0;
      

      pilot.rotationOffset.z *= 0.9;
      pilot.rotationOffset.x *= 0.9;
    }
    

    pilot.currentOffset.lerp(pilot.targetOffset, 0.08);
    

    const now = performance.now();
    if (isActuallyBoosting && (now - pilot.lastBoostShakeUpdate > 45)) {
      pilot.boostShakeTarget.set(
        (Math.random() - 0.5) * 0.008,
        (Math.random() - 0.5) * 0.008,
        (Math.random() - 0.5) * 0.004
      );
      pilot.lastBoostShakeUpdate = now;
    } else if (!isActuallyBoosting) {
      pilot.boostShakeTarget.set(0, 0, 0);
    }
    pilot.boostShakeCurrent.lerp(pilot.boostShakeTarget, isActuallyBoosting ? 0.22 : 0.16);
    const boostShake = pilot.boostShakeCurrent;
    

    const finalX = THREE.MathUtils.clamp(
      cockpitTransform.position.x + pilot.currentOffset.x + boostShake.x,
      -1.5, 1.5
    );
    const finalY = THREE.MathUtils.clamp(
      cockpitTransform.position.y + pilot.currentOffset.y + boostShake.y,
      -1.5, 1.5
    );
    const finalZ = THREE.MathUtils.clamp(
      cockpitTransform.position.z + pilot.currentOffset.z + boostShake.z,
      -2.0, 0.5
    );
    
    cockpitGroupRef.current.position.set(finalX, finalY, finalZ);
    
    cockpitGroupRef.current.rotation.set(
      cockpitTransform.rotation.x + pilot.rotationOffset.x,
      cockpitTransform.rotation.y + pilot.rotationOffset.y,
      cockpitTransform.rotation.z + pilot.rotationOffset.z
    );


    radarAnchorWorld.current.copy(radarAnchorLocal.current);
    cockpitGroupRef.current.localToWorld(radarAnchorWorld.current);
    radarAnchorNdc.current.copy(radarAnchorWorld.current).project(camera);

    if (
      Number.isFinite(radarAnchorNdc.current.x) &&
      Number.isFinite(radarAnchorNdc.current.y) &&
      radarAnchorNdc.current.z > -1 &&
      radarAnchorNdc.current.z < 1
    ) {
      window.__astraCockpitRadarAnchor = {
        x: (radarAnchorNdc.current.x * 0.5 + 0.5) * window.innerWidth,
        y: (-radarAnchorNdc.current.y * 0.5 + 0.5) * window.innerHeight,
      };
    }
    
    
    pilot.lastYaw = gameState.yaw || 0;
    pilot.lastPitch = gameState.pitch || 0;
    

    pilot.targetOffset.multiplyScalar(0.95);
  });
  
  if (!gltf?.scene) {
    console.log('Cockpit model not loaded yet:', modelPath);
    return null;
  }

  

  return (
    <group ref={cockpitGroupRef}>
      

      <primitive 
        object={processedScene || gltf.scene}
        position={[
          cockpitTransform.position.x,
          cockpitTransform.position.y,
          cockpitTransform.position.z
        ]}
        rotation={[
          cockpitTransform.rotation.x,
          cockpitTransform.rotation.y,
          cockpitTransform.rotation.z
        ]}
        scale={[
          cockpitTransform.scale.x,
          cockpitTransform.scale.y,
          cockpitTransform.scale.z
        ]}
      />
    </group>
  );
};

const PlayerController = ({ playerName, onHealthChange, onBoostChange, onShipStateChange, onScreenPositionUpdate, isTraining = false, onPositionChange, onRotationChange, showCrosshair = true, playerHealth = 100, isPreloading = false }) => {

  const [systemsLoaded, setSystemsLoaded] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSystemsLoaded(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);
  const shipRef = useRef();
  const lastWallKeyRef = useRef(false);
  const lastWallBehindKeyRef = useRef(false);
  const lastPortalToggleRef = useRef(false);
  const lastPortalActivateRef = useRef(false);
  const lastPortalRecallRef = useRef(false);
  const inputCaptureInitRef = useRef(false);
  const { camera } = useThree();

  const cameraState = useRef({
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
    baseFOV: 75,
    currentFOV: 75,
    targetFOV: 75,
    fovSmoothingFactor: 0.1,
    fovInitialized: false,
    speedFovEnabled: true,
    lastSettingsSync: 0,
    lastPosition: new THREE.Vector3(),
    calculatedVelocity: new THREE.Vector3(),
    smoothVelocity: new THREE.Vector3()
  });
  
  const cachedVectors = useRef({
    cameraOffset: new THREE.Vector3(),
    idealCameraPos: new THREE.Vector3(),
    tempVec1: new THREE.Vector3(),
    tempVec2: new THREE.Vector3(),
    tempVec3: new THREE.Vector3()
  });
  

  const updateIntegratedMomentumCamera = (gameState, delta, cockpitMode) => {
    if (!gameState?.position) return;
    
    const camState = cameraState.current;
    const vectors = cachedVectors.current;
    const playerPosition = gameState.position;
    

    const baseCameraDistance = parseFloat(localStorage.getItem('cameraDistance')) || 25;
    const cameraMode = localStorage.getItem('cameraMode') || 'simple';
    
    if (cameraMode !== 'momentum') {

      vectors.cameraOffset.set(0, 4.0, baseCameraDistance);
      vectors.idealCameraPos.copy(playerPosition).add(vectors.cameraOffset);
      camera.position.lerp(vectors.idealCameraPos, 0.15);
      camera.lookAt(playerPosition.x, playerPosition.y + 1.5, playerPosition.z);
      return;
    }
    

    
    if (!camState.initialized) {

      if (FORCE_COCKPIT_MODE || cockpitMode) {
        camera.position.copy(playerPosition);
        camState.position.copy(playerPosition);
      } else {
        camState.position.copy(camera.position);
      }
      camState.lookAtTarget.copy(playerPosition);
      camState.lastPosition.copy(playerPosition);
      camState.initialized = true;
    }
    
    if (camState.lastPosition.distanceTo(playerPosition) > 0.01) {
      camState.calculatedVelocity.copy(playerPosition).sub(camState.lastPosition);
      camState.calculatedVelocity.divideScalar(delta || 0.016);

      camState.smoothVelocity.lerp(camState.calculatedVelocity, 0.3);
      camState.lastPosition.copy(playerPosition);
    }
    

    const isBoosting = gameState.isBoosting || false;
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
    vectors.idealCameraPos.copy(playerPosition).add(vectors.cameraOffset);
    

    camera.position.lerp(vectors.idealCameraPos, 0.15);
    

    vectors.tempVec1.copy(playerPosition);
    vectors.tempVec1.y += 1.5;
    camera.lookAt(vectors.tempVec1);
  };

  const updateBoundedSpeedFov = (gameState, delta, isCockpitView) => {
    if (!camera || !gameState?.velocity) return;

    const camState = cameraState.current;
    if (!camState.fovInitialized) {
      camState.baseFOV = camera.fov || 75;
      camState.currentFOV = camera.fov || 75;
      camState.targetFOV = camera.fov || 75;
      camState.fovInitialized = true;
    }
    const now = performance.now();
    if (now - camState.lastSettingsSync > 500) {
      camState.speedFovEnabled = localStorage.getItem('astra_speed_fov_enabled') !== 'false';
      camState.lastSettingsSync = now;
    }

    const speed = typeof gameState.velocity.length === 'function'
      ? gameState.velocity.length()
      : Math.sqrt(
          (gameState.velocity.x || 0) * (gameState.velocity.x || 0) +
          (gameState.velocity.y || 0) * (gameState.velocity.y || 0) +
          (gameState.velocity.z || 0) * (gameState.velocity.z || 0)
        );
    const isBoosting = !!gameState.isBoosting && (gameState.boost || 0) > 0;
    const speedFactor = getSpeedPerceptionFactor(speed, isBoosting, { threshold: 10.5 });

    const fovCap = isCockpitView ? 6 : 15;
    const targetFov = camState.speedFovEnabled
      ? camState.baseFOV + (speedFactor * fovCap)
      : camState.baseFOV;

    camState.targetFOV = THREE.MathUtils.clamp(targetFov, camState.baseFOV, camState.baseFOV + 15);
    camState.currentFOV += (camState.targetFOV - camState.currentFOV) * camState.fovSmoothingFactor;

    if (Math.abs(camera.fov - camState.currentFOV) > 0.1) {
      camera.fov = camState.currentFOV;
      camera.updateProjectionMatrix();
    }
  };
  

  const FORCE_COCKPIT_MODE = true;
  

  const roomForceCockpit = localStorage.getItem('roomForceCockpitMode') === 'true';
  const forceAllPlayers = localStorage.getItem('forceAllPlayersCockpit') === 'true';
  const globalCockpitMode = localStorage.getItem('globalCockpitMode') === 'true';
  const userCockpitMode = localStorage.getItem('tempCockpitMode') === 'true';
  

  const cockpitMode = FORCE_COCKPIT_MODE || roomForceCockpit || forceAllPlayers || globalCockpitMode || userCockpitMode;
  
  useEffect(() => {

    const reason = FORCE_COCKPIT_MODE ? 'FORCED FOR EVERYONE' :
                   roomForceCockpit ? 'ROOM ENFORCED' :
                   forceAllPlayers ? 'FORCE ALL PLAYERS' :
                   globalCockpitMode ? 'GLOBAL MODE' :
                   userCockpitMode ? 'PERSONAL CHOICE' : 'DISABLED';
                   
    console.log(`${playerName} cockpit mode: ${cockpitMode ? 'ENABLED' : 'DISABLED'} (${reason})`);
  }, [cockpitMode]);


  const movement = usePlayerMovement();
  
  useEffect(() => {
    if (isTraining && movement.gameState) {
      movement.gameState.initialized = true;
      movement.gameState.spawnReceived = true;
      movement.gameState.position.set(0, 10, 0);
      movement.gameState.health = 100;
      movement.gameState.boost = 100;
      console.log('Training mode initialized with local player state');
    }
  }, [isTraining, movement.gameState]);
  
  

  const network = useNetworkSync(
    movement.gameState?.position, 
    movement.gameState, 
    movement.gameState?.isBoosting,
    { disabled: isTraining || !systemsLoaded }
  );
  
  const weapons = useWeaponSystem(
    movement.gameState?.position, 
    movement.gameState, 
    movement.gameState?.velocity, 
    playerName,
    { disabled: isTraining || !systemsLoaded }
  );
    

  

  const collision = useCollisionSystem(
    movement.gameState?.position, 
    movement.gameState?.velocity,
    { disabled: !systemsLoaded }
  );
  const state = useStateManager(
    movement.gameState?.position,
    movement.gameState,
    movement.gameState?.health,
    movement.gameState?.boost,
    movement.gameState?.isBoosting,
    { disabled: !systemsLoaded }
  );
  const initializer = usePlayerInitializer(
    playerName,
    movement.gameState,
    { isTraining }
  );
  const portalPlacement = usePortalPlacement(movement.gameState);
  const wallPlacement = useCrystalWallPlacement(movement.gameState);
  usePortalHandler(movement.gameState?.position, movement.gameState?.velocity);
  

  useEffect(() => {
    const masterLoop = getMasterRenderLoop();
    masterLoop.start();
    
    return () => {
      masterLoop.stop();
    };
  }, []);
  

  useEffect(() => {
    const inputManager = SimpleInputManager.getInstance();
    inputManager.init();
    
    const handleCanvasClick = () => {
      if (!isPreloading && !inputManager.isMouseLocked) {
        console.log('Requesting pointer lock...');
        inputManager.requestPointerLock();
      }
    };
    

    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('click', handleCanvasClick);
      console.log('Added click handler for pointer lock');
    }
    
    return () => {
      if (canvas) {
        canvas.removeEventListener('click', handleCanvasClick);
      }
    };
  }, []);

  useEffect(() => {
    if (inputCaptureInitRef.current) return;
    inputCaptureInitRef.current = true;

    if (typeof window !== 'undefined' && window.localStorage?.getItem('astra_input_capture_autostart') === '1') {
      inputCaptureRecorder.start({
        source: 'PlayerController',
        mode: isTraining ? 'training' : 'game',
        playerName: playerName || 'unknown',
      });
    }
  }, [isTraining, playerName]);



  const limitedFrame = useLimitedFrame((frameState, delta) => {

    try {
      window.debugPerf?.startTimer('player');
    } catch (error) {

    }
    
    if (!shipRef.current || !movement.gameState?.initialized) {
      try {
        window.debugPerf?.endTimer('player');
      } catch (error) {

      }
      return;
    }
    

    if (!movement.gameState.spawnReceived) {
      const distanceFromOrigin = Math.sqrt(
        movement.gameState.position.x * movement.gameState.position.x + 
        movement.gameState.position.z * movement.gameState.position.z
      );
      if (distanceFromOrigin < 100) {
        try {
          window.debugPerf?.endTimer('player');
        } catch (error) {

        }
        return;
      }
    }
    

    let input = null;
    const oldInputManager = SimpleInputManager.getInstance();
    
    const newInput = inputManager.update();
    
    

    const reliableInput = oldInputManager.getInputState();
    const enhancedKeys = inputManager.getKeys();
    

    const mergedKeys = { ...reliableInput.keys };
    
    
    
    if (oldInputManager.isMouseLocked || newInput.usingController) {
      
      input = {

        keys: mergedKeys,
        mouse: reliableInput.mouse,
        mouseButtons: inputManager.getMouseButtons(),
        

        boost: reliableInput.keys?.Space || reliableInput.keys?.Shift || reliableInput.keys?.[' '] || false,
        brake: newInput.brake,
        

        isAiming: newInput.isAiming,
        isFiring: newInput.isFiring,
        aimStrength: newInput.aimStrength,
        fireStrength: newInput.fireStrength,
        

        movement: newInput.movement,
        analogMovement: newInput.analogMovement,
        analogLook: newInput.analogLook,
        usingController: newInput.usingController,
        

        mouseWheel: inputManager.getMouseWheel(),


        portal: newInput.portal || false,
        portalToggleMode: newInput.portalToggleMode || false,
        portalActivate: newInput.portalActivate || false,
        portalRecall: newInput.portalRecall || false,


        crystalWall: newInput.crystalWall || false,
        crystalWallBehind: newInput.crystalWallBehind || false,
      };
    } else {

      input = {
        keys: mergedKeys,
        mouse: {
          x: reliableInput.mouse.x * 0.3,
          y: reliableInput.mouse.y * 0.3,
          deltaX: reliableInput.mouse.x * 0.3,
          deltaY: reliableInput.mouse.y * 0.3
        },
        mouseButtons: inputManager.getMouseButtons(),
        

        boost: reliableInput.keys?.Space || reliableInput.keys?.Shift || reliableInput.keys?.[' '] || false,
        brake: newInput.brake,
        

        isAiming: newInput.isAiming,
        isFiring: newInput.isFiring,
        aimStrength: newInput.aimStrength,
        fireStrength: newInput.fireStrength,
        

        movement: newInput.movement,
        analogMovement: newInput.analogMovement,
        analogLook: newInput.analogLook,
        usingController: newInput.usingController,


        portal: newInput.portal || false,
        portalToggleMode: newInput.portalToggleMode || false,
        portalActivate: newInput.portalActivate || false,
        portalRecall: newInput.portalRecall || false,


        crystalWall: newInput.crystalWall || false,
        crystalWallBehind: newInput.crystalWallBehind || false,
      };
    }


    const mouseSensitivity = parseFloat(localStorage.getItem('mouseSensitivity')) || GAME_CONFIG.input.mouseSensitivity;
    const pad = pollGamepad(delta, mouseSensitivity);
    if (pad) {
      for (const [key, pressed] of Object.entries(pad.keys)) {
        if (pressed) mergedKeys[key] = true;
      }
      input.mouse = { ...input.mouse, x: input.mouse.x + pad.look.x, y: input.mouse.y + pad.look.y };
      input.boost = input.boost || pad.boost;
      input.isFiring = input.isFiring || pad.firing;
      input.portal = input.portal || pad.portal;
      input.crystalWall = input.crystalWall || pad.crystalWall;
      if (pad.fireNow) oldInputManager.fire();
    }


    if (input) {
      movement.updateMovement(input, delta);

      inputCaptureRecorder.observe({
        boost: !!input.boost,
        brake: !!input.brake,
        isFiring: !!input.isFiring,
        isAiming: !!input.isAiming,
        portal: !!input.portal,
        portalToggleMode: !!input.portalToggleMode,
        portalActivate: !!input.portalActivate,
        portalRecall: !!input.portalRecall,
        crystalWall: !!input.crystalWall,
        crystalWallBehind: !!input.crystalWallBehind,
        leftMouse: !!input.mouseButtons?.left,
        rightMouse: !!input.mouseButtons?.right,
        usingController: !!input.usingController,
        w: !!input.keys?.w,
        a: !!input.keys?.a,
        s: !!input.keys?.s,
        d: !!input.keys?.d,
        q: !!input.keys?.q,
        e: !!input.keys?.e,
        space: !!(input.keys?.Space || input.keys?.[' ']),
        shift: !!(input.keys?.Shift || input.keys?.shift),
        blinkActive: !!(
          movement.gameState?.dodge?.isLeftDodging ||
          movement.gameState?.dodge?.isRightDodging ||
          movement.gameState?.dodge?.isUpDodging ||
          movement.gameState?.dodge?.isDownDodging
        ),
      });
      

      if (input.portal) {
        if (!portalPlacement.portalAbility?.isDeploying) {

          if (wallPlacement.crystalWallAbility?.isDeploying) {
            wallPlacement.cancelWallDeployment();
          }
          const result = portalPlacement.startPortalDeployment();
          inputCaptureRecorder.mark('portal_deploy_attempt', { result: !!result });
          console.log('Portal deploy attempt:', result, 'ability:', !!portalPlacement.portalAbility);
        }
      }
      if ((input.mouseButtons?.left || input.isFiring) && portalPlacement.portalAbility?.isDeploying) {
        inputCaptureRecorder.mark('portal_place');
        portalPlacement.placePortal();
      }


      const toggleDown = input.portalToggleMode && !lastPortalToggleRef.current;
      if (toggleDown) {
        inputCaptureRecorder.mark('portal_toggle_mode');
        console.log('V pressed — toggling portal mode');
        portalPlacement.togglePortalMode();
      }
      lastPortalToggleRef.current = !!input.portalToggleMode;


      const activateDown = input.portalActivate && !lastPortalActivateRef.current;
      if (activateDown && portalPlacement.portalAbility?.beaconPosition) {
        inputCaptureRecorder.mark('portal_activate');
        portalPlacement.activateBeacon();
      }
      lastPortalActivateRef.current = !!input.portalActivate;


      const recallDown = input.portalRecall && !lastPortalRecallRef.current;
      if (recallDown && portalPlacement.portalAbility?.beaconPosition) {
        inputCaptureRecorder.mark('portal_recall');
        portalPlacement.recallBeacon();
      }
      lastPortalRecallRef.current = !!input.portalRecall;


      const wallKeyDown = input.crystalWallBehind && !lastWallBehindKeyRef.current;
      if (wallKeyDown) {
        inputCaptureRecorder.mark('wall_place_behind');
        wallPlacement.placeBehind();
      }
      lastWallBehindKeyRef.current = !!input.crystalWallBehind;

      const wallToggleDown = input.crystalWall && !lastWallKeyRef.current;
      if (wallToggleDown) {

        if (portalPlacement.portalAbility?.isDeploying) {
          portalPlacement.cancelPortalDeployment();
        }
        inputCaptureRecorder.mark('wall_deploy_toggle');
        wallPlacement.startWallDeployment();
      }
      lastWallKeyRef.current = !!input.crystalWall;


      if ((input.mouseButtons?.left || input.isFiring) && wallPlacement.crystalWallAbility?.isDeploying) {
        inputCaptureRecorder.mark('wall_place');
        wallPlacement.placeWall();
      }

      if ((input.mouseButtons?.right || input.isAiming) && wallPlacement.crystalWallAbility?.isDeploying) {
        inputCaptureRecorder.mark('wall_cancel');
        wallPlacement.cancelWallDeployment();
      }
    }
    
    

    if (!window.lastCollisionUpdate || performance.now() - window.lastCollisionUpdate > 32) { 
      collision.updateCollisions();
      window.lastCollisionUpdate = performance.now();
    }
    

    if (cockpitMode) {

      if (movement.gameState?.position) {
        camera.position.copy(movement.gameState.position);
      }
      

      if (window.FORCE_PITCH !== undefined) {
        movement.gameState.pitch = window.FORCE_PITCH;
        movement.gameState.yaw = window.FORCE_YAW;
      }


      camera.rotation.set(
        movement.gameState?.pitch || 0,
        movement.gameState?.yaw || 0,
        movement.gameState?.roll || 0,
        'YXZ'
      );
    } else {

      updateIntegratedMomentumCamera(movement.gameState, delta, cockpitMode);
    }
    

    updateBoundedSpeedFov(movement.gameState, delta, cockpitMode);
    

    if (!isTraining && network) {
      if (input) {
        network.updateNetworkSync(input);
      }
      network.updateLocalPlayer();
    }
    

    if (!isTraining) {
      getWebSocketInstance().updateBullets(delta);
    }
    

    if (isTraining && movement.gameState) {
      movement.gameState.weaponHeat = 0;
      movement.gameState.isOverheated = false;
    }
    

    
    
    shipRef.current.position.copy(movement.gameState.position);
    

    window.localShipPosition = movement.gameState.position;

    

    window.localShipRef = shipRef.current;
    
    

    if (shipRef.current.rotation.order !== 'YXZ') {
      shipRef.current.rotation.order = 'YXZ';
    }
    

    if (window.FORCE_PITCH !== undefined) {
      movement.gameState.pitch = window.FORCE_PITCH;
      movement.gameState.yaw = window.FORCE_YAW;
    }


    shipRef.current.rotation.set(
      movement.gameState.pitch,
      movement.gameState.yaw,
      movement.gameState.roll
    );
    
    state.updateShipState(onHealthChange, onBoostChange, onShipStateChange, onScreenPositionUpdate);
    state.updateDebugStats();
    

    if (isTraining && movement.gameState) {
      if (onPositionChange) {
        onPositionChange({
          x: movement.gameState.position.x,
          y: movement.gameState.position.y,
          z: movement.gameState.position.z
        });
      }
      if (onRotationChange) {
        onRotationChange({
          pitch: movement.gameState.pitch,
          yaw: movement.gameState.yaw,
          roll: movement.gameState.roll
        });
      }
    }
    

    try {
      window.debugPerf?.endTimer('player');
    } catch (error) {

    }
  });
  
  useFrame(limitedFrame);

  return (
    <>

      <group visible={!cockpitMode && !isTraining}>
        <ShipRenderer
          ref={shipRef}
          position={movement.gameState?.position || new THREE.Vector3()}
          rotation={movement.gameState || {}}
          visualTilt={movement.gameState?.visualTilt || 0}
          isBoosting={movement.gameState?.isBoosting || false}
        />
      </group>
      

      {!cockpitMode && (
        <React.Suspense fallback={null}>
          <ProfessionalTrail 
            position={movement.gameState?.position}
            velocity={movement.gameState?.velocity}
            isLocal={true}
          />
        </React.Suspense>
      )}
      

      {cockpitMode && (
        <CockpitModel 
          playerPosition={movement.gameState?.position}
          playerRotation={movement.gameState}
          gameState={movement.gameState}
        />
      )}
      

      {(!isTraining && showCrosshair && isTestModeEnabled('crosshair')) && (
        <SimpleCrosshair 
          shipPosition={movement.gameState?.position || { x: 0, y: 0, z: 0 }}
          shipRotation={{
            x: movement.gameState?.pitch || 0,
            y: movement.gameState?.yaw || 0, 
            z: movement.gameState?.roll || 0
          }}
        />
      )}
      

      
      
      <OtherPlayersRenderer />
      

      <PortalCycler
        position={portalPlacement.portalAbility?.previewPosition}
        isDeploying={!!portalPlacement.portalAbility?.isDeploying}
        beaconPosition={portalPlacement.portalAbility?.beaconPosition}
        portalMode={portalPlacement.portalAbility?.mode}
      />
      
      
      

      <React.Suspense fallback={null}>
        <CameraDustField
          playerVelocity={movement.gameState?.velocity}
          isBoosting={movement.gameState?.isBoosting}
          enabled={cockpitMode && isTestModeEnabled('particles')}
          maxParticles={460}
        />
      </React.Suspense>


      <React.Suspense fallback={null}>
        <CameraDashStreaks
          playerVelocity={movement.gameState?.velocity}
          isBoosting={movement.gameState?.isBoosting}
          enabled={cockpitMode && isTestModeEnabled('particles')}
          maxStreaks={220}
        />
      </React.Suspense>
      

      <React.Suspense fallback={null}>
        <DodgeThrusterGlow />
      </React.Suspense>
    </>
  );
};

export default PlayerController;
