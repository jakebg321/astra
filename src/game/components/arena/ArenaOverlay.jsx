import React from 'react';

export default function ArenaOverlay({ result }) {
  if (!result) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '14px',
        right: '14px',
        background: 'rgba(8,8,20,0.92)',
        color: '#aabbcc',
        fontSize: '11px',
        padding: '10px 14px',
        border: '1px solid #1a2a3a',
        borderRadius: '4px',
        minWidth: '240px',
        lineHeight: '1.85',
        fontFamily: "'Courier New', monospace"
      }}
    >
      <div
        style={{
          color: '#445566',
          fontSize: '9px',
          letterSpacing: '2px',
          marginBottom: '6px',
          textTransform: 'uppercase'
        }}
      >
        Tactical Read
      </div>
      
      <div
        style={{
          color: result.vcol,
          fontWeight: 'bold',
          marginBottom: '6px',
          fontSize: '12px'
        }}
      >
        {result.verdict}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px' }}>
        <span style={{ color: '#556677' }}>One-dodge cover</span>
        <span style={{ color: result.dodgePlanet ? '#44aaff' : '#ff5555' }}>
          {result.dodgePlanet
            ? `YES — ${result.dodgePlanet.name} (${result.dodgePlanet.distance}u)`
            : 'NO — nothing in range'}
        </span>
      </div>
      
      {result.retreatPlanet && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px' }}>
          <span style={{ color: '#556677' }}>Retreat to</span>
          <span style={{ color: '#00ffff' }}>
            {result.retreatPlanet.name} ({result.retreatPlanet.distance}u)
          </span>
        </div>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px' }}>
        <span style={{ color: '#556677' }}>Covered from enemy</span>
        <span style={{ color: result.coveredFromEnemy ? '#00ff88' : '#ff4400' }}>
          {result.coveredFromEnemy ? 'YES' : 'NO — exposed'}
        </span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px' }}>
        <span style={{ color: '#556677' }}>To enemy spawn</span>
        <span style={{ color: '#ff4466' }}>
          {result.distToEnemy}u · {result.timeToEnemyNormal}s/{result.timeToEnemyBoost}s
        </span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px' }}>
        <span style={{ color: '#556677' }}>Avg lane</span>
        <span style={{ color: '#00ccff' }}>{result.avgLane} units</span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px' }}>
        <span style={{ color: '#556677' }}>Exposure score</span>
        <span style={{ color: '#00ccff' }}>{result.exposure}%</span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px' }}>
        <span style={{ color: '#556677' }}>Bullet range</span>
        <span style={{ color: '#00ccff' }}>{result.bulletRange} units</span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px' }}>
        <span style={{ color: '#556677' }}>Dodge reach</span>
        <span style={{ color: '#00ccff' }}>{result.dodgeReach} units</span>
      </div>
    </div>
  );
}
