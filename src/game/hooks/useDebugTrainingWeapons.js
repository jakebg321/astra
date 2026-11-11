import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import SimpleInputManager from '../systems/SimpleInputManager';
import { GAME_CONFIG } from '../config/GameConfig.js';
import { getAudioManager } from '../services/AudioManager.js';

export const useDebugTrainingWeapons = (playerPosition, playerRotation, onHit) => {
  const lastFireTime = useRef(0);
  const lastWingFired = useRef('right');

  const positionRef = useRef(playerPosition);
  const rotationRef = useRef(playerRotation);

  useEffect(() => {
    positionRef.current = playerPosition;
  }, [playerPosition]);

  useEffect(() => {
    rotationRef.current = playerRotation;
  }, [playerRotation]);

  useEffect(() => {
    const handleMouseDown = (e) => {
      if (e.button !== 0) return;
      
      const now = Date.now();
      if (now - lastFireTime.current < 200) return;
      lastFireTime.current = now;
      
      const position = positionRef.current;
      const rotation = rotationRef.current;
      
      if (!position || !rotation) return;

      const euler = new THREE.Euler(rotation.pitch, rotation.yaw, rotation.roll, 'YXZ');
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyEuler(euler);
      
      const right = new THREE.Vector3(1, 0, 0);
      right.applyEuler(euler);
      
      let forwardOffset = 5;

      const sideOffset = 0;
      
      const bulletPosition = {
        x: position.x + (forward.x * forwardOffset),
        y: position.y - 4.0,
        z: position.z + (forward.z * forwardOffset)
      };

      const convergenceDistance = 200;
      const convergencePoint = {
        x: position.x + (forward.x * convergenceDistance),
        y: position.y + (forward.y * convergenceDistance),
        z: position.z + (forward.z * convergenceDistance)
      };
      
      const convergenceDirection = {
        x: convergencePoint.x - bulletPosition.x,
        y: convergencePoint.y - bulletPosition.y,
        z: convergencePoint.z - bulletPosition.z
      };
      
      const convergenceLength = Math.sqrt(
        convergenceDirection.x * convergenceDirection.x + 
        convergenceDirection.y * convergenceDirection.y + 
        convergenceDirection.z * convergenceDirection.z
      );
      
      const normalizedConvergence = {
        x: convergenceDirection.x / convergenceLength,
        y: convergenceDirection.y / convergenceLength,
        z: convergenceDirection.z / convergenceLength
      };

      if (window.trainingTargets) {
        window.trainingTargets.forEach((target) => {
          const targetPos = new THREE.Vector3(target.x, target.y, target.z);
          const rayOrigin = new THREE.Vector3(bulletPosition.x, bulletPosition.y, bulletPosition.z);
          const rayDirection = new THREE.Vector3(normalizedConvergence.x, normalizedConvergence.y, normalizedConvergence.z);
          
          const ray = new THREE.Ray(rayOrigin, rayDirection);
          const distanceToTarget = ray.distanceToPoint(targetPos);
          
          if (distanceToTarget <= target.radius) {
            console.log(`BULLET HIT ${target.color} TARGET - Distance: ${distanceToTarget.toFixed(1)}u`);
            if (onHit) {
              onHit(target.id);
            }
          }
        });
      }

      const bullet = {
        id: `debug_bullet_${now}`,
        owner: 'training_player',
        position: bulletPosition,
        spawnPosition: { ...bulletPosition },
        velocity: {
          x: normalizedConvergence.x * GAME_CONFIG.combat.bulletSpeed,
          y: normalizedConvergence.y * GAME_CONFIG.combat.bulletSpeed,
          z: normalizedConvergence.z * GAME_CONFIG.combat.bulletSpeed
        },
        created: now,
        isVisualOnly: true,
        wing: 'CENTER',
        bulletStyle: 4
      };
      
      if (!window.trainingBullets) {
        window.trainingBullets = [];
      }
      window.trainingBullets.push(bullet);
      
      console.log(`TRAINING BULLET FIRED: Trajectory matches laser exactly`);
      
      const audioManager = getAudioManager();
      audioManager.playLaser();
      
      const maxAge = GAME_CONFIG.combat.bulletLifetime * 1000;
      setTimeout(() => {
        if (window.trainingBullets) {
          window.trainingBullets = window.trainingBullets.filter(b => b.id !== bullet.id);
        }
      }, maxAge);
    };

    document.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onHit]);

  return {
    localBullets: [],
    weaponId: 'debug_training_weapon'
  };
};