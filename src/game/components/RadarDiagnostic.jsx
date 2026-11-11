import React, { useEffect, useState } from 'react';
import { getWebSocketInstance } from '../services/UnifiedWebSocket';

const RadarDiagnostic = ({ shipPosition, shipRotation, isVisible = false }) => {
  const [diagnostic, setDiagnostic] = useState({});
  
  useEffect(() => {
    if (!isVisible || !shipPosition) return;
    
    const ws = getWebSocketInstance();
    const otherPlayers = ws?.getOtherPlayers();
    const localPlayerId = ws?.gameStateManager?.playerId;
    
    if (!otherPlayers || !localPlayerId) return;
    
    const allIds = Object.keys(otherPlayers);
    const localPlayerBaseName = localPlayerId ? localPlayerId.split('_')[0] : null;
    
    let enemy = null;
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
        enemy = player;
      }
    }
    
    if (!enemy) return;
    
    const dx = enemy.position.x - shipPosition.x;
    const dz = enemy.position.z - shipPosition.z;

    const worldAngle1 = Math.atan2(dx, dz) * 180 / Math.PI;
    const worldAngle2 = Math.atan2(dx, -dz) * 180 / Math.PI;
    const worldAngle3 = Math.atan2(-dx, dz) * 180 / Math.PI;
    const worldAngle4 = Math.atan2(-dx, -dz) * 180 / Math.PI;
    
    const playerYawDeg = (shipRotation?.y || 0) * 180 / Math.PI;

    const forward = {
      x: Math.sin(shipRotation?.y || 0),
      z: -Math.cos(shipRotation?.y || 0)
    };
    const right = {
      x: Math.cos(shipRotation?.y || 0),
      z: Math.sin(shipRotation?.y || 0)
    };
    
    const dotForward = dx * forward.x + dz * forward.z;
    const dotRight = dx * right.x + dz * right.z;
    
    setDiagnostic({
      playerPos: `(${Math.round(shipPosition.x)}, ${Math.round(shipPosition.z)})`,
      enemyPos: `(${Math.round(enemy.position.x)}, ${Math.round(enemy.position.z)})`,
      delta: `dx: ${Math.round(dx)}, dz: ${Math.round(dz)}`,
      playerYaw: playerYawDeg.toFixed(1) + '°',
      angles: {
        'atan2(dx, dz)': worldAngle1.toFixed(1) + '°',
        'atan2(dx, -dz)': worldAngle2.toFixed(1) + '°',
        'atan2(-dx, dz)': worldAngle3.toFixed(1) + '°',
        'atan2(-dx, -dz)': worldAngle4.toFixed(1) + '°',
      },
      relative: {
        'angle1 - yaw': (worldAngle1 - playerYawDeg).toFixed(1) + '°',
        'angle2 - yaw': (worldAngle2 - playerYawDeg).toFixed(1) + '°',
        'angle3 - yaw': (worldAngle3 - playerYawDeg).toFixed(1) + '°',
        'angle4 - yaw': (worldAngle4 - playerYawDeg).toFixed(1) + '°',
      },
      visual: {
        forward: dotForward.toFixed(0),
        right: dotRight.toFixed(0),
        description: dotForward > 0 ? 'In front' : 'Behind',
        side: dotRight > 0 ? 'Right' : 'Left'
      }
    });
  }, [shipPosition, shipRotation, isVisible]);
  
  if (!isVisible) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: '100px',
      left: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      border: '2px solid #00ff00',
      borderRadius: '8px',
      padding: '15px',
      color: '#00ff00',
      fontFamily: 'monospace',
      fontSize: '11px',
      zIndex: 10002,
      maxWidth: '400px'
    }}>
      <h3 style={{ margin: '0 0 10px 0' }}>🔍 Radar Math Diagnostic</h3>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Positions:</strong><br/>
        Player: {diagnostic.playerPos}<br/>
        Enemy: {diagnostic.enemyPos}<br/>
        Delta: {diagnostic.delta}<br/>
        Player Yaw: {diagnostic.playerYaw}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>World Angles (different formulas):</strong><br/>
        {Object.entries(diagnostic.angles || {}).map(([formula, angle]) => (
          <div key={formula}>{formula}: {angle}</div>
        ))}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Relative Angles:</strong><br/>
        {Object.entries(diagnostic.relative || {}).map(([formula, angle]) => (
          <div key={formula}>{formula}: {angle}</div>
        ))}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Visual Check (dot products):</strong><br/>
        Forward dot: {diagnostic.visual?.forward} ({diagnostic.visual?.description})<br/>
        Right dot: {diagnostic.visual?.right} ({diagnostic.visual?.side})<br/>
      </div>
      
      <div style={{ fontSize: '10px', color: '#888', marginTop: '10px' }}>
        The correct formula should show:<br/>
        - 0° when enemy is directly ahead<br/>
        - 90° when enemy is to the right<br/>
        - -90° when enemy is to the left<br/>
        - ±180° when enemy is behind
      </div>
    </div>
  );
};

export default RadarDiagnostic;