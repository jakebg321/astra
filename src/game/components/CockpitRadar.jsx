import React, { useRef, useEffect, useState } from 'react';
import { getWebSocketInstance } from '../services/UnifiedWebSocket';
import { isEnemyVisible } from '../utils/enemyVisibility.js';

const CockpitRadar = ({ 
  shipPosition, 
  shipRotation, 
  isVisible = true,
  positionTop = null,
  positionBottom = '20px',
  positionLeft = '50%',
  positionTransform = 'translate(-50%, -50%) perspective(400px) rotateX(45deg)',
  showLabels = true,
  lockToCockpitAnchor = false,
  anchorScale = 0.74
}) => {
  const canvasRef = useRef();
  const containerRef = useRef();
  const [radarSize] = useState(200);
  const [canvasSize] = useState(400);
  const [maxRange] = useState(2000);
  
  useEffect(() => {
    if (!isVisible || !canvasRef.current || !shipPosition) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    const radarRadius = (radarSize / 2) - 20;
    
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    
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

    const enemies = newestEnemyId && isEnemyVisible(otherPlayers[newestEnemyId]) ? [{
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
    
  }, [shipPosition, shipRotation, isVisible, radarSize, canvasSize, maxRange]);

  useEffect(() => {
    if (!lockToCockpitAnchor) return undefined;

    let rafId = null;

    const applyFallback = (container) => {
      if (!container) return;
      if (positionTop) {
        container.style.top = positionTop;
        container.style.bottom = 'auto';
      } else {
        container.style.bottom = positionBottom;
        container.style.top = 'auto';
      }
      container.style.left = positionLeft;
      container.style.transform = positionTransform;
    };

    const updateAnchor = () => {
      const container = containerRef.current;
      const anchor = window.__astraCockpitRadarAnchor;

      if (!container) {
        rafId = requestAnimationFrame(updateAnchor);
        return;
      }

      if (
        anchor &&
        Number.isFinite(anchor.x) &&
        Number.isFinite(anchor.y)
      ) {
        container.style.top = `${anchor.y}px`;
        container.style.left = `${anchor.x}px`;
        container.style.bottom = 'auto';
        container.style.transform = `translate(-50%, -50%) scale(${anchorScale})`;
      } else {
        applyFallback(container);
      }

      rafId = requestAnimationFrame(updateAnchor);
    };

    applyFallback(containerRef.current);
    rafId = requestAnimationFrame(updateAnchor);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [
    lockToCockpitAnchor,
    anchorScale,
    positionTop,
    positionBottom,
    positionLeft,
    positionTransform
  ]);
  
  const drawRadarBackground = (ctx, centerX, centerY, radius) => {

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 3;
    ctx.stroke();

    const rings = 3;
    for (let i = 1; i <= rings; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius / rings) * i, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(255, 68, 68, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.strokeStyle = 'rgba(255, 68, 68, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.translate(centerX, centerY);
    const sweepAngle = (Date.now() / 2000) % (2 * Math.PI);
    ctx.rotate(sweepAngle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -radius);
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };
  
  const drawEnemyOnRadar = (ctx, enemy, playerPos, playerRot, centerX, centerY, radius) => {
    const dx = enemy.position.x - playerPos.x;
    const dz = enemy.position.z - playerPos.z;
    const dy = enemy.position.y - playerPos.y;

    const playerYaw = (playerRot && playerRot.y) ? playerRot.y : 0;
    const worldAngle = Math.atan2(dx, dz);
    const relativeAngle = worldAngle - playerYaw;

    const distanceScale = Math.min(enemy.distance / maxRange, 1);
    const radarDistance = distanceScale * radius * 0.95;
    
    const radarX = centerX + Math.sin(relativeAngle) * radarDistance;
    const radarY = centerY + Math.cos(relativeAngle) * radarDistance;
    
    const heightDiff = dy;
    const maxHeightOffset = 15;
    const heightOffset = Math.max(-maxHeightOffset, Math.min(maxHeightOffset, heightDiff * 0.1));
    const finalY = radarY + heightOffset;
    
    drawEnemyIndicator(ctx, radarX, finalY, enemy.distance, heightDiff);
  };
  
  const drawEnemyIndicator = (ctx, x, y, distance, heightDiff) => {
    const size = 8;

    let color = '#00ffff';
    if (heightDiff > 5) color = '#00ff88';
    if (heightDiff < -5) color = '#ff8800';
    
    ctx.save();

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();

    if (Math.abs(heightDiff) > 2) {

      const heightScale = Math.abs(heightDiff) * 4;

      const maxHeightUp = 300;
      const maxHeightDown = 150;
      const maxHeight = heightDiff > 0 ? maxHeightUp : maxHeightDown;
      const lineHeight = Math.min(heightScale, maxHeight);
      
      const radarBaseY = y;
      const indicatorY = heightDiff > 0 ? radarBaseY - lineHeight : radarBaseY + lineHeight;
      
      ctx.beginPath();
      ctx.moveTo(x, radarBaseY);
      ctx.lineTo(x, indicatorY);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
      
      ctx.save();
      ctx.translate(x, indicatorY);
      
      if (heightDiff > 0) {

        ctx.beginPath();
        ctx.moveTo(0, -size * 1.5);
        ctx.lineTo(-size, 0);
        ctx.lineTo(size, 0);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.fillStyle = color;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`↑${Math.round(Math.abs(heightDiff))}`, 0, -size * 2);
      } else {

        ctx.beginPath();
        ctx.moveTo(0, size * 1.5);
        ctx.lineTo(-size, 0);
        ctx.lineTo(size, 0);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.fillStyle = color;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`↓${Math.round(Math.abs(heightDiff))}`, 0, size * 2 + 10);
      }
      
      ctx.restore();

    } else {

      y = y;
    }

    const originalY = y;
    ctx.translate(x, originalY);
    
    if (Math.abs(heightDiff) > 5) {
      const isAbove = heightDiff > 0;
      ctx.beginPath();
      if (isAbove) {

        ctx.moveTo(0, -size);
        ctx.lineTo(-size/2, size/2);
        ctx.lineTo(size/2, size/2);
      } else {

        ctx.moveTo(0, size);
        ctx.lineTo(-size/2, -size/2);
        ctx.lineTo(size/2, -size/2);
      }
      ctx.closePath();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size, 0);
      ctx.closePath();
    }
    
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.fillStyle = color;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(distance), 0, size + 15);
    
    ctx.restore();
  };
  
  const drawPlayerShip = (ctx, centerX, centerY) => {

    const size = 8;
    ctx.save();
    ctx.translate(centerX, centerY);

    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(-size/2, size/2);
    ctx.lineTo(size/2, size/2);
    ctx.closePath();
    
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
  };
  
  const drawViewCone = (ctx, centerX, centerY, radius, shipRotation) => {

    const coneAngle = Math.PI / 6;
    const coneLength = radius * 0.6;
    
    ctx.save();
    ctx.translate(centerX, centerY);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(-coneAngle) * coneLength, -Math.cos(-coneAngle) * coneLength);
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(coneAngle) * coneLength, -Math.cos(coneAngle) * coneLength);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -coneLength);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
  };
  
  if (!isVisible) return null;
  
  return (
    <div
      ref={containerRef}
      style={{
      position: 'fixed',
      ...(positionTop ? { top: positionTop, bottom: 'auto' } : { bottom: positionBottom, top: 'auto' }),
      left: positionLeft,
      width: `${canvasSize}px`,
      height: `${canvasSize}px`,
      zIndex: 1000,
      pointerEvents: 'none',

      overflow: 'visible',

      transform: positionTransform,
      transformOrigin: 'center bottom',
    }}>
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
      
      {showLabels && (
        <div style={{
          position: 'absolute',
          top: '-25px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#ff4444',
          fontSize: '12px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          textShadow: '0 0 6px rgba(255, 68, 68, 0.8)',
        }}>
          RADAR
        </div>
      )}
      
      {showLabels && (
        <div style={{
          position: 'absolute',
          bottom: '-25px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#ff4444',
          fontSize: '10px',
          fontFamily: 'monospace',
          textShadow: '0 0 6px rgba(255, 68, 68, 0.8)',
        }}>
          {maxRange}m
        </div>
      )}
    </div>
  );
};

export default CockpitRadar;
