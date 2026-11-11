import React, { useCallback } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { getWebSocketInstance } from '../services/UnifiedWebSocket';

const BEACON_DURATION = 20000;
const RECALL_COOLDOWN = 5000;

export const usePortalPlacement = (gameState) => {
  const { camera } = useThree();

  if (gameState?.portalAbility && gameState.portalAbility.mode === undefined) {
    gameState.portalAbility.mode = 'instant';
    gameState.portalAbility.beaconPosition = null;
    gameState.portalAbility.beaconPlacedAt = null;
    gameState.portalAbility.beaconDuration = BEACON_DURATION;
    gameState.portalAbility.recallCooldownEndTime = 0;
    gameState.portalAbility.recallCooldownDuration = RECALL_COOLDOWN;
  }

  const togglePortalMode = useCallback(() => {
    if (!gameState?.portalAbility) return;
    gameState.portalAbility.mode = gameState.portalAbility.mode === 'instant' ? 'beacon' : 'instant';
    console.log('Portal mode:', gameState.portalAbility.mode);
  }, [gameState]);

  const startPortalDeployment = useCallback(() => {
    if (!gameState?.portalAbility) {
      return false;
    }

    const now = Date.now();

    if (gameState.portalAbility.cooldownEndTime > now) {
      return false;
    }

    if (gameState.portalAbility.mode === 'beacon' && gameState.portalAbility.recallCooldownEndTime > now) {
      return false;
    }

    gameState.portalAbility.isDeploying = true;
    gameState.portalAbility.isReady = false;

    window.isInPortalMode = true;

    return true;
  }, [gameState]);

  const cancelPortalDeployment = useCallback(() => {
    if (!gameState?.portalAbility) return;

    gameState.portalAbility.isDeploying = false;
    gameState.portalAbility.previewPosition = null;

    window.isInPortalMode = false;
  }, [gameState]);

  const _executeTeleport = useCallback((destination) => {
    const ws = getWebSocketInstance();
    const playerId = ws?.gameStateManager?.playerId || 'local';

    if (playerId !== 'local' && typeof window !== 'undefined') {
      window.gamePlayerId = playerId;
    }

    const currentPos = window.gameMovementState?.position?.toArray() || [0, 0, 0];

    window.dispatchEvent(new CustomEvent('portal-travel-start', {
      detail: {
        playerId,
        from: { x: currentPos[0], y: currentPos[1], z: currentPos[2] },
        to: destination
      }
    }));

    if (ws?.isConnected) {
      ws.send('portal_travel', { isEntering: true, destination });
    }

    window.playerInHyperspace = true;

    const PORTAL_TRAVEL_TIME = 2000;

    window.portalTravelInfo = {
      active: true,
      startPos: { x: currentPos[0], y: currentPos[1], z: currentPos[2] },
      endPos: destination,
      startTime: Date.now(),
      duration: PORTAL_TRAVEL_TIME
    };

    setTimeout(() => {
      window.portalTravelInfo = null;
      window.playerInHyperspace = false;

      const ws = getWebSocketInstance();
      if (ws?.isConnected) {
        ws.send('portal_travel', { isEntering: false });
      }

      window.dispatchEvent(new CustomEvent('portal-teleport', {
        detail: { playerId, destination, from: 'player', to: 'portal' }
      }));

      window.dispatchEvent(new CustomEvent('portal-travel-end', {
        detail: { playerId, portal: 'player_portal' }
      }));

      const finalPos = window.gameMovementState?.position;
      const actualFinalDistance = finalPos ? Math.sqrt(
        Math.pow(destination.x - finalPos.x, 2) +
        Math.pow(destination.y - finalPos.y, 2) +
        Math.pow(destination.z - finalPos.z, 2)
      ) : 0;

      if (actualFinalDistance > 5) {
        console.log('Portal teleport issue:', {
          finalPosition: finalPos?.toArray().map(n => n.toFixed(1)),
          targetPosition: [destination.x, destination.y, destination.z].map(n => n.toFixed(1)),
          remainingDistance: actualFinalDistance.toFixed(1)
        });
      }
    }, PORTAL_TRAVEL_TIME);
  }, []);

  const placePortal = useCallback(() => {
    if (!gameState?.portalAbility?.isDeploying || !gameState.portalAbility.previewPosition) {
      return false;
    }

    const position = gameState.portalAbility.previewPosition.clone();
    const destination = { x: position.x, y: position.y + 2, z: position.z };

    gameState.portalAbility.isDeploying = false;
    window.isInPortalMode = false;

    if (gameState.portalAbility.mode === 'beacon') {

      gameState.portalAbility.beaconPosition = new THREE.Vector3(destination.x, destination.y, destination.z);
      gameState.portalAbility.beaconPlacedAt = Date.now();

      const ws = getWebSocketInstance();
      if (ws?.isConnected) {
        ws.send('portal_beacon_place', { position: destination });
      }

      if (window._beaconExpiryTimer) clearTimeout(window._beaconExpiryTimer);
      window._beaconExpiryTimer = setTimeout(() => {
        _clearBeacon('expire');
      }, BEACON_DURATION);

    } else {

      gameState.portalAbility.cooldownEndTime = Date.now() + gameState.portalAbility.cooldownDuration;
      _executeTeleport(destination);
    }

    gameState.portalAbility.previewPosition = null;

    return true;
  }, [gameState, _executeTeleport]);

  const _clearBeacon = useCallback((reason) => {
    if (!gameState?.portalAbility) return;

    gameState.portalAbility.beaconPosition = null;
    gameState.portalAbility.beaconPlacedAt = null;

    if (window._beaconExpiryTimer) {
      clearTimeout(window._beaconExpiryTimer);
      window._beaconExpiryTimer = null;
    }

    const ws = getWebSocketInstance();
    if (ws?.isConnected) {
      ws.send('portal_beacon_' + reason, {});
    }
  }, [gameState]);

  const activateBeacon = useCallback(() => {
    if (!gameState?.portalAbility?.beaconPosition) return false;

    const destination = {
      x: gameState.portalAbility.beaconPosition.x,
      y: gameState.portalAbility.beaconPosition.y,
      z: gameState.portalAbility.beaconPosition.z
    };

    _clearBeacon('used');

    gameState.portalAbility.cooldownEndTime = Date.now() + gameState.portalAbility.cooldownDuration;

    _executeTeleport(destination);

    return true;
  }, [gameState, _executeTeleport, _clearBeacon]);

  const recallBeacon = useCallback(() => {
    if (!gameState?.portalAbility?.beaconPosition) return false;

    _clearBeacon('recall');

    gameState.portalAbility.recallCooldownEndTime = Date.now() + RECALL_COOLDOWN;

    return true;
  }, [gameState, _clearBeacon]);

  useFrame(() => {
    if (gameState?.portalAbility?.beaconPlacedAt) {
      const elapsed = Date.now() - gameState.portalAbility.beaconPlacedAt;
      if (elapsed >= BEACON_DURATION && gameState.portalAbility.beaconPosition) {
        _clearBeacon('expire');
      }
    }

    if (!gameState?.portalAbility?.isDeploying) return;

    const distance = Math.max(15, gameState.portalAbility.distance || 15);

    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);

    const playerPos = window.gameMovementState?.position || window.localShipPosition || camera.position;
    const position = playerPos.clone().add(direction.multiplyScalar(distance));

    const ARENA_BOUNDARY = 1000;
    position.x = THREE.MathUtils.clamp(position.x, -ARENA_BOUNDARY, ARENA_BOUNDARY);
    position.y = THREE.MathUtils.clamp(position.y, 10, 200);
    position.z = THREE.MathUtils.clamp(position.z, -ARENA_BOUNDARY, ARENA_BOUNDARY);

    gameState.portalAbility.previewPosition = position;
  });

  return {
    startPortalDeployment,
    cancelPortalDeployment,
    placePortal,
    togglePortalMode,
    activateBeacon,
    recallBeacon,
    portalAbility: gameState?.portalAbility || null
  };
};
