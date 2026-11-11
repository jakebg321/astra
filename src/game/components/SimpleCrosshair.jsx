import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GAME_CONFIG } from '../config/GameConfig.js';
import { useStickyAim } from '../hooks/useStickyAim.js';

const SimpleCrosshair = ({ shipPosition, shipRotation, enemyPositions = [], inputState = {} }) => {
  const crosshairRef = useRef();
  const { camera } = useThree();
  
  const {
    getAssistedCrosshairPosition,
    getAimStatus
  } = useStickyAim({
    shipPosition,
    shipRotation,
    enemyPositions,
    inputState,
    enabled: true
  });

  const crosshairGeometry = useMemo(() => {
    const group = new THREE.Group();
    
    const primaryColor = '#00ffff';
    const accentColor = '#ff0000';

    const diamondPoints = [
      new THREE.Vector3(0, 2.5, 0),
      new THREE.Vector3(2.5, 0, 0),
      new THREE.Vector3(0, -2.5, 0),
      new THREE.Vector3(-2.5, 0, 0),
      new THREE.Vector3(0, 2.5, 0)
    ];
    
    const diamondGeometry = new THREE.BufferGeometry().setFromPoints(diamondPoints);
    const diamondMaterial = new THREE.LineBasicMaterial({ 
      color: primaryColor, 
      linewidth: 3,
      transparent: true,
      opacity: 0.8
    });
    const diamondLine = new THREE.Line(diamondGeometry, diamondMaterial);
    group.add(diamondLine);

    const crossH = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.8, 0, 0),
      new THREE.Vector3(0.8, 0, 0)
    ]);
    const crossV = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -0.8, 0),
      new THREE.Vector3(0, 0.8, 0)
    ]);
    
    const crossMaterial = new THREE.LineBasicMaterial({
      color: accentColor,
      linewidth: 2,
      transparent: true,
      opacity: 0.9
    });
    
    const crossHMesh = new THREE.Line(crossH, crossMaterial);
    const crossVMesh = new THREE.Line(crossV, crossMaterial);
    group.add(crossHMesh);
    group.add(crossVMesh);

    const centerGeometry = new THREE.CircleGeometry(0.1, 8);
    const centerMaterial = new THREE.MeshBasicMaterial({ 
      color: accentColor,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const centerDot = new THREE.Mesh(centerGeometry, centerMaterial);
    group.add(centerDot);

    return group;
  }, []);
  
  useFrame(() => {
    if (!crosshairRef.current || !shipPosition || !shipRotation) return;

    const aimDistance = GAME_CONFIG.combat.crosshairDistance || 85;
    const assistedPosition = getAssistedCrosshairPosition(aimDistance);
    
    crosshairRef.current.position.copy(assistedPosition);
    crosshairRef.current.lookAt(camera.position);

    const aimStatus = getAimStatus();
    if (aimStatus.hasTarget) {

      crosshairRef.current.scale.setScalar(1.1);
    } else {
      crosshairRef.current.scale.setScalar(1.0);
    }
  });
  
  return <primitive ref={crosshairRef} object={crosshairGeometry} />;
};

export default SimpleCrosshair;