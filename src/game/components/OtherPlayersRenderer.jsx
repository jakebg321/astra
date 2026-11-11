import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getWebSocketInstance } from '../services/UnifiedWebSocket.js';
import ShipRenderer from './ShipRenderer.jsx';
import ProfessionalTrail from './ProfessionalTrail.jsx';
import EnemyTrail from './EnemyTrail.jsx';
import { getMasterRenderLoop } from '../systems/MasterRenderLoop.js';
import { poolVector3, poolEuler } from '../systems/ObjectPool.js';
import { GAME_CONFIG } from '../config/GameConfig.js';
import { isEnemyVisible } from '../utils/enemyVisibility.js';

const OtherPlayer = ({ playerId }) => {
  const meshRef = useRef();
  const shipRef = useRef();
  const currentPositionRef = useRef(null);
  const [isPortalTraveling, setIsPortalTraveling] = useState(false);
  const shipGroupRef = useRef();

  const targetPosition = useRef(new THREE.Vector3());
  const targetRotation = useRef(new THREE.Euler());

  useEffect(() => {

    shipRef.current = null;

    return () => {

      if (shipRef.current && window.gameAssets?.preloader?.returnPlayerShipToPool) {
        window.gameAssets.preloader.returnPlayerShipToPool(shipRef.current);
      }
    };
  }, [playerId]);

  useEffect(() => {
    const handlePortalTravelStart = (event) => {
      if (event.detail.playerId === playerId) {
        console.log(`Player ${playerId} entering portal - hiding enemy ship`);
        setIsPortalTraveling(true);
      }
    };
    
    const handlePortalTravelEnd = (event) => {
      if (event.detail.playerId === playerId) {
        console.log(`Player ${playerId} exiting portal - showing enemy ship`);
        setIsPortalTraveling(false);
      }
    };
    
    window.addEventListener('portal-travel-start', handlePortalTravelStart);
    window.addEventListener('portal-travel-end', handlePortalTravelEnd);
    
    return () => {
      window.removeEventListener('portal-travel-start', handlePortalTravelStart);
      window.removeEventListener('portal-travel-end', handlePortalTravelEnd);
    };
  }, [playerId]);

  useFrame(() => {
    const ws = getWebSocketInstance();
    const playerData = ws?.getOtherPlayers()?.[playerId];
    if (!playerData?.position) {
      return;
    }

    const distanceFromOrigin = Math.sqrt(
      playerData.position.x * playerData.position.x + 
      playerData.position.z * playerData.position.z
    );
    if (distanceFromOrigin < 50) {
      return;
    }

    const mesh = shipRef.current || meshRef.current;
    if (!mesh) return;
    
    targetPosition.current.set(
      playerData.position.x,
      playerData.position.y,
      playerData.position.z
    );

    mesh.position.copy(targetPosition.current);

    currentPositionRef.current = {
      x: mesh.position.x,
      y: mesh.position.y,
      z: mesh.position.z
    };

    if (playerData.rotation) {
      targetRotation.current.set(
        playerData.rotation.x || 0,
        playerData.rotation.y || 0,
        playerData.rotation.z || 0,
        'YXZ'
      );

      mesh.rotation.copy(targetRotation.current);
    }

    if (shipGroupRef.current) {
      shipGroupRef.current.visible = isEnemyVisible(playerData) && !isPortalTraveling;
    }
  });
  
  return (
    <group ref={shipGroupRef}>
      {currentPositionRef.current && (
        <EnemyTrail
          position={currentPositionRef.current}
          playerId={playerId}
        />
      )}

      <ShipRenderer ref={meshRef} position={{x:0,y:0,z:0}} rotation={{x:0,y:0,z:0}} />
    </group>
  );
};

const OtherPlayersRenderer = () => {
  const [otherPlayerIds, setOtherPlayerIds] = useState([]);
  const frameCounter = useRef(0);
  const cachedIds = useRef([]);

  useFrame(() => {
    frameCounter.current++;

    if (frameCounter.current % 6 !== 0) return;
    
    const ws = getWebSocketInstance();
    const others = ws?.getOtherPlayers();
    if (!others) return;
    
    const localPlayerId = ws?.gameStateManager?.playerId;
    if (!localPlayerId) return;

    const activeIds = Object.keys(others).filter(id => {
      if (!id || id === localPlayerId) return false;
      
      const playerData = others[id];
      return playerData && playerData.position && 
             typeof playerData.position.x === 'number' && 
             typeof playerData.position.y === 'number';
    });

    if (activeIds.length > 1) {
      console.warn('Multiple enemies in 1v1 game:', activeIds.length, 'IDs:', activeIds);
    }

    let hasChanged = activeIds.length !== cachedIds.current.length;
    if (!hasChanged) {
      for (let i = 0; i < activeIds.length; i++) {
        if (activeIds[i] !== cachedIds.current[i]) {
          hasChanged = true;
          break;
        }
      }
    }
    
    if (hasChanged) {
      cachedIds.current = activeIds;
      setOtherPlayerIds(activeIds);
    }
  });
  
  return (
    <>
      {otherPlayerIds.map(playerId => (
        <OtherPlayer key={playerId} playerId={playerId} />
      ))}
      <EnemyBeacons />
    </>
  );
};

const EnemyBeaconMesh = ({ position: pos }) => {
  const groupRef = useRef();
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.lookAt(camera.position);
    groupRef.current.rotation.z += delta * 0.5;
  });

  return (
    <group ref={groupRef} position={[pos.x, pos.y, pos.z]}>
      <mesh>
        <octahedronGeometry args={[5, 0]} />
        <meshStandardMaterial color="#ff3333" emissive="#ff0000" emissiveIntensity={2} transparent opacity={0.7} />
      </mesh>
      <pointLight color="#ff3333" intensity={2} distance={60} />
    </group>
  );
};

const EnemyBeacons = () => {
  const [beacons, setBeacons] = useState({});
  const beaconsRef = useRef({});

  useEffect(() => {
    const onPlaced = (e) => {
      const { playerId, position } = e.detail;
      const ws = getWebSocketInstance();
      const localId = ws?.gameStateManager?.playerId;
      if (playerId === localId) return;

      beaconsRef.current = { ...beaconsRef.current, [playerId]: position };
      setBeacons({ ...beaconsRef.current });
    };
    const onRemoved = (e) => {
      const { playerId } = e.detail;
      const next = { ...beaconsRef.current };
      delete next[playerId];
      beaconsRef.current = next;
      setBeacons(next);
    };

    window.addEventListener('enemy-beacon-placed', onPlaced);
    window.addEventListener('enemy-beacon-removed', onRemoved);
    return () => {
      window.removeEventListener('enemy-beacon-placed', onPlaced);
      window.removeEventListener('enemy-beacon-removed', onRemoved);
    };
  }, []);

  return (
    <>
      {Object.entries(beacons).map(([pid, pos]) => (
        <EnemyBeaconMesh key={pid} position={pos} />
      ))}
    </>
  );
};

export default OtherPlayersRenderer;