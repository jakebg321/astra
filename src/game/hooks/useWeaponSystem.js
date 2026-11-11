import { useEffect, useState, useRef } from 'react';
import { getWebSocketInstance } from '../services/UnifiedWebSocket.js';
import { gameStatsTracker } from '../services/GameStatsTracker.js';
import SimpleInputManager from '../systems/SimpleInputManager.js';
import { getAudioManager } from '../services/AudioManager.js';
import { GAME_CONFIG } from '../config/GameConfig.js';

export const useWeaponSystem = (playerPosition, playerRotation, playerVelocity, playerName, options = {}) => {
  const [weaponHeat, setWeaponHeat] = useState(0);
  const [isOverheated, setIsOverheated] = useState(false);
  const lastFireTime = useRef(0);
  const weaponId = useRef(Math.random().toString(36).substr(2, 9));

  const positionRef = useRef(playerPosition);
  const rotationRef = useRef(playerRotation);
  const velocityRef = useRef(playerVelocity);
  const disabledRef = useRef(options?.disabled);

  useEffect(() => { positionRef.current = playerPosition; }, [playerPosition]);
  useEffect(() => { rotationRef.current = playerRotation; }, [playerRotation]);
  useEffect(() => { velocityRef.current = playerVelocity; }, [playerVelocity]);
  useEffect(() => { disabledRef.current = options?.disabled; }, [options?.disabled]);

  useEffect(() => {
    if (!playerName) return;

    const fireCallback = () => {
      if (disabledRef.current) return;

      const isInPortalMode = window.isInPortalMode || window.gameMovementState?.portalAbility?.isDeploying;
      if (isInPortalMode) return;

      const now = Date.now();
      const cooldownMs = Math.max(0, GAME_CONFIG.combat.weaponCooldown * 1000);
      if (now - lastFireTime.current < cooldownMs) return;
      lastFireTime.current = now;

      const ws = getWebSocketInstance();
      if (!ws?.send) return;

      const position = positionRef.current;
      const rotation = rotationRef.current;
      const velocity = velocityRef.current;

      if (!position || !rotation || !velocity) return;

      const visualRollOnly = localStorage.getItem('visualRollOnly') === 'true';
      const noRollStrafe = localStorage.getItem('noRollStrafe') === 'true';
      const fireRoll = (visualRollOnly || noRollStrafe) ? 0 : rotation.roll;
      const forwardVelocity = velocity.z;
      const bulletStyle = parseInt(localStorage.getItem('bulletStyle') || '2');

      try {
        ws.send('fire', {
          position: { x: position.x, y: position.y, z: position.z },
          rotation: { x: rotation.pitch, y: rotation.yaw, z: fireRoll },
          velocity: Math.abs(forwardVelocity),
          bulletStyle: bulletStyle
        });

        gameStatsTracker.recordShotFired();
        const audioManager = getAudioManager();
        audioManager.playLaser();
        if (window.performanceMonitor?.logGameEvent) {
          window.performanceMonitor.logGameEvent('shoot', {
            player: playerName,
            bulletStyle,
            velocity: Math.abs(forwardVelocity)
          });
        }
      } catch (error) {
        console.error('FIRE FAILED:', error);
      }
    };

    const inputManager = SimpleInputManager.getInstance();
    inputManager.addCallback(fireCallback);

    return () => {
      inputManager.removeCallback(fireCallback);
    };
  }, [playerName]);

  useEffect(() => {
    const ws = getWebSocketInstance();
    
    const handleWeaponHeat = (data) => {
      const localPlayerId = ws?.gameStateManager?.playerId;
      
      if (data.playerId === localPlayerId) {
        setWeaponHeat(data.heat);
      }
    };
    
    const handleWeaponOverheat = (data) => {
      const localPlayerId = ws?.gameStateManager?.playerId;
      
      if (data.playerId === localPlayerId) {
        setIsOverheated(true);
        
        setTimeout(() => {
          setIsOverheated(false);
          setWeaponHeat(0);
        }, data.cooldownTime);
      }
    };
    
    if (ws) {
      ws.on('weaponHeat', handleWeaponHeat);
      ws.on('weaponOverheat', handleWeaponOverheat);
    }
    
    return () => {
      if (ws) {
        ws.off('weaponHeat', handleWeaponHeat);
        ws.off('weaponOverheat', handleWeaponOverheat);
      }
    };
  }, [playerName]);

  return {
    weaponHeat,
    isOverheated
  };
};
