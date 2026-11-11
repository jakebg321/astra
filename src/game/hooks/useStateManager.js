import { useState, useRef } from 'react';

export const useStateManager = (playerPosition, playerRotation, playerHealth, playerBoost, isBoosting) => {
  const [shipState, setShipState] = useState({
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  });

  const lastUpdateTime = useRef(0);

  const updateShipState = (onHealthChange, onBoostChange, onShipStateChange, onScreenPositionUpdate) => {
    if (!playerPosition || !playerRotation) return;

    const visualRollOnly = localStorage.getItem('visualRollOnly') === 'true';
    const crosshairRoll = visualRollOnly ? 0 : playerRotation.roll;

    const now = performance.now();
    if (now - lastUpdateTime.current > 50) {
      const newShipState = {
        position: {
          x: playerPosition.x,
          y: playerPosition.y, 
          z: playerPosition.z
        },
        rotation: {
          x: playerRotation.pitch,
          y: playerRotation.yaw,
          z: crosshairRoll
        }
      };
      
      setShipState(newShipState);
      lastUpdateTime.current = now;

      onBoostChange?.({
        boost: playerBoost,
        isBoosting: isBoosting
      });
      
      onShipStateChange?.(newShipState);
    }
  };

  const updateDebugStats = () => {
    if (!playerPosition || !playerRotation) return;

    window.debugStats = window.debugStats || {};
    window.debugStats.boostActive = isBoosting;
    window.debugStats.boostLevel = Math.round(playerBoost);
    window.debugStats.playerSpeed = Math.round(playerPosition.length?.() * 100) / 100 || 0;
  };

  return {
    shipState,
    updateShipState,
    updateDebugStats
  };
};