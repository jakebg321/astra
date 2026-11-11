import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import SimpleInputManager from '../systems/SimpleInputManager';
import { GAME_CONFIG } from '../config/GameConfig.js';
import { getAudioManager } from '../services/AudioManager.js';

export const useTrainingWeapons = (playerPosition, playerRotation) => {
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
    const inputManager = SimpleInputManager.getInstance();

    const fireCallback = () => {
      const now = Date.now();
      if (now - lastFireTime.current < 200) {
        return;
      }
      lastFireTime.current = now;

      const position = positionRef.current;
      const rotation = rotationRef.current;
      
      if (!position || !rotation) {
        console.log('TRAINING FIRE FAILED: Missing position/rotation data');
        return;
      }

      const euler = new THREE.Euler(rotation.pitch, rotation.yaw, rotation.roll, 'YXZ');
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyEuler(euler);
      
      const right = new THREE.Vector3(1, 0, 0);
      right.applyEuler(euler);
      
      const wingOffset = GAME_CONFIG.combat.wingOffset * 2 || 1.5;
      let forwardOffset = 5;
      
      const lastWing = lastWingFired.current || 'right';
      const fireFromLeft = lastWing === 'right';
      lastWingFired.current = fireFromLeft ? 'left' : 'right';

      const wingMultiplier = fireFromLeft ? -1 : 1;
      const sideOffset = 2.0;
      
      const bulletPosition = {
        x: position.x + (wingMultiplier * right.x * sideOffset) + (forward.x * forwardOffset),
        y: position.y - 4.0,
        z: position.z + (wingMultiplier * right.z * sideOffset) + (forward.z * forwardOffset)
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

      const aimDirection = new THREE.Vector3(normalizedConvergence.x, normalizedConvergence.y, normalizedConvergence.z);
      const aimOrigin = new THREE.Vector3(position.x, position.y - 4.0, position.z);
      
      let closestTarget = null;
      let closestDistance = Infinity;
      let willHitTarget = false;
      
      if (window.trainingTargets) {
        window.trainingTargets.forEach((target, index) => {
          const targetPos = new THREE.Vector3(target.x, target.y, target.z);
          const distanceToTarget = aimOrigin.distanceTo(targetPos);
          
          if (distanceToTarget < closestDistance) {
            closestDistance = distanceToTarget;
            closestTarget = { color: target.color, index: index, distance: distanceToTarget };
          }
          
          const targetRadius = 10;
          const aimRay = new THREE.Ray(aimOrigin, aimDirection);
          const distanceToRay = aimRay.distanceToPoint(targetPos);
          
          if (distanceToRay <= targetRadius) {
            willHitTarget = true;
          }
        });
      }

      const bulletStyle = parseInt(localStorage.getItem('bulletStyle') || '4');

      const bullet = {
        id: `bullet_training_${now}_C`,
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
        wing: fireFromLeft ? 'LEFT' : 'RIGHT',
        bulletStyle: bulletStyle
      };

      if (!window.trainingBullets) {
        window.trainingBullets = [];
      }
      window.trainingBullets.push(bullet);

      const audioManager = getAudioManager();
      audioManager.playLaser();

      const maxAge = GAME_CONFIG.combat.bulletLifetime * 1000;
      setTimeout(() => {
        if (window.trainingBullets) {
          window.trainingBullets = window.trainingBullets.filter(b => b.id !== bullet.id);
        }
      }, maxAge);
    };

    inputManager.callbacks.add(fireCallback);

    console.log('Training weapons registered - ONE callback only');
    
    return () => {
      inputManager.callbacks.delete(fireCallback);
    };
  }, []);

  return {
    localBullets: [],
    weaponId: 'training_weapon'
  };
};