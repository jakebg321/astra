import React, { useState, useEffect, useRef } from 'react';

const DASH_DURATION = 450;

const GRADIENTS = {
  left:  'linear-gradient(to right, rgba(80,160,255,0.6), transparent)',
  right: 'linear-gradient(to left, rgba(80,160,255,0.6), transparent)',
  up:    'linear-gradient(to bottom, rgba(80,160,255,0.6), transparent)',
  down:  'linear-gradient(to top, rgba(80,160,255,0.6), transparent)',
};

const POSITIONS = {
  left:  { left: 0, top: 0, width: '15%', height: '100%' },
  right: { right: 0, top: 0, width: '15%', height: '100%' },
  up:    { left: 0, top: 0, width: '100%', height: '15%' },
  down:  { left: 0, bottom: 0, width: '100%', height: '15%' },
};

const DashOverlay = () => {
  const [flash, setFlash] = useState(null);
  const [stealthActive, setStealthActive] = useState(false);
  const [overlayEnabled, setOverlayEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    const effectsEnabled = window.PERFORMANCE_EFFECTS_ENABLED !== false;
    const qualityLevel = window.PERFORMANCE_QUALITY_LEVEL || 'High';
    return effectsEnabled && qualityLevel !== 'Low';
  });
  const lastDodgeRef = useRef({ left: false, right: false, up: false, down: false });
  const styleInjected = useRef(false);

  useEffect(() => {
    if (styleInjected.current) return;
    styleInjected.current = true;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes dashEdgeFlash {
        0%   { opacity: 1; }
        100% { opacity: 0; }
      }
      @keyframes dashStealthIn {
        0%   { opacity: 0; }
        15%  { opacity: 1; }
        85%  { opacity: 1; }
        100% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  useEffect(() => {
    const updateFromPerformance = () => {
      const effectsEnabled = window.PERFORMANCE_EFFECTS_ENABLED !== false;
      const qualityLevel = window.PERFORMANCE_QUALITY_LEVEL || 'High';
      setOverlayEnabled(effectsEnabled && qualityLevel !== 'Low');
    };
    window.addEventListener('performanceSettingsApplied', updateFromPerformance);
    return () => window.removeEventListener('performanceSettingsApplied', updateFromPerformance);
  }, []);

  useEffect(() => {
    let intervalId;
    const check = () => {
      if (!overlayEnabled) {
        setFlash(null);
        setStealthActive(false);
        return;
      }
      const dodge = window.gameMovementState?.dodge;
      if (dodge) {
        const prev = lastDodgeRef.current;
        const anyDodgeNow = dodge.isLeftDodging || dodge.isRightDodging ||
                            dodge.isUpDodging || dodge.isDownDodging;
        const anyDodgePrev = prev.left || prev.right || prev.up || prev.down;

        if (dodge.isLeftDodging && !prev.left) setFlash({ direction: 'left', key: Date.now() });
        if (dodge.isRightDodging && !prev.right) setFlash({ direction: 'right', key: Date.now() });
        if (dodge.isUpDodging && !prev.up) setFlash({ direction: 'up', key: Date.now() });
        if (dodge.isDownDodging && !prev.down) setFlash({ direction: 'down', key: Date.now() });

        if (anyDodgeNow && !anyDodgePrev) {
          setStealthActive(true);
        }

        prev.left = dodge.isLeftDodging;
        prev.right = dodge.isRightDodging;
        prev.up = dodge.isUpDodging;
        prev.down = dodge.isDownDodging;
      }
    };
    intervalId = setInterval(check, 33);
    return () => clearInterval(intervalId);
  }, [overlayEnabled]);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 450);
    return () => clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    if (!stealthActive) return;
    const timer = setTimeout(() => setStealthActive(false), DASH_DURATION + 100);
    return () => clearTimeout(timer);
  }, [stealthActive]);

  return (
    <>

      {overlayEnabled && flash && (
        <div
          key={flash.key}
          style={{
            position: 'fixed',
            ...POSITIONS[flash.direction],
            background: GRADIENTS[flash.direction],
            pointerEvents: 'none',
            zIndex: 9999,
            animation: `dashEdgeFlash 400ms ease-out forwards`,
          }}
        />
      )}


      {overlayEnabled && stealthActive && (
        <div
          key={`stealth-${Date.now()}`}
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 9998,
            animation: `dashStealthIn ${DASH_DURATION}ms ease-in-out forwards`,
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(30,80,180,0.25) 75%, rgba(10,30,80,0.5) 100%)',
            boxShadow: 'inset 0 0 120px 40px rgba(40,100,220,0.15)',
          }}
        >

          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 2,
            background: 'linear-gradient(to right, transparent, rgba(100,180,255,0.6), transparent)',
            animation: `dashEdgeFlash ${DASH_DURATION}ms ease-out forwards`,
          }} />
        </div>
      )}
    </>
  );
};

export default DashOverlay;
