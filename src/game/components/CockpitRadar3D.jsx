import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getWebSocketInstance } from '../services/UnifiedWebSocket';

const CockpitRadar3D = ({ 
  shipPosition, 
  shipRotation, 
  isVisible = true, 
  onPositionChange, 
  onRotationChange, 
  onScaleChange 
}) => {
  const meshRef = useRef();
  const canvasRef = useRef();
  const textureRef = useRef();
  const { gl, camera } = useThree();

  const [dynamicPosition, setDynamicPosition] = useState([0.8, -0.4, -1.2]);
  const [dynamicRotation, setDynamicRotation] = useState([-0.3, 0.2, 0]);
  const [dynamicScale, setDynamicScale] = useState(1);
  
  useEffect(() => {
    const savedPosition = localStorage.getItem('radar3d_position');
    const savedRotation = localStorage.getItem('radar3d_rotation');
    const savedScale = localStorage.getItem('radar3d_scale');
    
    if (savedPosition) {
      const pos = JSON.parse(savedPosition);
      setDynamicPosition([pos.x, pos.y, pos.z]);
    }
    
    if (savedRotation) {
      const rot = JSON.parse(savedRotation);
      setDynamicRotation([rot.x, rot.y, rot.z]);
    }
    
    if (savedScale) {
      const scl = parseFloat(savedScale);
      setDynamicScale(scl);
    }
  }, []);
  
  const handlePositionChange = (pos) => {
    setDynamicPosition([pos.x, pos.y, pos.z]);
    onPositionChange?.(pos);
  };
  
  const handleRotationChange = (rot) => {
    setDynamicRotation([rot.x, rot.y, rot.z]);
    onRotationChange?.(rot);
  };
  
  const handleScaleChange = (scale) => {
    setDynamicScale(scale);
    onScaleChange?.(scale);
  };
  
  useEffect(() => {
    if (!meshRef.current || !isVisible) return;
    
    meshRef.current.position.set(...dynamicPosition);
    meshRef.current.rotation.set(...dynamicRotation);
    meshRef.current.scale.set(dynamicScale, dynamicScale, dynamicScale);
    
  }, [dynamicPosition, dynamicRotation, dynamicScale, isVisible]);
  
  const [radarSize] = useState(512);
  const [maxRange] = useState(2000);

  const canvas = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = radarSize;
    canvas.height = radarSize;
    canvasRef.current = canvas;
    return canvas;
  }, [radarSize]);

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.flipY = false;
    textureRef.current = tex;
    return tex;
  }, [canvas]);

  const radarGeometry = useMemo(() => {
    const group = new THREE.Group();

    const screenGeometry = new THREE.CircleGeometry(5, 32);
    const screenMaterial = new THREE.MeshBasicMaterial({ 
      map: texture,
      transparent: true,
      opacity: 0.9
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.z = -0.1;
    group.add(screen);

    const bezelGeometry = new THREE.RingGeometry(5, 5.5, 32);
    const bezelMaterial = new THREE.MeshStandardMaterial({ 
      color: '#333333',
      metalness: 0.8,
      roughness: 0.2
    });
    const bezel = new THREE.Mesh(bezelGeometry, bezelMaterial);
    bezel.position.z = 0;
    group.add(bezel);

    const frameGeometry = new THREE.RingGeometry(5.5, 6.2, 32);
    const frameMaterial = new THREE.MeshStandardMaterial({ 
      color: '#222222',
      metalness: 0.6,
      roughness: 0.4
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.z = 0.05;
    group.add(frame);
    
    return group;
  }, [texture]);

  const renderRadar = () => {
    if (!canvasRef.current || !shipPosition) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const centerX = radarSize / 2;
    const centerY = radarSize / 2;
    const radarRadius = (radarSize / 2) - 40;
    
    ctx.clearRect(0, 0, radarSize, radarSize);
    
    drawRadarBackground(ctx, centerX, centerY, radarRadius);
    
    const ws = getWebSocketInstance();
    const otherPlayers = ws?.getOtherPlayers();
    const localPlayerId = ws?.gameStateManager?.playerId;
    
    if (!otherPlayers || !localPlayerId) return;

    const allIds = Object.keys(otherPlayers);
    const localPlayerBaseName = localPlayerId ? localPlayerId.split('_')[0] : null;
    
    let newestEnemyId = null;
    let newestTimestamp = 0;
    
    for (const id of allIds) {
      if (!id || id === localPlayerId) continue;
      
      const player = otherPlayers[id];
      if (!player || !player.position) continue;
      
      const baseName = id.split('_')[0];
      if (localPlayerBaseName && baseName === localPlayerBaseName) continue;
      
      const timestamp = parseInt(id.split('_')[1]) || 0;
      if (timestamp > newestTimestamp) {
        newestTimestamp = timestamp;
        newestEnemyId = id;
      }
    }
    
    const enemies = newestEnemyId ? [{
      id: newestEnemyId,
      position: otherPlayers[newestEnemyId].position,
      distance: Math.sqrt(
        Math.pow(otherPlayers[newestEnemyId].position.x - shipPosition.x, 2) +
        Math.pow(otherPlayers[newestEnemyId].position.z - shipPosition.z, 2)
      )
    }].filter(enemy => enemy.distance <= maxRange) : [];
    
    enemies.forEach(enemy => {
      drawEnemyOnRadar(ctx, enemy, shipPosition, shipRotation, centerX, centerY, radarRadius);
    });
    
    drawPlayerShip(ctx, centerX, centerY);
    
    drawViewCone(ctx, centerX, centerY, radarRadius, shipRotation);
    
    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  };

  const drawRadarBackground = (ctx, centerX, centerY, radius) => {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.stroke();

    const rings = 3;
    for (let i = 1; i <= rings; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius / rings) * i, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const drawEnemyOnRadar = (ctx, enemy, playerPos, playerRot, centerX, centerY, radius) => {

    const dx = enemy.position.x - playerPos.x;
    const dz = enemy.position.z - playerPos.z;
    const dy = enemy.position.y - playerPos.y;
    
    const playerYaw = (playerRot && playerRot.y) ? playerRot.y : 0;
    const worldAngle = Math.atan2(dx, dz);
    const relativeAngle = worldAngle - playerYaw;
    
    const distance2D = Math.sqrt(dx * dx + dz * dz);
    const distanceScale = Math.min(distance2D / maxRange, 1.0);
    
    const radarDistance = distanceScale * radius * 0.95;
    const radarX = centerX + Math.sin(relativeAngle) * radarDistance;
    const radarY = centerY + Math.cos(relativeAngle) * radarDistance;
    
    drawEnemyIndicator(ctx, radarX, radarY, enemy.distance, dy);
  };

  const drawEnemyIndicator = (ctx, x, y, distance, heightDiff) => {
    const size = 12;

    let color = '#00ffff';
    if (heightDiff > 5) color = '#00ff88';
    if (heightDiff < -5) color = '#ff8800';
    
    ctx.save();
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (Math.abs(heightDiff) > 2) {
      const heightScale = Math.abs(heightDiff) * 3;
      const maxHeightUp = 200;
      const maxHeightDown = 100;
      const maxHeight = heightDiff > 0 ? maxHeightUp : maxHeightDown;
      const lineHeight = Math.min(heightScale, maxHeight);
      
      const radarBaseY = y;
      const indicatorY = heightDiff > 0 ? radarBaseY - lineHeight : radarBaseY + lineHeight;
      
      ctx.beginPath();
      ctx.moveTo(x, radarBaseY);
      ctx.lineTo(x, indicatorY);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.stroke();
      
      ctx.save();
      ctx.translate(x, indicatorY);
      
      if (heightDiff > 0) {

        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(-size, 0);
        ctx.lineTo(size, 0);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      } else {

        ctx.beginPath();
        ctx.moveTo(0, size);
        ctx.lineTo(-size, 0);
        ctx.lineTo(size, 0);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      }
      
      ctx.restore();
    }
    
    ctx.restore();
  };

  const drawPlayerShip = (ctx, centerX, centerY) => {
    ctx.save();
    ctx.translate(centerX, centerY);

    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-4, 4);
    ctx.lineTo(0, 2);
    ctx.lineTo(4, 4);
    ctx.closePath();
    
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
  };

  const drawViewCone = (ctx, centerX, centerY, radius, rotation) => {
    if (!rotation) return;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    
    const coneAngle = Math.PI / 6;
    const coneLength = radius * 0.8;
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(-coneAngle) * coneLength, -Math.cos(-coneAngle) * coneLength);
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(coneAngle) * coneLength, -Math.cos(coneAngle) * coneLength);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
  };

  const lastRadarTime = useRef(0);
  useFrame(() => {
    if (!isVisible) return;
    const now = performance.now();
    if (now - lastRadarTime.current > 100) {
      renderRadar();
      lastRadarTime.current = now;
    }
  });

  if (!isVisible) return null;

  return (
    <group 
      ref={meshRef}
      position={dynamicPosition}
      rotation={dynamicRotation}
      scale={dynamicScale}
    >
      <primitive object={radarGeometry} />
      

      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshBasicMaterial wireframe color="red" opacity={1} transparent={false} />
      </mesh>
      

      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial wireframe color="yellow" opacity={1} transparent={false} />
      </mesh>
      
      <pointLight
        position={[0, 0, 1]}
        intensity={0.5}
        color="#00ff88"
        distance={5}
      />
    </group>
  );
};

export default CockpitRadar3D;