import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import SimpleInputManager from '../systems/SimpleInputManager';
import { GAME_CONFIG } from '../config/GameConfig.js';

const DebugLaserWeapon = ({ playerPosition, playerRotation, onTrajectoryUpdate }) => {
  const laserRef = useRef();
  const [isFiring, setIsFiring] = useState(false);
  const [trajectoryData, setTrajectoryData] = useState(null);

  useEffect(() => {
    const handleMouseDown = (e) => {
      if (e.button === 0) {
        setIsFiring(true);
      }
    };
    
    const handleMouseUp = (e) => {
      if (e.button === 0) {
        setIsFiring(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useFrame(() => {
    if (!isFiring || !playerPosition || !playerRotation || !laserRef.current) {
      if (laserRef.current) {
        laserRef.current.visible = false;
      }
      return;
    }

    const position = playerPosition;
    const rotation = playerRotation;

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

    const laserLength = 1000;
    const laserEnd = {
      x: bulletPosition.x + (normalizedConvergence.x * laserLength),
      y: bulletPosition.y + (normalizedConvergence.y * laserLength),
      z: bulletPosition.z + (normalizedConvergence.z * laserLength)
    };

    const points = [
      new THREE.Vector3(bulletPosition.x, bulletPosition.y, bulletPosition.z),
      new THREE.Vector3(laserEnd.x, laserEnd.y, laserEnd.z)
    ];
    
    laserRef.current.geometry.setFromPoints(points);
    laserRef.current.visible = true;

    const trajectory = {
      spawn: bulletPosition,
      direction: normalizedConvergence,
      end: laserEnd,
      convergencePoint: convergencePoint
    };
    
    setTrajectoryData(trajectory);
    
    if (onTrajectoryUpdate) {
      onTrajectoryUpdate(trajectory);
    }
  });

  return (
    <line ref={laserRef}>
      <bufferGeometry />
      <lineBasicMaterial 
        color="#ff0000" 
        linewidth={3}
        transparent={true}
        opacity={0.8}
      />
    </line>
  );
};

export default DebugLaserWeapon;