import React, { useState, useEffect, useRef } from 'react';

const DashCooldownHUD = () => {
  const [cooldowns, setCooldowns] = useState({ left: 0, right: 0, up: 0, down: 0 });
  const rafRef = useRef();

  useEffect(() => {
    const update = () => {
      const dodge = window.gameMovementState?.dodge;
      if (dodge) {
        setCooldowns({
          left: Math.max(0, dodge.cooldownLeft || 0),
          right: Math.max(0, dodge.cooldownRight || 0),
          up: Math.max(0, dodge.cooldownUp || 0),
          down: Math.max(0, dodge.cooldownDown || 0),
        });
      }
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const duration = window.gameMovementState?.dodge?.cooldownDuration || 2000;

  const Pip = ({ cd, rotation, label }) => {
    const ready = cd <= 0;
    const progress = ready ? 1 : 1 - (cd / duration);

    return (
      <div style={{
        position: 'relative',
        width: 20,
        height: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg width="20" height="20" style={{ position: 'absolute' }}>
          <circle cx="10" cy="10" r="8" fill="none"
            stroke={ready ? 'rgba(100,180,255,0.8)' : 'rgba(255,255,255,0.15)'}
            strokeWidth="2"
          />
          {!ready && (
            <circle cx="10" cy="10" r="8" fill="none"
              stroke="rgba(100,180,255,0.5)"
              strokeWidth="2"
              strokeDasharray={`${progress * 50.3} 50.3`}
              strokeDashoffset="0"
              transform="rotate(-90 10 10)"
              strokeLinecap="round"
            />
          )}
        </svg>
        <span style={{
          fontSize: 10,
          color: ready ? 'rgba(100,180,255,0.9)' : 'rgba(255,255,255,0.3)',
          transform: `rotate(${rotation}deg)`,
          lineHeight: 1,
          userSelect: 'none',
        }}>
          ▲
        </span>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '18%',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      pointerEvents: 'none',
      zIndex: 9998,
      opacity: 0.85,
    }}>
      <Pip cd={cooldowns.up} rotation={0} label="Q" />
      <div style={{ display: 'flex', gap: 16 }}>
        <Pip cd={cooldowns.left} rotation={-90} label="A" />
        <Pip cd={cooldowns.right} rotation={90} label="D" />
      </div>
      <Pip cd={cooldowns.down} rotation={180} label="E" />
    </div>
  );
};

export default DashCooldownHUD;
