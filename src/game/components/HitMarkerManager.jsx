import React, { useEffect } from 'react';
import { getWebSocketInstance } from '../services/UnifiedWebSocket';
import { gameStatsTracker } from '../services/GameStatsTracker';

export function HitMarkerManager() {
  useEffect(() => {
    const ws = getWebSocketInstance();
    
    if (!ws) {
      return;
    }
    
    const handlePlayerHit = (data) => {
      const playerId = ws.gameStateManager?.playerId;

      const isOurHit = data.attackerId === playerId || 
                       data.attackerId?.trim() === playerId?.trim() ||
                       data.attackerId?.toString() === playerId?.toString();
      
      if (isOurHit) {
        const { damage } = data;
        
        gameStatsTracker.recordHit(damage);

        window.dispatchEvent(new Event('player-hit-confirmed'));
      } else if (data.targetId === playerId) {
        gameStatsTracker.recordDamageReceived(data.damage);
      }
    };
    
    ws.on('playerHit', handlePlayerHit);
    
    return () => {
      ws.off('playerHit', handlePlayerHit);
    };
  }, []);

  return null;
} 
