import React, { useState, useEffect, useRef } from 'react';
import { Z_INDEX } from '../constants/zIndex';

const BoundaryWarningOverlay = () => {
  const [boundaryProximity, setBoundaryProximity] = useState(0);
  const [flashActive, setFlashActive] = useState(false);
  const [boundaryDirection, setBoundaryDirection] = useState({ x: 0, y: 0, z: 0 });
  const flashTimeoutRef = useRef(null);

  useEffect(() => {
    const handleBoundaryWarning = (event) => {
      const { detail } = event;
      
      if (detail && detail.source === 'server_correction') {

        triggerFlash();
        setBoundaryProximity(1.0);
      } else if (detail && detail.proximity !== undefined) {

        setBoundaryProximity(detail.proximity);
        setBoundaryDirection(detail.direction || { x: 0, y: 0, z: 0 });

        if (detail.proximity > 0.9) {
          triggerFlash();
        }
      }
    };

    const triggerFlash = () => {
      setFlashActive(true);
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
      flashTimeoutRef.current = setTimeout(() => {
        setFlashActive(false);
      }, 200);
    };

    window.addEventListener('boundary-warning', handleBoundaryWarning);

    const fadeInterval = setInterval(() => {
      setBoundaryProximity(prev => Math.max(0, prev - 0.02));
    }, 100);

    return () => {
      window.removeEventListener('boundary-warning', handleBoundaryWarning);
      clearInterval(fadeInterval);
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

  if (boundaryProximity < 0.1 && !flashActive) return null;

  const intensity = Math.min(1, boundaryProximity);
  const glowOpacity = intensity * 0.8;
  const flashOpacity = flashActive ? 0.6 : 0;

  return (
    <>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: Z_INDEX.HUD_BASE + 5,
          background: `radial-gradient(ellipse at center, transparent 60%, rgba(255, 0, 0, ${glowOpacity * 0.3}) 85%, rgba(255, 0, 0, ${glowOpacity}) 100%)`,
          transition: 'background 0.3s ease-out'
        }}
      />

      {intensity > 0.3 && (
        <>
          {boundaryDirection.y > 0 && (
            <div
              className="fixed top-0 left-0 right-0 h-16 pointer-events-none"
              style={{
                zIndex: Z_INDEX.HUD_BASE + 6,
                background: `linear-gradient(to bottom, rgba(255, 0, 0, ${intensity * 0.8}), transparent)`,
                boxShadow: `inset 0 0 50px rgba(255, 0, 0, ${intensity * 0.6})`
              }}
            />
          )}

          {boundaryDirection.y < 0 && (
            <div
              className="fixed bottom-0 left-0 right-0 h-16 pointer-events-none"
              style={{
                zIndex: Z_INDEX.HUD_BASE + 6,
                background: `linear-gradient(to top, rgba(255, 0, 0, ${intensity * 0.8}), transparent)`,
                boxShadow: `inset 0 0 50px rgba(255, 0, 0, ${intensity * 0.6})`
              }}
            />
          )}

          {boundaryDirection.x < 0 && (
            <div
              className="fixed top-0 bottom-0 left-0 w-16 pointer-events-none"
              style={{
                zIndex: Z_INDEX.HUD_BASE + 6,
                background: `linear-gradient(to right, rgba(255, 0, 0, ${intensity * 0.8}), transparent)`,
                boxShadow: `inset 0 0 50px rgba(255, 0, 0, ${intensity * 0.6})`
              }}
            />
          )}

          {boundaryDirection.x > 0 && (
            <div
              className="fixed top-0 bottom-0 right-0 w-16 pointer-events-none"
              style={{
                zIndex: Z_INDEX.HUD_BASE + 6,
                background: `linear-gradient(to left, rgba(255, 0, 0, ${intensity * 0.8}), transparent)`,
                boxShadow: `inset 0 0 50px rgba(255, 0, 0, ${intensity * 0.6})`
              }}
            />
          )}
        </>
      )}

      {flashActive && (
        <div
          className="fixed inset-0 pointer-events-none animate-pulse"
          style={{
            zIndex: Z_INDEX.HUD_BASE + 10,
            backgroundColor: `rgba(255, 0, 0, ${flashOpacity})`,
            transition: 'background-color 0.1s ease-out'
          }}
        />
      )}

      {intensity > 0.5 && (
        <div 
          className="fixed top-1/3 left-1/2 transform -translate-x-1/2 pointer-events-none text-center"
          style={{ zIndex: Z_INDEX.HUD_BASE + 7 }}
        >
          <div 
            className="text-red-500 font-bold animate-pulse"
            style={{
              fontSize: `${Math.min(4, 1 + intensity * 3)}rem`,
              textShadow: '0 0 20px rgba(255, 0, 0, 0.8), 0 0 40px rgba(255, 0, 0, 0.6)',
              filter: 'drop-shadow(0 0 10px rgba(255, 0, 0, 0.8))'
            }}
          >
            ⚠️ BOUNDARY WARNING ⚠️
          </div>
          
          {intensity > 0.8 && (
            <div className="text-red-400 text-xl font-mono mt-2 animate-bounce">
              RETURN TO COMBAT ZONE IMMEDIATELY
            </div>
          )}
        </div>
      )}

      {intensity > 0.2 && (
        <div 
          className="fixed top-20 right-4 pointer-events-none"
          style={{ zIndex: Z_INDEX.HUD_BASE + 7 }}
        >
          <div className="bg-black/80 border border-red-500/70 px-4 py-2 rounded">
            <div className="text-red-400 font-mono text-sm mb-1">BOUNDARY PROXIMITY</div>
            <div className="w-32 h-2 bg-black border border-red-500/50 relative">
              <div 
                className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 transition-all duration-300"
                style={{ width: `${intensity * 100}%` }}
              />
            </div>
            <div className="text-red-300 font-mono text-xs mt-1 text-center">
              {intensity > 0.9 ? 'CRITICAL' : intensity > 0.7 ? 'WARNING' : 'CAUTION'}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BoundaryWarningOverlay;