import React from 'react';

const CYAN = '#00ffff';
const ORANGE = '#ff6b00';

const StaticCrosshair = () => (
  <div
    style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 1000,
      pointerEvents: 'none',
      width: '110px',
      height: '110px',
      filter: 'drop-shadow(0 0 4px rgba(0,255,255,0.55))',
    }}
  >
    <svg viewBox="0 0 110 110" width="110" height="110" fill="none">
      <g stroke={CYAN} strokeWidth="2.5" strokeLinecap="square" opacity="0.95">
        <path d="M22 38 V22 H38" />
        <path d="M72 22 H88 V38" />
        <path d="M88 72 V88 H72" />
        <path d="M38 88 H22 V72" />
      </g>

      <g stroke={CYAN} strokeWidth="1.2" opacity="0.55">
        <path d="M43.7 39.6 A17 17 0 0 1 66.3 39.6" />
        <path d="M70.4 43.7 A17 17 0 0 1 70.4 66.3" />
        <path d="M66.3 70.4 A17 17 0 0 1 43.7 70.4" />
        <path d="M39.6 66.3 A17 17 0 0 1 39.6 43.7" />
      </g>
      <g stroke={CYAN} strokeWidth="2" opacity="0.9">
        <line x1="55" y1="6" x2="55" y2="18" />
        <line x1="55" y1="92" x2="55" y2="104" />
        <line x1="6" y1="55" x2="18" y2="55" />
        <line x1="92" y1="55" x2="104" y2="55" />
      </g>
      <path d="M55 51 L59 55 L55 59 L51 55 Z" fill={ORANGE} />
    </svg>
  </div>
);

export default StaticCrosshair;
