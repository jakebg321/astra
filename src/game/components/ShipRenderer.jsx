import React, { useRef, forwardRef, useState, useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import BoostExhaustOptimized from './BoostExhaustOptimized';
import ThrusterDebugPositioner from './ThrusterDebugPositioner';

const ShipRenderer = forwardRef(({ position, rotation, visualTilt, isBoosting }, ref) => {
  const [thrusterPosition, setThrusterPosition] = useState([0, 0.00, 2.90]);

  const getThrusterPosition = () => {
    return window.thrusterDebugPosition || thrusterPosition;
  };
  
  useEffect(() => {
    const checkPosition = () => {
      if (window.thrusterDebugPosition) {
        setThrusterPosition(window.thrusterDebugPosition);
      }
    };
    
    const interval = setInterval(checkPosition, 160);
    return () => clearInterval(interval);
  }, []);

  const shipMeshRef = useRef();
  
  useEffect(() => {
    if (window.gameAssets?.loaded && window.gameAssets.shipModel && !shipMeshRef.current) {
      try {
        const originalScene = window.gameAssets.shipModel.scene;
        const clonedScene = originalScene.clone();
        
        clonedScene.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material = new THREE.MeshBasicMaterial({
              color: child.material.color ? child.material.color.clone() : new THREE.Color(0x666666),
              side: THREE.DoubleSide,
              map: window.gameAssets.hullTexture || null
            });
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        shipMeshRef.current = clonedScene;
      } catch (error) {
        console.error('Ship model setup failed:', error);
      }
    }
  }, []);

  const ShipMesh = () => {
    if (shipMeshRef.current) {
      return <primitive object={shipMeshRef.current} scale={[3.50, 3.50, 3.50]} rotation={[0, Math.PI, 0]} />;
    }

    return (
      <mesh>
        <boxGeometry args={[1, 0.5, 2]} />
        <meshBasicMaterial color="#666666" />
      </mesh>
    );
  };
  
  React.useEffect(() => {
    if (ref.current && position && rotation) {
      ref.current.position.set(position.x || 0, position.y || 0, position.z || 0);

      if (ref.current.rotation.order !== 'YXZ') {
        ref.current.rotation.order = 'YXZ';
      }
      ref.current.rotation.set(rotation.x || 0, rotation.y || 0, (rotation.z || 0) + (visualTilt || 0));
    }
  }, [position, rotation, visualTilt]);

  const BoostTrail = () => {
    if (!boostTrail) return null;
    
    const trailRef = useRef();
    
    useEffect(() => {
      if (trailRef.current && boostTrail) {
        trailRef.current.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material = new THREE.MeshBasicMaterial({
              color: '#00ffff',
              transparent: true,
              opacity: 0.7
            });
          }
        });
      }
    }, []);

    useEffect(() => {
      if (trailRef.current) {
        trailRef.current.visible = isBoosting || false;
        if (trailRef.current.visible) {
          trailRef.current.traverse((child) => {
            if (child.isMesh && child.material) {
              child.material.opacity = isBoosting ? 0.8 : 0.4;
            }
          });
        }
      }
    }, [isBoosting]);
    
    return (
      <primitive 
        ref={trailRef}
        object={boostTrail.scene.clone()} 
        scale={[0.35, 0.35, 0.35]} 
        rotation={[0, Math.PI, 0]} 
      />
    );
  };

  const debugScale = window.debugShipScale || 1.0;
  
  return (
    <group ref={ref} scale={[debugScale, debugScale, debugScale]}>
      <ShipMesh />
      

      
      <pointLight intensity={0.5} distance={10} color="#ffffff" />
      
    </group>
  );
});

export { ThrusterDebugPositioner };

export default ShipRenderer; 