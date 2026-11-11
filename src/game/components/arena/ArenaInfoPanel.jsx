import React from 'react';

export default function ArenaInfoPanel({ data, playerPos, clickResult }) {
  const { arena, spawns, combat, planets } = data;
  
  const spawnSep = Math.hypot(
    spawns.p1.x - spawns.p2.x,
    spawns.p1.y - spawns.p2.y,
    spawns.p1.z - spawns.p2.z
  );
  
  const fmt = (n) => Math.round(n);
  
  return (
    <div
      style={{
        position: 'absolute',
        top: '14px',
        left: '14px',
        background: 'rgba(8,8,20,0.88)',
        color: '#aabbcc',
        fontSize: '11px',
        padding: '12px 16px',
        border: '1px solid #1a2a3a',
        borderRadius: '4px',
        minWidth: '220px',
        lineHeight: '1.7',
        fontFamily: "'Courier New', monospace",
        zIndex: 10
      }}
    >
      <div
        style={{
          color: '#8899aa',
          fontSize: '13px',
          fontWeight: 'bold',
          marginBottom: '8px',
          letterSpacing: '1px'
        }}
      >
        ASTRA ARENA
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#445566' }}>Size</span>
          <span style={{ color: '#00ccff' }}>{arena.x}×{arena.y}×{arena.z}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#445566' }}>Spawn sep</span>
          <span style={{ color: '#00ccff' }}>{Math.round(spawnSep)} units</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#445566' }}>Bullet range</span>
          <span style={{ color: '#00ccff' }}>{combat.bulletRange} units</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#445566' }}>Dodge reach</span>
          <span style={{ color: '#00ccff' }}>{combat.dodgeReach} units</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#445566' }}>Planets</span>
          <span style={{ color: '#00ccff' }}>{planets.length}</span>
        </div>
      </div>
      
      <div style={{ borderTop: '1px solid #1a2a3a', paddingTop: '10px' }}>
        <div
          style={{
            color: '#445566',
            fontSize: '9px',
            letterSpacing: '2px',
            marginBottom: '6px',
            textTransform: 'uppercase'
          }}
        >
          Your Position
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#445566' }}>Coords</span>
          <span style={{ color: '#00ff88' }}>
            {playerPos ? `${fmt(playerPos.x)}, ${fmt(playerPos.y)}, ${fmt(playerPos.z)}` : '—'}
          </span>
        </div>
        
        {clickResult && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#445566' }}>To enemy</span>
              <span style={{ color: '#ff4466' }}>
                {clickResult.distToEnemy}u · {clickResult.timeToEnemyNormal}s
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#445566' }}>To center</span>
              <span style={{ color: '#00ccff' }}>{clickResult.distToCenter}u</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#445566' }}>Nearest wall</span>
              <span style={{ color: '#00ccff' }}>{clickResult.nearestWall}u</span>
            </div>
            {clickResult.nearestPlanet && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#445566' }}>Near planet</span>
                <span style={{ color: '#cc88ff' }}>
                  {clickResult.nearestPlanet.name} ({clickResult.nearestPlanet.distance}u)
                </span>
              </div>
            )}
          </>
        )}
      </div>
      
      <div style={{ marginTop: '10px', fontSize: '9px', color: '#334455' }}>
        Click arena floor to move
      </div>
    </div>
  );
}
