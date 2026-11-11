import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Target, 
  Settings, 
  LogOut, 
  Crosshair,
  Gauge,
  Zap,
  Shield
} from 'lucide-react';
import { Z_INDEX } from '../constants/zIndex';
import { getWebSocketInstance } from '../services/UnifiedWebSocket';
import DamageVisualization from './DamageVisualization';
import PortalAbilityUI from './PortalAbilityUI';
import { getSpeedPerceptionFactor } from '../utils/speedPerception.js';

const GameHUD = ({ playerHealth = 100, enemyHealth = 100, playerBoost = 100, playerBoostState = { boost: 100, isBoosting: false }, onLeaveGame, currentTarget = null, portalAbility = null }) => {
  const prevPlayerHealth = useRef(playerHealth);
  const prevEnemyHealth = useRef(enemyHealth);
  const [combatState, setCombatState] = useState('safe');
  
  useEffect(() => {
    if (playerHealth !== prevPlayerHealth.current) {
      prevPlayerHealth.current = playerHealth;
      
      if (playerHealth < prevPlayerHealth.current) {
        setCombatState('combat');

        setTimeout(() => setCombatState('safe'), 3000);
      }
      
      if (playerHealth <= 25) {
        setCombatState('critical');
      }
    }
    if (enemyHealth !== prevEnemyHealth.current) {
      prevEnemyHealth.current = enemyHealth;
    }
  }, [playerHealth, enemyHealth]);
  const [showEscapeMenu, setShowEscapeMenu] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [altitude, setAltitude] = useState(0);
  const [fps, setFps] = useState(60);
  const [showHitIndicator, setShowHitIndicator] = useState(false);
  const [showBoundaryWarning, setShowBoundaryWarning] = useState(false);
  const [boundaryWarning, setBoundaryWarning] = useState(false);
  const [boundaryIntensity, setBoundaryIntensity] = useState(0);
  const [isBoosting, setIsBoosting] = useState(false);
  const [weaponHeat, setWeaponHeat] = useState(0);
  const [isOverheated, setIsOverheated] = useState(false);
  const [screenShake, setScreenShake] = useState({ x: 0, y: 0 });

  const lastDebugTime = useRef(0);
  const shakeRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });


  useEffect(() => {
    const interval = setInterval(() => {
      const pos = window.getShipPosition?.();
      const y = Number.isFinite(pos?.y) ? pos.y : 0;
      setAltitude((prev) => (Math.abs(prev - y) >= 0.5 ? y : prev));
    }, 250);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {

    setFps(60);
  }, []);


  const METER_THEMES = {
    green: { a: '#00ffff', b: '#00b3ff', glow: 'rgba(0,255,255,0.55)', text: '#7ffcff' },
    red: { a: '#ff2d55', b: '#ff6b00', glow: 'rgba(255,80,40,0.55)', text: '#ffb199' },
    boost: { a: '#ffb300', b: '#ff6b00', glow: 'rgba(255,150,0,0.55)', text: '#ffd27a' },
  };
  const HealthBar = ({ health, label, color = "green" }) => {
    const value = Math.max(0, Math.min(100, health || 0));
    const t = METER_THEMES[color] || METER_THEMES.green;
    const slant = 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)';
    return (
      <div style={{ width: 220 }}>
        <div className="flex items-baseline justify-between mb-1" style={{ fontFamily: 'Orbitron, monospace' }}>
          <span style={{ color: t.text, fontSize: 12, fontWeight: 700, letterSpacing: '0.28em' }}>{label}</span>
          <span style={{ color: '#ffffff', fontSize: 13, fontWeight: 700, textShadow: `0 0 6px ${t.glow}` }}>{Math.round(value)}</span>
        </div>
        <div style={{ position: 'relative', height: 14, clipPath: slant, background: 'rgba(255,255,255,0.07)' }}>
          <div
            style={{
              position: 'absolute', inset: 0, width: `${value}%`,
              background: `linear-gradient(90deg, ${t.a}, ${t.b})`,
              boxShadow: `0 0 12px ${t.glow}`,
              transition: 'width 0.3s ease-out',
            }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, transparent 0 9px, rgba(8,8,16,0.85) 9px 11px)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 4, background: 'rgba(255,255,255,0.25)' }} />
        </div>
      </div>
    );
  };


  const StatusDisplay = ({ icon: Icon, label, value, unit = "" }) => (
    <div
      className="flex items-center gap-3 px-3 py-2"
      style={{
        contain: 'layout style',
        willChange: 'auto',
        background: 'linear-gradient(90deg, rgba(0,255,255,0.10), rgba(6,8,18,0.75))',
        borderLeft: '2px solid #00ffff',
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
        minWidth: 120,
      }}
    >
      <Icon size={16} style={{ color: '#00ffff' }} />
      <div className="flex flex-col" style={{ fontFamily: 'Orbitron, monospace' }}>
        <span style={{ color: '#7ffcff', fontSize: 10, letterSpacing: '0.25em', fontWeight: 700 }}>{label}</span>
        <span style={{ color: '#ffffff', fontSize: 15, fontWeight: 700 }}>{value}<span style={{ color: '#ff9a4d', fontSize: 11 }}>{unit}</span></span>
      </div>
    </div>
  );

  useEffect(() => {
    const handleHit = () => {
      setShowHitIndicator(true);
      setTimeout(() => setShowHitIndicator(false), 500);
    };
    
    window.addEventListener('player-hit-confirmed', handleHit);
    return () => window.removeEventListener('player-hit-confirmed', handleHit);
  }, []);

  useEffect(() => {
    let lastWarningTime = 0;
    const handleBoundaryWarning = (event) => {

      const now = Date.now();
      if (now - lastWarningTime < 500) return;
      lastWarningTime = now;
      
      setBoundaryWarning(true);
      setBoundaryIntensity(event.detail?.proximity || 1);
      
      setTimeout(() => {
        setBoundaryWarning(false);
        setBoundaryIntensity(0);
      }, 2000);
    };
    
    window.addEventListener('boundary-warning', handleBoundaryWarning);
    return () => window.removeEventListener('boundary-warning', handleBoundaryWarning);
  }, []);

  useEffect(() => {
    const handleBoostState = (event) => {
      setIsBoosting(event.detail?.isBoosting || false);
    };
    
    window.addEventListener('boost-state-change', handleBoostState);
    return () => window.removeEventListener('boost-state-change', handleBoostState);
  }, []);



  useEffect(() => {
    const handleWeaponHeat = (event) => {
      setWeaponHeat(event.detail?.weaponHeat || 0);
      setIsOverheated(event.detail?.isOverheated || false);
    };
    
    window.addEventListener('weapon-heat-update', handleWeaponHeat);
    return () => window.removeEventListener('weapon-heat-update', handleWeaponHeat);
  }, []);


  useEffect(() => {
    const handleSpeedUpdate = (event) => {
      const newSpeed = event.detail?.speed || 0;
      setSpeed(newSpeed);
      

      const speedFactor = getSpeedPerceptionFactor(newSpeed, isBoosting, { threshold: 14 });
      
      if (speedFactor > 0) {
        const shakeIntensity = speedFactor * 2;
        const nextTargetX = (Math.random() - 0.5) * shakeIntensity;
        const nextTargetY = (Math.random() - 0.5) * shakeIntensity;
        shakeRef.current.targetX = (shakeRef.current.targetX * 0.55) + (nextTargetX * 0.45);
        shakeRef.current.targetY = (shakeRef.current.targetY * 0.55) + (nextTargetY * 0.45);
      } else {
        shakeRef.current.targetX = 0;
        shakeRef.current.targetY = 0;
      }
    };
    
    window.addEventListener('speed-update', handleSpeedUpdate);
    return () => window.removeEventListener('speed-update', handleSpeedUpdate);
  }, [isBoosting]);


  useEffect(() => {
    const animateShake = () => {
      shakeRef.current.x += (shakeRef.current.targetX - shakeRef.current.x) * 0.14;
      shakeRef.current.y += (shakeRef.current.targetY - shakeRef.current.y) * 0.14;
      
      setScreenShake({
        x: shakeRef.current.x,
        y: shakeRef.current.y
      });
      
      requestAnimationFrame(animateShake);
    };
    
    const id = requestAnimationFrame(animateShake);
    return () => cancelAnimationFrame(id);
  }, []);


  return (
    <>

      <div 
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2"
        style={{
          zIndex: Z_INDEX.HUD_BASE,
          contain: 'layout style',
          willChange: 'auto',
          backfaceVisibility: 'hidden',
          transform: `translate(-50%, 0) translate(${screenShake.x}px, ${screenShake.y}px)`
        }}
      >
        <div className="astra-hud-panel px-7 py-3 flex items-center gap-7">
          <HealthBar health={playerHealth} label="PILOT" color="green" />
          <div style={{ width: 1, height: 30, background: "linear-gradient(180deg, transparent, rgba(0,255,255,0.45), transparent)" }} />
          <HealthBar health={enemyHealth} label="ENEMY" color="red" />
          <div style={{ width: 1, height: 30, background: "linear-gradient(180deg, transparent, rgba(0,255,255,0.45), transparent)" }} />
          
          {currentTarget && (
            <>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <Target size={16} className="text-green-400" />
                  <span className="text-sm font-mono text-gray-300">TARGET</span>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-green-400">{currentTarget.name}</div>
                  <div className="text-xs text-yellow-400">{currentTarget.distance}m</div>
                </div>
              </div>
              <div style={{ width: 1, height: 30, background: "linear-gradient(180deg, transparent, rgba(0,255,255,0.45), transparent)" }} />
            </>
          )}
          <HealthBar health={playerBoostState.boost} label="BOOST" color="boost" />
        </div>
      </div>


      <div 
        className="absolute top-20 left-4"
        style={{
          zIndex: Z_INDEX.HUD_BASE,
          contain: 'layout style',
          willChange: 'auto'
        }}
      >
        <div className="space-y-2">
          <StatusDisplay icon={Gauge} label="SPEED" value={speed.toFixed(0)} unit=" KPH" />
          <StatusDisplay icon={Target} label="ALT" value={altitude.toFixed(0)} unit=" M" />
        </div>
      </div>


      <div 
        className="absolute bottom-4 right-4"
        style={{
          zIndex: Z_INDEX.HUD_BUTTONS,
          contain: 'layout style',
          willChange: 'auto',
          transform: `translate(${screenShake.x}px, ${screenShake.y}px)`
        }}
      >
        <div className="flex items-end gap-4">
          
          <button
            onClick={() => setShowEscapeMenu(!showEscapeMenu)}
            className="tactical-btn p-3 hover:scale-105 transition-transform"
          >
            <Settings size={20} />
          </button>

          <button
            onClick={onLeaveGame}
            className="bg-gradient-to-r from-red-600/80 to-red-700/80 hover:from-red-500 hover:to-red-600 border border-red-500/50 text-white font-bold p-3 transition-all tactical-btn hover:scale-105"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>



      <div 
        className="absolute top-1/2 right-4"
        style={{
          zIndex: Z_INDEX.HUD_PANELS,
          contain: 'layout style',
          willChange: 'auto'
        }}
      >
        <div className="space-y-2">
          {playerHealth < 30 && (
            <div className="hud-panel p-3 bg-red-900/50 border-red-500/50">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-400" />
                <span className="text-red-300 font-mono text-sm">CRITICAL DAMAGE</span>
              </div>
            </div>
          )}
          

          {playerBoostState.boost < 20 && (
            <div className="hud-panel p-3 bg-yellow-900/50 border-yellow-500/50">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-300 font-mono text-sm">LOW BOOST</span>
              </div>
            </div>
          )}
        </div>
      </div>


      {showBoundaryWarning && (
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 animate-pulse">
          <div className="text-red-500 text-2xl font-bold bg-black/50 px-4 py-2 rounded border border-red-500">
            ⚠️ BOUNDARY WARNING ⚠️
          </div>
        </div>
      )}

      {showHitIndicator && (
        <div 
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ zIndex: Z_INDEX.HUD_BASE + 10 }}
        >
          <div className="text-red-500 font-bold text-4xl animate-pulse">
            HIT!
          </div>
        </div>
      )}


      {boundaryWarning && (
        <>
          <div 
            className="fixed inset-0 pointer-events-none animate-pulse"
            style={{
              zIndex: Z_INDEX.HUD_BASE + 20,
              backgroundColor: `rgba(255, 0, 0, ${boundaryIntensity * 0.3})`,
              border: `4px solid rgba(255, 0, 0, ${boundaryIntensity})`
            }}
          />
          
          <div className="fixed top-1/3 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="text-red-500 text-6xl font-bold text-center">
              ⚠️ BOUNDARY! ⚠️
            </div>
            <div className="text-red-400 text-2xl font-bold text-center mt-2">
              RETURN TO COMBAT ZONE
            </div>
          </div>
        </>
      )}


      {showEscapeMenu && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center" style={{ zIndex: Z_INDEX.HUD_BASE + 50 }}>
          <div className="bg-slate-800/95 border border-cyan-500/30 rounded-lg p-6 w-full max-w-lg mx-4 space-y-6">
            
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Game Menu</h2>
              <p className="text-gray-400">Adjust settings or leave game</p>
            </div>


            <CompleteSettingsPanel />

            <div className="space-y-3 pt-4 border-t border-gray-700">
              <button
                onClick={() => setShowEscapeMenu(false)}
                className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                Resume Game
              </button>
              
              <button
                onClick={onLeaveGame}
                className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                Leave Game
              </button>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-400 text-center">
                Press ESC again to close • Settings auto-save
              </p>
            </div>
          </div>
        </div>
      )}

      
      {portalAbility && <PortalAbilityUI portalAbility={portalAbility} />}

    </>
  );
};


const CompleteSettingsPanel = () => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-cyan-300">
          Mouse Sensitivity: {(parseFloat(localStorage.getItem('mouseSensitivity')) || 1.0).toFixed(1)}
        </label>
        <input
          type="range"
          min="0.1"
          max="3.0"
          step="0.1"
          defaultValue={parseFloat(localStorage.getItem('mouseSensitivity')) || 1.0}
          onChange={(e) => {
            localStorage.setItem('mouseSensitivity', e.target.value);
            e.target.parentElement.querySelector('label').textContent = `Mouse Sensitivity: ${parseFloat(e.target.value).toFixed(1)}`;
          }}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>


      <div className="space-y-2">
        <label className="block text-sm font-medium text-cyan-300">
          Camera Distance: {(parseFloat(localStorage.getItem('cameraDistance')) || 25).toFixed(1)}
        </label>
        <input
          type="range"
          min="8"
          max="80"
          step="0.5"
          defaultValue={parseFloat(localStorage.getItem('cameraDistance')) || 25}
          onChange={(e) => {
            localStorage.setItem('cameraDistance', e.target.value);
            e.target.parentElement.querySelector('label').textContent = `Camera Distance: ${parseFloat(e.target.value).toFixed(1)}`;
          }}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>


      <div className="border-t border-purple-600/30 pt-4 mt-4">
        <h3 className="text-lg font-semibold text-purple-300 mb-3">🎮 Controller Settings</h3>
      </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-purple-300">
                    Look Sensitivity: {Math.round((parseFloat(localStorage.getItem('astra_controller_lookSensitivity')) || 4.4) * 100)}%
                  </label>
                  <input
                    type="range"
                    min="1.0"
                    max="8.0"
                    step="0.2"
                    defaultValue={parseFloat(localStorage.getItem('astra_controller_lookSensitivity')) || 4.4}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (window.controllerManager) {
                        window.controllerManager.updateSettings({ lookSensitivity: value });
                      }
                      e.target.parentElement.querySelector('label').textContent = `Look Sensitivity: ${Math.round(value * 100)}%`;
                    }}
                    className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="text-xs text-gray-400">How fast you turn/look around</div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-purple-300">
                    Movement Sensitivity: {Math.round((parseFloat(localStorage.getItem('astra_controller_movementSensitivity')) || 1.8) * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    defaultValue={parseFloat(localStorage.getItem('astra_controller_movementSensitivity')) || 1.8}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (window.controllerManager) {
                        window.controllerManager.updateSettings({ movementSensitivity: value });
                      }
                      e.target.parentElement.querySelector('label').textContent = `Movement Sensitivity: ${Math.round(value * 100)}%`;
                    }}
                    className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="text-xs text-gray-400">How responsive your movement is</div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-purple-300">
                    Stick Dead Zone: {Math.round((parseFloat(localStorage.getItem('astra_controller_deadZone')) || 0.15) * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.3"
                    step="0.05"
                    defaultValue={parseFloat(localStorage.getItem('astra_controller_deadZone')) || 0.15}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (window.controllerManager) {
                        window.controllerManager.updateSettings({ deadZone: value });
                      }
                      e.target.parentElement.querySelector('label').textContent = `Stick Dead Zone: ${Math.round(value * 100)}%`;
                    }}
                    className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="text-xs text-gray-400">Prevents stick drift and accidental input</div>
                </div>



      <div className="space-y-2">
        <label className="block text-sm font-medium text-cyan-300">
          Movement Speed: {Math.round((parseFloat(localStorage.getItem('globalSpeedMultiplier')) || 1.0) * 100)}%
        </label>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          defaultValue={parseFloat(localStorage.getItem('globalSpeedMultiplier')) || 1.0}
          onChange={(e) => {
            const value = parseFloat(e.target.value);
            localStorage.setItem('globalSpeedMultiplier', value);
            e.target.parentElement.querySelector('label').textContent = `Movement Speed: ${Math.round(value * 100)}%`;

            window.globalSpeedMultiplier = value;
            if (window.gameSettings) {
              window.gameSettings.globalSpeedMultiplier = value;
            }

            if (window.gameState) {
              window.gameState.globalSpeedMultiplier = value;
            }
          }}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-cyan-300">
          Boost Speed: {Math.round((parseFloat(localStorage.getItem('globalBoostMultiplier')) || 1.0) * 100)}%
        </label>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          defaultValue={parseFloat(localStorage.getItem('globalBoostMultiplier')) || 1.0}
          onChange={(e) => {
            const value = parseFloat(e.target.value);
            localStorage.setItem('globalBoostMultiplier', value);
            e.target.parentElement.querySelector('label').textContent = `Boost Speed: ${Math.round(value * 100)}%`;

            window.globalBoostMultiplier = value;
            if (window.gameSettings) {
              window.gameSettings.globalBoostMultiplier = value;
            }

            if (window.gameState) {
              window.gameState.globalBoostMultiplier = value;
            }
          }}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-cyan-300">
          Target FPS: {localStorage.getItem('targetFPS') || 'Unlimited'}
        </label>
        <select
          defaultValue={localStorage.getItem('targetFPS') || 'unlimited'}
          onChange={(e) => {
            const fps = e.target.value;
            localStorage.setItem('targetFPS', fps);
            
            if (window.frameLimiter) {
              if (fps === 'unlimited') {
                window.frameLimiter.isActive = false;
                console.log('Frame limiter disabled (unlimited FPS)');
              } else {
                window.frameLimiter.targetFPS = parseInt(fps);
                window.frameLimiter.targetFrameTime = 1000 / parseInt(fps);
                window.frameLimiter.isActive = true;
                console.log(`Frame limiter set to ${fps} FPS`);
              }
            }
          }}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
        >
          <option value="30">30 FPS (Ultra Performance)</option>
          <option value="45">45 FPS (High Performance)</option>
          <option value="60">60 FPS (Balanced)</option>
          <option value="75">75 FPS (Smooth)</option>
          <option value="90">90 FPS (High Refresh)</option>
          <option value="120">120 FPS (Gaming)</option>
          <option value="144">144 FPS (Competitive)</option>
          <option value="unlimited">Unlimited (Use with care)</option>
        </select>
      </div>
      

      <div className="space-y-2">
        <label className="block text-sm font-medium text-cyan-300">
          Min Camera Distance: {(parseFloat(localStorage.getItem('cameraMinDistance')) || 15).toFixed(1)}
        </label>
        <input
          type="range"
          min="8"
          max="25"
          step="0.5"
          defaultValue={parseFloat(localStorage.getItem('cameraMinDistance')) || 15}
          onChange={(e) => {
            localStorage.setItem('cameraMinDistance', e.target.value);
            e.target.parentElement.querySelector('label').textContent = `Min Camera Distance: ${parseFloat(e.target.value).toFixed(1)}`;
          }}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-cyan-300">
          Max Camera Distance: {(parseFloat(localStorage.getItem('cameraMaxDistance')) || 40).toFixed(1)}
        </label>
        <input
          type="range"
          min="20"
          max="80"
          step="1"
          defaultValue={parseFloat(localStorage.getItem('cameraMaxDistance')) || 40}
          onChange={(e) => {
            localStorage.setItem('cameraMaxDistance', e.target.value);
            e.target.parentElement.querySelector('label').textContent = `Max Camera Distance: ${parseFloat(e.target.value).toFixed(1)}`;
          }}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>

      <div className="space-y-3 pt-3 border-t border-gray-600">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-cyan-300">Camera Momentum</label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              defaultChecked={localStorage.getItem('cameraMomentum') === 'true'}
              onChange={(e) => localStorage.setItem('cameraMomentum', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-cyan-300">Show FPS</label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              defaultChecked={localStorage.getItem('showFPS') === 'true'}
              onChange={(e) => localStorage.setItem('showFPS', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
};


export default GameHUD;
