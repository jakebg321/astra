import React from 'react';
import { Html } from '@react-three/drei';

export default function PlanetLabels({ planets }) {
  return (
    <>
      {planets.map((planet) => {
        const isCenter = planet.name === 'Astra Center';
        const displayR = planet.visualRadius ?? planet.radius;
        const pos = [planet.center.x, planet.center.y + displayR + 40, planet.center.z];
        const yTag = planet.center.y !== 0 
          ? ` y${planet.center.y > 0 ? '+' : ''}${Math.round(planet.center.y)}` 
          : '';
        
        return (
          <Html
            key={planet.name}
            position={pos}
            center
            distanceFactor={10}
            style={{
              pointerEvents: 'none',
              userSelect: 'none'
            }}
          >
            <div
              style={{
                color: isCenter ? '#ff88ff' : '#ddaaff',
                fontSize: '11px',
                fontFamily: "'Courier New', monospace",
                textShadow: isCenter 
                  ? '0 0 8px #ff44ff, 0 1px 3px #000'
                  : '0 0 8px #8844cc, 0 1px 3px #000',
                whiteSpace: 'nowrap',
                transform: 'translate(-50%, -100%)',
                padding: '2px 6px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '2px'
              }}
            >
              {planet.name}{yTag}
            </div>
          </Html>
        );
      })}
    </>
  );
}
