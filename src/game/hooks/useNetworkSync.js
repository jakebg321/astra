import { useRef } from 'react';

export const useNetworkSync = (playerPosition, playerRotation, boostState) => {
  const networkState = useRef({
    boostStateDebounce: {
      stableState: false,
      frames: 0,
      lastState: false
    }
  });

  const updateNetworkSync = (input) => {
    if (!input || !playerPosition || !playerRotation) return;

    const debounce = networkState.current.boostStateDebounce;

    if (debounce.lastState !== boostState) {
      debounce.frames = 0;
      debounce.lastState = boostState;
    } else {
      debounce.frames++;
      if (debounce.frames >= 3) {
        debounce.stableState = boostState;
      }
    }

    if (!window.inputBuffer) window.inputBuffer = [];

    window.inputBuffer.push({
      keys: input.keys,
      boost: debounce.stableState,
      timestamp: performance.now(),
      position: {
        x: Math.round(playerPosition.x * 100) / 100,
        y: Math.round(playerPosition.y * 100) / 100,
        z: Math.round(playerPosition.z * 100) / 100
      },
      rotation: {
        x: Math.round(playerRotation.pitch * 1000) / 1000,
        y: Math.round(playerRotation.yaw * 1000) / 1000,
        z: Math.round(playerRotation.roll * 1000) / 1000
      }
    });
  };

  const updateLocalPlayer = () => {
    if (!playerPosition || !playerRotation) return;

    window.currentPlayerPosition = {
      x: playerPosition.x,
      y: playerPosition.y,
      z: playerPosition.z
    };
  };

  return {
    updateNetworkSync,
    updateLocalPlayer
  };
};
