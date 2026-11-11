import { useCallback } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { getWebSocketInstance } from '../services/UnifiedWebSocket';
import { GAME_CONFIG } from '../config/GameConfig';

export const useCrystalWallPlacement = (gameState) => {
  const { camera } = useThree();

  const startWallDeployment = useCallback(() => {
    if (!gameState?.crystalWallAbility) return false;

    const now = Date.now();
    if (gameState.crystalWallAbility.cooldownEndTime > now) return false;

    if (gameState.crystalWallAbility.isDeploying) {
      gameState.crystalWallAbility.isDeploying = false;
      gameState.crystalWallAbility.previewPosition = null;
      gameState.crystalWallAbility.previewRotation = null;
      window.isInWallMode = false;
      return false;
    }

    gameState.crystalWallAbility.isDeploying = true;
    window.isInWallMode = true;
    return true;
  }, [gameState]);

  const cancelWallDeployment = useCallback(() => {
    if (!gameState?.crystalWallAbility) return;
    gameState.crystalWallAbility.isDeploying = false;
    gameState.crystalWallAbility.previewPosition = null;
    gameState.crystalWallAbility.previewRotation = null;
    window.isInWallMode = false;
  }, [gameState]);

  const placeWall = useCallback(() => {
    if (!gameState?.crystalWallAbility?.isDeploying || !gameState.crystalWallAbility.previewPosition) {
      return false;
    }

    const position = gameState.crystalWallAbility.previewPosition.clone();
    const rotation = gameState.crystalWallAbility.previewRotation
      ? { x: gameState.crystalWallAbility.previewRotation.x, y: gameState.crystalWallAbility.previewRotation.y, z: gameState.crystalWallAbility.previewRotation.z }
      : { x: 0, y: 0, z: 0 };

    gameState.crystalWallAbility.isDeploying = false;
    gameState.crystalWallAbility.cooldownEndTime = Date.now() + gameState.crystalWallAbility.cooldownDuration;
    gameState.crystalWallAbility.isReady = false;
    gameState.crystalWallAbility.previewPosition = null;
    gameState.crystalWallAbility.previewRotation = null;
    window.isInWallMode = false;

    const ws = getWebSocketInstance();
    if (ws?.isConnected) {
      ws.send('crystal_wall_deploy', {
        position: { x: position.x, y: position.y, z: position.z },
        rotation,
      });
    }

    return true;
  }, [gameState]);

  const placeBehind = useCallback(() => {
    if (!gameState?.crystalWallAbility) return false;

    const now = Date.now();
    if (gameState.crystalWallAbility.cooldownEndTime > now) return false;

    const playerPos = window.gameMovementState?.position || camera.position;
    const behind = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
    const behindDistance = GAME_CONFIG.crystalWall.behindDistance || 80;
    const wallPos = playerPos.clone().add(behind.multiplyScalar(behindDistance));

    const ARENA_BOUNDARY = 1000;
    wallPos.x = THREE.MathUtils.clamp(wallPos.x, -ARENA_BOUNDARY, ARENA_BOUNDARY);
    wallPos.y = THREE.MathUtils.clamp(wallPos.y, -200, 200);
    wallPos.z = THREE.MathUtils.clamp(wallPos.z, -ARENA_BOUNDARY, ARENA_BOUNDARY);

    const yaw = window.gameMovementState?.yaw || 0;

    gameState.crystalWallAbility.cooldownEndTime = Date.now() + gameState.crystalWallAbility.cooldownDuration;
    gameState.crystalWallAbility.isReady = false;
    gameState.crystalWallAbility.isDeploying = false;
    gameState.crystalWallAbility.previewPosition = null;
    gameState.crystalWallAbility.previewRotation = null;
    window.isInWallMode = false;

    const ws = getWebSocketInstance();
    if (ws?.isConnected) {
      ws.send('crystal_wall_deploy', {
        position: { x: wallPos.x, y: wallPos.y, z: wallPos.z },
        rotation: { x: 0, y: yaw, z: 0 },
      });
    }

    return true;
  }, [gameState, camera]);

  useFrame(() => {
    if (!gameState?.crystalWallAbility?.isDeploying) return;

    const distance = Math.max(GAME_CONFIG.crystalWall.minDistance, gameState.crystalWallAbility.distance || GAME_CONFIG.crystalWall.deployDistance);

    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);

    const playerPos = window.gameMovementState?.position || window.localShipPosition || camera.position;
    const position = playerPos.clone().add(direction.multiplyScalar(distance));

    const ARENA_BOUNDARY = 1000;
    position.x = THREE.MathUtils.clamp(position.x, -ARENA_BOUNDARY, ARENA_BOUNDARY);
    position.y = THREE.MathUtils.clamp(position.y, -200, 200);
    position.z = THREE.MathUtils.clamp(position.z, -ARENA_BOUNDARY, ARENA_BOUNDARY);

    const yaw = window.gameMovementState?.yaw || 0;

    gameState.crystalWallAbility.previewPosition = position;
    gameState.crystalWallAbility.previewRotation = new THREE.Euler(0, yaw, 0);
  });

  return {
    startWallDeployment,
    cancelWallDeployment,
    placeWall,
    placeBehind,
    crystalWallAbility: gameState?.crystalWallAbility || null,
  };
};
