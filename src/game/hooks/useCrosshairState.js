import { useState, useEffect, useCallback } from 'react';

export const useCrosshairState = () => {
  const [state, setState] = useState({
    style: 'default',
    color: '#00ffff',
    scale: 1,
    opacity: 1,
    isHitMarkerActive: false
  });
  
  const triggerHitMarker = useCallback(() => {
    setState(prev => ({ ...prev, isHitMarkerActive: true }));
    
    setTimeout(() => {
      setState(prev => ({ ...prev, isHitMarkerActive: false }));
    }, 200);
  }, []);
  
  const updateCrosshairForWeapon = useCallback((weaponType) => {
    const styles = {
      rifle: { style: 'default', scale: 1 },
      sniper: { style: 'sniper', scale: 1.2 },
      shotgun: { style: 'shotgun', scale: 1.5 }
    };
    
    setState(prev => ({
      ...prev,
      ...styles[weaponType]
    }));
  }, []);
  
  useEffect(() => {
    const handleMovement = (input) => {
      const isMoving = input.keys.w || input.keys.a || input.keys.s || input.keys.d;
      setState(prev => ({
        ...prev,
        scale: isMoving ? 1.3 : 1
      }));
    };
    
    if (window.InputManager) {
      window.InputManager.onStateChange = handleMovement;
    }
  }, []);
  
  return {
    crosshairState: state,
    triggerHitMarker,
    updateCrosshairForWeapon
  };
}; 