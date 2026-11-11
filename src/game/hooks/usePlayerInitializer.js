import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import SimpleInputManager from '../systems/SimpleInputManager.js';
import { getWebSocketInstance } from '../services/UnifiedWebSocket.js';

export const usePlayerInitializer = (playerName, gameState, options = {}) => {
  const initializationDone = useRef(false);

  useEffect(() => {
    if (initializationDone.current || !playerName) return;
    if (options.isTraining) return;
    let isDisposed = false;
    let initInterval = null;
    let initTimeout = null;
    const clearInitTimers = () => {
      if (initInterval) {
        clearInterval(initInterval);
        initInterval = null;
      }
      if (initTimeout) {
        clearTimeout(initTimeout);
        initTimeout = null;
      }
    };

    const initializeGame = async () => {

      let retries = 0;
      const maxRetries = 50;
      
      while (!window.gameAssetsReady && !window.globalAssetsReady && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }

      if (isDisposed) return;
      
      if (!window.gameAssetsReady && !window.globalAssetsReady) {
        console.error('CRITICAL: Game assets failed to load after 5 seconds!');
        alert('Game assets failed to load. Controls may not work properly.');
      }
      
      const inputManager = SimpleInputManager.getInstance();
      inputManager.init();
      
      try {
        const ws = getWebSocketInstance();
        await ws.connect(playerName);
        if (isDisposed) return;
        window.gameFullyInitialized = true;
      } catch (error) {
        console.error('Network connection failed:', error);
        alert('Failed to connect to game server. Please refresh and try again.');
      }
    };
    
    initializeGame().catch(console.error);
    
    const ws = getWebSocketInstance();
    const tryInitFromServer = () => {
      const localPlayer = ws?.getLocalPlayer();
      if (localPlayer && localPlayer.position && !gameState.initialized) {

        const distanceFromOrigin = Math.sqrt(
          localPlayer.position.x * localPlayer.position.x + 
          localPlayer.position.z * localPlayer.position.z
        );

        const hasValidSpawn = localPlayer.isSpawn && distanceFromOrigin > 100;
        
        if (hasValidSpawn) {
          gameState.position = new THREE.Vector3(
            localPlayer.position.x,
            localPlayer.position.y,
            localPlayer.position.z
          );

          console.log('PITCH FIX: Skipping server rotation override to preserve local mouse control');
          
          gameState.initialized = true;

          if (window.gameMovementState && !window.gameMovementState.spawnReceived) {
            window.gameMovementState.position.copy(gameState.position);
            window.gameMovementState.initialized = true;
            window.gameMovementState.spawnReceived = true;
            console.log('Initializer set spawn position:', gameState.position.toArray());
          } else if (window.gameMovementState && window.gameMovementState.spawnReceived) {
            const distanceFromMovement = window.gameMovementState.position.distanceTo(gameState.position);
            if (distanceFromMovement > 5) {
              console.log('INITIALIZER POSITION OVERRIDE BLOCKED:', {
                movementPos: window.gameMovementState.position.toArray(),
                serverPos: gameState.position.toArray(),
                distance: distanceFromMovement.toFixed(3),
                reason: 'Movement system already initialized'
              });
            }
          }
          
          clearInitTimers();
          
          return true;
        }
      }
      return false;
    };

    initInterval = setInterval(() => {
      if (tryInitFromServer()) {
        clearInitTimers();
      }
    }, 200);
    
    initTimeout = setTimeout(() => {
      if (!isDisposed && !gameState.initialized) {
        clearInitTimers();
        console.warn('Failed to get spawn position from server after 10s');
      }
    }, 10000);
    
    window.getShipPosition = () => {
      if (!gameState.position) {
        return { x: 0, y: 0, z: 0 };
      }
      return {
        x: gameState.position.x,
        y: gameState.position.y,
        z: gameState.position.z
      };
    };
    
    window.getShipRotation = () => ({
      x: gameState.pitch,
      y: gameState.yaw,
      z: gameState.roll
    });
    
    window.gameStateRef = { current: gameState };
    
    initializationDone.current = true;

    return () => {
      isDisposed = true;
      clearInitTimers();
    };
  }, [playerName, gameState]);

  useEffect(() => {
    const handleReplayReset = () => {
      initializationDone.current = false;
      console.log('Initializer reset: initializationDone cleared for replay');
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('astra:replay-reset', handleReplayReset);
      return () => window.removeEventListener('astra:replay-reset', handleReplayReset);
    }
  }, []);

  return {
    isInitialized: gameState?.initialized || false
  };
};
