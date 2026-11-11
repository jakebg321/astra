import React from 'react';

let lastBoostDebugTime = 0;
let lastHeatDebugTime = 0;

const createSegmentedArc = (radius, startAngle, endAngle, segments, flipDirection = false) => {
  const angleStep = (endAngle - startAngle) / segments;
  const gapAngle = 4;
  const segmentPaths = [];
  
  for (let i = 0; i < segments; i++) {
    const segStart = startAngle + (i * angleStep);
    const segEnd = segStart + angleStep - gapAngle;
    
    const startRad = (segStart * Math.PI) / 180;
    const endRad = (segEnd * Math.PI) / 180;

    const x1 = 60 + radius * Math.cos(startRad);
    const y1 = 80 + radius * Math.sin(startRad);
    const x2 = 60 + radius * Math.cos(endRad);
    const y2 = 80 + radius * Math.sin(endRad);

    const largeArcFlag = (segEnd - segStart) > 180 ? 1 : 0;
    const sweepFlag = flipDirection ? 0 : 1;
    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${x2} ${y2}`;
    
    segmentPaths.push({ path, index: i });
  }
  
  return segmentPaths;
};

export const SimplifiedBoostArc = ({ 
  boost = 100, 
  isBoosting = false,
  screenPosition
}) => {

  const safePosition = screenPosition || { 
    x: window.innerWidth / 2, 
    y: window.innerHeight / 2 
  };
  
  const fillPercentage = Math.max(0, Math.min(100, boost));
  const totalSegments = 8;
  const filledSegments = Math.floor((fillPercentage / 100) * totalSegments);

  const segments = createSegmentedArc(55, 155, 205, totalSegments, true);
  
  let strokeColor = "#ffb300";
  
  if (fillPercentage < 10) {
    strokeColor = "#ff5555";
  } else if (fillPercentage < 25) {
    strokeColor = "#ff8855";
  } else if (isBoosting) {
    strokeColor = "#ffd27a";
  }
  
  return (
    <div 
      style={{
        position: 'fixed',
        left: `${window.innerWidth / 2 - 60}px`,
        top: `${window.innerHeight / 2}px`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 5
      }}
    >
      <svg width="100" height="140" viewBox="0 0 120 160">
        {segments.map((segment) => (
          <path
            key={`bg-${segment.index}`}
            d={segment.path}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        ))}
        
        {segments.slice(0, filledSegments).map((segment) => (
          <path
            key={`fill-${segment.index}`}
            d={segment.path}
            fill="none"
            stroke={strokeColor}
            strokeWidth="5"
            strokeLinecap="round"
            style={{
              opacity: isBoosting ? 1 : 0.9
            }}
          />
        ))}
      </svg>
    </div>
  );
};

export const SimplifiedWeaponHeatArc = ({ 
  weaponHeat = 0, 
  maxHeat = 15, 
  isOverheated = false,
  screenPosition
}) => {

  const safePosition = screenPosition || { 
    x: window.innerWidth / 2, 
    y: window.innerHeight / 2 
  };
  
  const fillPercentage = Math.max(0, Math.min(100, (weaponHeat / maxHeat) * 100));
  const totalSegments = 8;
  const filledSegments = Math.floor((fillPercentage / 100) * totalSegments);

  const segments = createSegmentedArc(55, -25, 25, totalSegments, false);
  
  let strokeColor = "#00ffff";
  
  if (isOverheated) {
    strokeColor = "#ff5555";
  } else if (fillPercentage > 70) {
    strokeColor = "#ff4444";
  } else if (fillPercentage > 40) {
    strokeColor = "#ffaa22";
  }
  
  return (
    <div 
      style={{
        position: 'fixed',
        left: `${window.innerWidth / 2 + 60}px`,
        top: `${window.innerHeight / 2}px`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 5
      }}
    >
      <svg width="100" height="140" viewBox="0 0 120 160">
        {segments.map((segment) => (
          <path
            key={`bg-${segment.index}`}
            d={segment.path}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        ))}
        

        {segments.slice(-filledSegments).map((segment) => (
          <path
            key={`fill-${segment.index}`}
            d={segment.path}
            fill="none"
            stroke={strokeColor}
            strokeWidth="5"
            strokeLinecap="round"
            className={isOverheated ? 'overheat-pulse' : ''}
            style={{
              opacity: isOverheated ? 1 : 0.9
            }}
          />
        ))}
      </svg>
    </div>
  );
}; 