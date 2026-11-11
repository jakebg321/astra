import { useRef, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import stickyAimSystem from '../systems/StickyAimSystem.js';

export const useStickyAim = ({
  shipPosition,
  shipRotation,
  enemyPositions = [],
  inputState = {},
  enabled = true
} = {}) => {
  const { camera } = useThree();
  const originalAimDirection = useRef(new THREE.Vector3(0, 0, -1));
  const assistedAimDirection = useRef(new THREE.Vector3(0, 0, -1));
  const frameCounter = useRef(0);
  
  const updateOriginalAimDirection = useCallback(() => {
    if (!shipRotation) return;
    
    const euler = new THREE.Euler(shipRotation.x, shipRotation.y, shipRotation.z, 'YXZ');
    originalAimDirection.current.set(0, 0, -1).applyEuler(euler).normalize();
  }, [shipRotation]);
  
  const getAssistedAimDirection = useCallback(() => {
    if (!enabled || !shipPosition || !shipRotation) {
      return originalAimDirection.current.clone();
    }
    
    updateOriginalAimDirection();
    
    const assistedDirection = stickyAimSystem.update({
      shipPosition,
      shipRotation,
      originalAimDirection: originalAimDirection.current,
      enemyPositions,
      camera,
      inputState
    });
    
    assistedAimDirection.current.copy(assistedDirection);
    return assistedDirection;
  }, [enabled, shipPosition, shipRotation, enemyPositions, inputState, camera, updateOriginalAimDirection]);
  
  useFrame(() => {
    frameCounter.current++;
    
    getAssistedAimDirection();

    if (frameCounter.current % 60 === 0 && stickyAimSystem.debugMode) {
      const status = stickyAimSystem.getStatus();
    }
  });
  
  const getAssistedCrosshairPosition = useCallback((crosshairDistance = 85) => {
    if (!shipPosition) return new THREE.Vector3();
    
    const aimDirection = getAssistedAimDirection();
    return new THREE.Vector3()
      .copy(shipPosition)
      .add(aimDirection.multiplyScalar(crosshairDistance));
  }, [shipPosition, getAssistedAimDirection]);
  
  const getAssistedBulletDirection = useCallback(() => {
    return getAssistedAimDirection();
  }, [getAssistedAimDirection]);
  
  const getAimStatus = useCallback(() => {
    return stickyAimSystem.getStatus();
  }, []);
  
  const toggleStickyAim = useCallback(() => {
    return stickyAimSystem.toggle();
  }, []);
  
  const updateStickyAimSettings = useCallback((settings) => {
    stickyAimSystem.updateSettings(settings);
  }, []);
  
  const resetStickyAimSettings = useCallback(() => {
    stickyAimSystem.resetToDefaults();
  }, []);
  
  useEffect(() => {
    stickyAimSystem.enabled = enabled;
  }, [enabled]);
  
  return {
    originalAimDirection: originalAimDirection.current,
    assistedAimDirection: assistedAimDirection.current,
    
    getAssistedCrosshairPosition,
    getAssistedBulletDirection,
    getAssistedAimDirection,
    
    getAimStatus,
    toggleStickyAim,
    updateStickyAimSettings,
    resetStickyAimSettings,
    
    stickyAimSystem
  };
};

export const useStickyAimStatus = () => {
  const getStatus = useCallback(() => {
    return stickyAimSystem.getStatus();
  }, []);
  
  const toggle = useCallback(() => {
    return stickyAimSystem.toggle();
  }, []);
  
  return {
    getStatus,
    toggle,
    enabled: stickyAimSystem.enabled
  };
};