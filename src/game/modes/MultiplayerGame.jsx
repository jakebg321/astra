import { isDebugEnabled } from '../utils/debug.js';
import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { motion } from 'framer-motion';
import PlayerController from '../components/PlayerController';
import GameHUD from '../components/GameHUD';
import BulletsRenderer from '../renderers/BulletsRenderer';
import EnvironmentRenderer from '../renderers/EnvironmentRenderer';
import { getWebSocketInstance } from '../services/UnifiedWebSocket';
import { playerStatsService } from '../services/PlayerStatsService';
import { gameStatsTracker } from '../services/GameStatsTracker';
import DebugOverlay from '../components/DebugOverlay';
import { Z_INDEX } from '../constants/zIndex';
import { GAME_CONFIG } from '../config/GameConfig';
import { useCrosshairState } from '../hooks/useCrosshairState';
import { HitMarkerManager } from '../components/HitMarkerManager';
import GameOverScreen from '../components/GameOverScreen';
import BoundaryWarningOverlay from '../components/BoundaryWarningOverlay';
import { BoundaryWithMarkers } from '../components/BoundaryMesh';
import { SimplifiedBoostArc, SimplifiedWeaponHeatArc } from '../components/SimplifiedArcs';
import { HDRSkybox, SkyboxSwitcherUI, useHDRSwitcher } from '../components/SkyboxSwitcher';
import { CameraCapture } from '../components/CameraCapture';
import performanceManager from '../services/PerformanceManager';
import { isTestModeEnabled } from '../debug/TestModeConfig';
import MasterRenderLoopDriver from '../components/MasterRenderLoopDriver';
import AudioControls from '../components/AudioControls';
import CockpitRadar from '../components/CockpitRadar';
import { getAudioManager } from '../services/AudioManager';
import CockpitRadar3D from '../components/CockpitRadar3D';
import RadarDiagnostic from '../components/RadarDiagnostic';
import RadarPositionDebug from '../components/RadarPositionDebug';
import StaticCrosshair from '../components/StaticCrosshair';
import DamageVisualization from '../components/DamageVisualization';
import FixedTargetBrackets from '../components/FixedTargetBrackets';
import ArenaExternalLightRig from '../components/ArenaExternalLightRig';
import PerformanceOverlay from '../components/PerformanceOverlay';
import DashOverlay from '../components/DashOverlay';
import DashCooldownHUD from '../components/DashCooldownHUD';
import CrystalWall from '../components/CrystalWall';
import CrystalWallPreview from '../components/CrystalWallPreview';



const ZLayerDebugger = () => {
  const [showDebug, setShowDebug] = useState(false);
  
  useEffect(() => {
  }, []);
  
  if (!window.MULTIPLAYER_TEST_MODE) return null;
  
  return (
    <div 
      className="fixed bottom-4 right-4 bg-black/80 text-green-400 font-mono text-xs p-2 rounded border border-green-500/50"
      style={{
        zIndex: Z_INDEX.DEBUG_OVERLAY,
        contain: 'layout style',
        willChange: 'auto'
      }}
    >
      <div className="text-green-300 font-bold">🔍 Z-INDEX DEBUG</div>
    </div>
  );
};


const CockpitLiveControls = () => {
  const [cockpitMode, setCockpitMode] = useState(() => 
    localStorage.getItem('tempCockpitMode') === 'true'
  );
  const [globalCockpitMode, setGlobalCockpitMode] = useState(() => 
    localStorage.getItem('globalCockpitMode') === 'true'
  );
  const [forceAllPlayers, setForceAllPlayers] = useState(() => 
    localStorage.getItem('forceAllPlayersCockpit') === 'true'
  );
  const [cockpitTransform, setCockpitTransform] = useState(() => {
    const stored = localStorage.getItem('cockpitTransform');
    return stored ? JSON.parse(stored) : {
      position: { x: 0.00, y: -0.08, z: -0.91 },
      rotation: { x: -3.31, y: -3.1216, z: -3.14 },
      scale: { x: 1.00, y: 1.00, z: -1.00 }
    };
  });

  const toggleCockpitMode = () => {
    if (globalCockpitMode) return;
    const newMode = !cockpitMode;
    setCockpitMode(newMode);
    localStorage.setItem('tempCockpitMode', newMode.toString());
    

    if (!window.lastModeToggle || performance.now() - window.lastModeToggle > 1000) {
      window.lastModeToggle = performance.now();
    }
  };

  const toggleGlobalCockpitMode = () => {
    const newMode = !globalCockpitMode;
    setGlobalCockpitMode(newMode);
    localStorage.setItem('globalCockpitMode', newMode.toString());
    
  };

  const toggleForceAllPlayers = () => {
    const newMode = !forceAllPlayers;
    setForceAllPlayers(newMode);
    localStorage.setItem('forceAllPlayersCockpit', newMode.toString());
    

    if (newMode) {
      setCockpitMode(true);
      localStorage.setItem('tempCockpitMode', 'true');
      setGlobalCockpitMode(true);
      localStorage.setItem('globalCockpitMode', 'true');
    }
    
  };


  useEffect(() => {
    localStorage.setItem('cockpitTransform', JSON.stringify(cockpitTransform));
    

    if (!window.lastCockpitLog || performance.now() - window.lastCockpitLog > 5000) {
      window.lastCockpitLog = performance.now();
    }
  }, [cockpitTransform]);

  const effectiveCockpitMode = forceAllPlayers || globalCockpitMode || cockpitMode;

  return (
    <div className="absolute top-20 left-4 z-[9999] bg-black/90 border border-cyan-500 p-3 text-white font-mono text-xs max-w-sm">
      <div className="mb-3">
        <div className="text-xs text-gray-400 mb-2">Cockpit Mode Status:</div>
        <div className={`px-3 py-2 border text-xs font-bold text-center ${
          effectiveCockpitMode 
            ? 'bg-purple-900 border-purple-500 text-purple-300' 
            : 'bg-gray-900 border-gray-500 text-gray-300'
        }`}>
          {localStorage.getItem('roomForceCockpitMode') === 'true' ? '🚀 ROOM ENFORCED' :
           forceAllPlayers ? '🚀 FORCE ALL PLAYERS' :
           globalCockpitMode ? '🌍 GLOBAL MODE' :
           effectiveCockpitMode ? '👤 PERSONAL CHOICE' : '❌ DISABLED'}
        </div>
      </div>


      {!localStorage.getItem('roomForceCockpitMode') && !forceAllPlayers && !globalCockpitMode && (
        <div className="mb-3">
          <button
            onClick={toggleCockpitMode}
            className={`px-2 py-1 border text-xs w-full ${
              cockpitMode 
                ? 'bg-cyan-900 border-cyan-500 text-cyan-300' 
                : 'bg-gray-900 border-gray-500 text-gray-300'
            }`}
          >
            Personal Cockpit: {cockpitMode ? 'ON' : 'OFF'}
          </button>
        </div>
      )}


      {effectiveCockpitMode && (
        <>
          <div className="mb-3">
            <div className="text-yellow-400 text-xs font-bold">🚀 ASTRA Cockpit</div>
            <div className="text-gray-400 text-xs">Production-ready model</div>
          </div>

          <div className="space-y-2 mb-3">
            <div className="text-yellow-400 text-xs font-bold">Position</div>
            {['x', 'y', 'z'].map(axis => (
              <div key={axis} className="flex items-center gap-2">
                <span className="w-4 text-cyan-300">{axis.toUpperCase()}:</span>
                <input
                  type="range"
                  min={axis === 'z' ? -50 : -25}
                  max={axis === 'z' ? 50 : 25}
                  step="0.1"
                  value={cockpitTransform.position[axis]}
                  onChange={(e) => setCockpitTransform(prev => ({
                    ...prev,
                    position: { ...prev.position, [axis]: parseFloat(e.target.value) }
                  }))}
                  className="flex-1"
                />
                <input
                  type="number"
                  step="0.01"
                  value={cockpitTransform.position[axis]}
                  onChange={(e) => setCockpitTransform(prev => ({
                    ...prev,
                    position: { ...prev.position, [axis]: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-16 bg-gray-800 border border-gray-600 text-white text-xs p-1"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2 mb-3">
            <div className="text-yellow-400 text-xs font-bold">Rotation</div>
            {['x', 'y', 'z'].map(axis => (
              <div key={axis} className="flex items-center gap-2">
                <span className="w-4 text-cyan-300">{axis.toUpperCase()}:</span>
                <input
                  type="range"
                  min="-3.14159"
                  max="3.14159"
                  step="0.01"
                  value={cockpitTransform.rotation[axis]}
                  onChange={(e) => setCockpitTransform(prev => ({
                    ...prev,
                    rotation: { ...prev.rotation, [axis]: parseFloat(e.target.value) }
                  }))}
                  className="flex-1"
                />
                <input
                  type="number"
                  step="0.01"
                  value={cockpitTransform.rotation[axis]}
                  onChange={(e) => setCockpitTransform(prev => ({
                    ...prev,
                    rotation: { ...prev.rotation, [axis]: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-16 bg-gray-800 border border-gray-600 text-white text-xs p-1"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2 mb-3">
            <div className="text-yellow-400 text-xs font-bold">Scale</div>
            {['x', 'y', 'z'].map(axis => (
              <div key={axis} className="flex items-center gap-2">
                <span className="w-4 text-cyan-300">{axis.toUpperCase()}:</span>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="0.1"
                  value={cockpitTransform.scale[axis]}
                  onChange={(e) => setCockpitTransform(prev => ({
                    ...prev,
                    scale: { ...prev.scale, [axis]: parseFloat(e.target.value) }
                  }))}
                  className="flex-1"
                />
                <input
                  type="number"
                  step="0.01"
                  value={cockpitTransform.scale[axis]}
                  onChange={(e) => setCockpitTransform(prev => ({
                    ...prev,
                    scale: { ...prev.scale, [axis]: parseFloat(e.target.value) || 1 }
                  }))}
                  className="w-16 bg-gray-800 border border-gray-600 text-white text-xs p-1"
                />
              </div>
            ))}
          </div>

          <div className="p-2 bg-gray-800 rounded text-xs">
            <div className="text-green-400 font-bold mb-1">Current Values:</div>
            <div>Pos: {cockpitTransform.position.x.toFixed(2)}, {cockpitTransform.position.y.toFixed(2)}, {cockpitTransform.position.z.toFixed(2)}</div>
            <div>Rot: {cockpitTransform.rotation.x.toFixed(2)}, {cockpitTransform.rotation.y.toFixed(4)}, {cockpitTransform.rotation.z.toFixed(2)}</div>
            <div>Scale: {cockpitTransform.scale.x.toFixed(2)}, {cockpitTransform.scale.y.toFixed(2)}, {cockpitTransform.scale.z.toFixed(2)}</div>
          </div>
        </>
      )}
    </div>
  );
};


const MouseLockIndicator = ({ autoLock = false }) => {
  const [isLocked, setIsLocked] = useState(false);
  
  useEffect(() => {
    const checkLock = () => {
      setIsLocked(document.pointerLockElement !== null);
    };
    
    document.addEventListener('pointerlockchange', checkLock);
    

    
    return () => document.removeEventListener('pointerlockchange', checkLock);
  }, [autoLock]);
  
  const handleOverlayClick = () => {
    if (!isLocked) {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.requestPointerLock();
      }
    }
  };
  

  if (isLocked || autoLock) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
      style={{ 
        zIndex: Z_INDEX.MOUSE_LOCK_MODAL,
        contain: 'layout style',
        willChange: 'auto'
      }}
      onClick={handleOverlayClick}
    >
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="text-6xl mb-4">🎯</div>
        <h2 className="text-2xl font-bold text-white mb-2">CLICK TO ENABLE MOUSE CONTROL</h2>
        <p className="text-gray-400">This will lock your mouse to the game window</p>
      </div>
    </div>
  );
};


const MultiplayerGame = ({
  playerName,
  onLeaveGame,
  autoLockMouse = false,
  isPreloading = false,
  onBootstrapReady,
  deferNonCriticalUI = false,
}) => {
  

  const applyCanvasProperties = (gl) => {
    const canvas = gl.domElement;
    canvas.setAttribute('tabindex', '0');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '1';
    canvas.style.isolation = 'isolate';
  };

  const applyPerformanceSettings = (gl) => {

    const perfSettings = window.gamePerformanceSettings || {
      trails: true,
      effects: true,
      shadows: true,
      quality: 'Medium',
      adaptiveThrottling: false,
      optimizedFor: 'Maximum'
    };
    
    

    const webglContext = gl.getContext();
    if (webglContext) {

      webglContext.getExtension('WEBGL_compressed_texture_s3tc');
      webglContext.getExtension('WEBGL_compressed_texture_etc1');
      
      gl.capabilities.maxTextureSize = Math.min(gl.capabilities.maxTextureSize, 1024);
    }
    

    const originalValidateProgram = webglContext?.validateProgram;
    const originalGetProgramInfoLog = webglContext?.getProgramInfoLog;
    if (originalValidateProgram && originalGetProgramInfoLog) {

      webglContext.validateProgram = () => {};
      webglContext.getProgramInfoLog = () => '';
      

      setTimeout(() => {
        webglContext.validateProgram = originalValidateProgram;
        webglContext.getProgramInfoLog = originalGetProgramInfoLog;
      }, 3000);
    }
    
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.8;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    
    gl.shadowMap.enabled = false;
    gl.shadowMap.type = THREE.BasicShadowMap;
    

    gl.setPixelRatio(Math.min(window.devicePixelRatio * 0.5, 1.5));
    
    

    setTimeout(() => {
      performanceManager.applySettings();

      gl.shadowMap.enabled = perfSettings.shadows;
    }, 2000);
  };

  const setupEventListeners = (gl) => {
    const canvas = gl.domElement;
    

    try {
      const event = new CustomEvent('new-canvas-ready');
      document.dispatchEvent(event);
    } catch (error) {
      console.warn('Could not dispatch new-canvas-ready event:', error);
    }
    

    const handleContextLost = (event) => {
      console.warn('WebGL context lost! Preventing default and preparing restoration...');
      event.preventDefault();
      

      if (window.gameRenderer) {
        try {
          window.gameRenderer.resetState();
        } catch (e) {
          console.warn('Could not reset renderer state:', e);
        }
      }
      

      setTimeout(() => {
        try {
          const event = new CustomEvent('webgl-context-lost-force-refresh');
          document.dispatchEvent(event);
        } catch (error) {
          console.warn('Could not dispatch force refresh event:', error);
        }
      }, 1000);
    };
    
    const handleContextRestored = () => {
      

      setTimeout(() => {
        if (gl && !gl.isContextLost()) {
          const qualityMultiplier = performanceManager.getQualityMultiplier();
          gl.setPixelRatio(Math.min(window.devicePixelRatio * qualityMultiplier, 2));
          gl.outputColorSpace = THREE.SRGBColorSpace;
          

          setTimeout(() => {
            try {
              const event = new CustomEvent('webgl-context-restored');
              document.dispatchEvent(event);
            } catch (error) {
              console.warn('Could not dispatch context restoration event:', error);
            }
          }, 200);
        }
      }, 100);
    };
    
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);
  };
  
  const [playerHealth, setPlayerHealth] = useState(100);
  const [enemyHealth, setEnemyHealth] = useState(100);
  const [playerBoost, setPlayerBoost] = useState(100);
  const [playerBoostState, setPlayerBoostState] = useState({ boost: 100, isBoosting: false });
  const [shipState, setShipState] = useState({ position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } });
  const [portalAbility, setPortalAbility] = useState(null);
  const [localDashing, setLocalDashing] = useState(false);
  const [blinkOverlayEnabled, setBlinkOverlayEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    const effectsEnabled = window.PERFORMANCE_EFFECTS_ENABLED !== false;
    const qualityLevel = window.PERFORMANCE_QUALITY_LEVEL || 'High';
    return effectsEnabled && qualityLevel !== 'Low';
  });
  const [activeWalls, setActiveWalls] = useState({});
  const [showCalibrator, setShowCalibrator] = useState(() =>
    localStorage.getItem('showEnemyCalibrator') === 'true'
  );
  const [showRadar, setShowRadar] = useState(true);
  const [showRadarDiagnostic, setShowRadarDiagnostic] = useState(false);
  const [showRadarPositionDebug, setShowRadarPositionDebug] = useState(() => 
    localStorage.getItem('showRadarPositionDebug') === 'true'
  );
  
  

  const [radarPosition, setRadarPosition] = useState({ x: -0.15, y: -0.55, z: -0.65 });
  const [radarRotation, setRadarRotation] = useState({ x: -0.1, y: 0.05, z: 0 });
  const [radarScale, setRadarScale] = useState(1.2);
  

  useEffect(() => {
    return () => {

      localStorage.removeItem('roomForceCockpitMode');
    };
  }, []);

  useEffect(() => {
    const updateBlinkOverlayState = () => {
      const effectsEnabled = window.PERFORMANCE_EFFECTS_ENABLED !== false;
      const qualityLevel = window.PERFORMANCE_QUALITY_LEVEL || 'High';
      setBlinkOverlayEnabled(effectsEnabled && qualityLevel !== 'Low');
    };
    window.addEventListener('performanceSettingsApplied', updateBlinkOverlayState);
    return () => window.removeEventListener('performanceSettingsApplied', updateBlinkOverlayState);
  }, []);


  useEffect(() => {
    let intervalId;
    const poll = () => {
      if (!blinkOverlayEnabled) {
        setLocalDashing(false);
        return;
      }
      const dodge = window.gameMovementState?.dodge;
      const isDashing = !!(dodge && (dodge.isLeftDodging || dodge.isRightDodging ||
                                     dodge.isUpDodging || dodge.isDownDodging));
      setLocalDashing(prev => prev !== isDashing ? isDashing : prev);
    };
    intervalId = setInterval(poll, 33);
    return () => clearInterval(intervalId);
  }, [blinkOverlayEnabled]);


  useEffect(() => {
    try {
      localStorage.setItem('showCockpitRadar', 'true');
    } catch {

    }
    setShowRadar(true);
  }, []);
  const [crosshairScreenPosition, setCrosshairScreenPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [gameCamera, setGameCamera] = useState(null);
  const [gameCanvas, setGameCanvas] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [gameOver, setGameOver] = useState(null);
  const [isDraw, setIsDraw] = useState(false);
  const [endReason, setEndReason] = useState('normal');
  const [seriesState, setSeriesState] = useState(null);
  const [roundEndData, setRoundEndData] = useState(null);
  const [waitingForReplay, setWaitingForReplay] = useState(false);
  const [opponentWantsReplay, setOpponentWantsReplay] = useState(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(null);
  const [disconnectCountdown, setDisconnectCountdown] = useState(0);
  const disconnectTimerRef = useRef(null);
  const [weaponHeat, setWeaponHeat] = useState(0);
  const [isOverheated, setIsOverheated] = useState(false);
  const [currentTarget, setCurrentTarget] = useState(null);
  const [isRoomCreator, setIsRoomCreator] = useState(false);
  const [environmentReady, setEnvironmentReady] = useState(false);
  const [stableFrameReady, setStableFrameReady] = useState(false);
  const [replayOverlayVisible, setReplayOverlayVisible] = useState(false);
  const replayOverlayTimerRef = useRef(null);
  const gameCountRef = useRef(1);
  const [progressiveLoading, setProgressiveLoading] = useState({
    coreReady: false,
    environmentReady: false,
    lightingReady: false,
    advancedReady: false
  });
  const bootstrapReadyNotifiedRef = useRef(false);
  const onBootstrapReadyRef = useRef(onBootstrapReady);
  const stableFrameArmedRef = useRef(false);

  useEffect(() => {
    onBootstrapReadyRef.current = onBootstrapReady;
  }, [onBootstrapReady]);
  
  useEffect(() => {
    performance.mark('multiplayer-game-mount-start');
    

    if (isDebugEnabled() && window.performanceMonitor && !window.performanceMonitor.isEnabled) {
      window.performanceMonitor.enable();
    }
    
    if (isPreloading) {
      performance.mark('preloading-mount-start');
    } else {
      performance.mark('normal-mount-start');
    }
    
    return () => {
      performance.mark('multiplayer-game-mount-end');
      performance.measure('multiplayer-game-mount-time', 'multiplayer-game-mount-start', 'multiplayer-game-mount-end');
      
      const mountMeasures = performance.getEntriesByName('multiplayer-game-mount-time');
      if (mountMeasures.length > 0) {
        const mountTime = mountMeasures[mountMeasures.length - 1].duration;
        if (mountTime > 500) {
          console.warn(`SLOW MOUNT: MultiplayerGame took ${mountTime.toFixed(2)}ms to mount!`);
        }
      }
    };
  }, []);
  

  const loadingSequenceStarted = useRef(false);
  useEffect(() => {
    if (gameCamera && gameCanvas && !loadingSequenceStarted.current) {
      loadingSequenceStarted.current = true;
      

      setTimeout(() => {

        setProgressiveLoading(prev => ({ ...prev, coreReady: true }));
        
        setTimeout(() => {

          setProgressiveLoading(prev => ({ ...prev, environmentReady: true }));
          setEnvironmentReady(true);
          

          if (window.performanceMonitor?.isEnabled) {
            window.performanceMonitor.markPhaseStart('assetLoading');
          }
          
          setTimeout(() => {

            setProgressiveLoading(prev => ({ ...prev, lightingReady: true }));
            
            setTimeout(() => {

              setProgressiveLoading(prev => ({ ...prev, advancedReady: true }));
              

              if (window.performanceMonitor?.isEnabled) {
                window.performanceMonitor.markPhaseEnd('assetLoading');
                window.performanceMonitor.markPhaseStart('gameplay');
              }
            }, 100);
          }, 100);
        }, 100);
      }, 100);
    }
  }, [gameCamera, gameCanvas]);

  useEffect(() => {
    const bootstrapReady =
      !!gameCamera &&
      !!gameCanvas &&
      progressiveLoading.coreReady &&
      environmentReady &&
      stableFrameReady;

    if (!bootstrapReady || bootstrapReadyNotifiedRef.current) return;

    bootstrapReadyNotifiedRef.current = true;
    onBootstrapReadyRef.current?.();
  }, [gameCamera, gameCanvas, progressiveLoading.coreReady, environmentReady, stableFrameReady]);

  useEffect(() => {
    if (
      stableFrameReady ||
      stableFrameArmedRef.current ||
      !gameCamera ||
      !gameCanvas ||
      !progressiveLoading.coreReady ||
      !environmentReady
    ) {
      return;
    }

    stableFrameArmedRef.current = true;
    let frameCount = 0;
    let rafId = 0;

    const tick = () => {
      frameCount += 1;
      if (frameCount >= 3) {
        setStableFrameReady(true);
        try {
          performance.mark('astra_first_frame_stable');
        } catch (e) {

        }
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [gameCamera, gameCanvas, progressiveLoading.coreReady, environmentReady, stableFrameReady]);

  
  
  
  useEffect(() => {
    if (!window.gameCleanupCallbacks) {
      window.gameCleanupCallbacks = [];
    }
    

    const cleanup = () => {
      setGameOver(null);
      setPlayerHealth(100);
      setEnemyHealth(100);
      setPlayerBoost(100);
      setWeaponHeat(0);
      setIsOverheated(false);
      if (setFinalGameStats) setFinalGameStats(null);
      

    };
    
    window.gameCleanupCallbacks.push(cleanup);
    
    return () => {

      if (window.gameCleanupCallbacks) {
        const index = window.gameCleanupCallbacks.indexOf(cleanup);
        if (index > -1) {
          window.gameCleanupCallbacks.splice(index, 1);
        }
      }
    };
  }, []);
  const [finalGameStats, setFinalGameStats] = useState(null);
  const [serverPlayerStats, setServerPlayerStats] = useState(null);
  const [serverOpponentStats, setServerOpponentStats] = useState(null);
  const [gameOverPlayers, setGameOverPlayers] = useState(null);
  const [gameOverCurrentPlayer, setGameOverCurrentPlayer] = useState(null);
  const { crosshairState } = useCrosshairState();
  

  const { showSwitcher } = useHDRSwitcher();
  

  useEffect(() => {
    const ws = getWebSocketInstance();
    if (!ws) return;
    

    const sendInputBatch = () => {
      if (!window.inputBuffer || window.inputBuffer.length === 0) return;
      

      const latestInput = window.inputBuffer[window.inputBuffer.length - 1];
      window.inputBuffer = [];
      
      if (latestInput && latestInput.position) {

        ws.sendInput(latestInput);
      }
    };
    
    const inputInterval = setInterval(sendInputBatch, GAME_CONFIG.network.inputThrottle);
    
    return () => {
      clearInterval(inputInterval);
    };
  }, []);
  

  useEffect(() => {
    gameStatsTracker.startGame();
    

    window.dispatchEvent(new CustomEvent('game-started'));
    
    return () => {
      gameStatsTracker.reset();

      window.dispatchEvent(new CustomEvent('game-ended'));
    };
  }, []);
  

  useEffect(() => {
    const ws = getWebSocketInstance();
    

    const handlePlayerHit = (data) => {
      const playerId = ws?.gameStateManager?.playerId;
      
      

      const myBaseName = playerId ? playerId.split('_')[0] : '';
      const targetBaseName = data.targetId ? data.targetId.split('_')[0] : '';
      const attackerBaseName = data.attackerId ? data.attackerId.split('_')[0] : '';
      

      const isTarget = (data.targetId === playerId) || (targetBaseName === myBaseName && myBaseName !== '');
      const isAttacker = (data.attackerId === playerId) || (attackerBaseName === myBaseName && myBaseName !== '');
      

      if (isTarget) {

        const health = Math.max(0, Math.min(100, Math.round(data.newHealth * 100)));
        setPlayerHealth(health);
        

        const audioManager = getAudioManager();
        audioManager.playDamage();
        
        

        

        if (health <= 0 && gameOver === null) {
          setGameOver(false);
        }
      } else if (isAttacker) {

        const enemyHealth = Math.max(0, Math.min(100, Math.round(data.newHealth * 100)));
        setEnemyHealth(enemyHealth);
        

        

        if (enemyHealth <= 0 && gameOver === null) {
          setGameOver(true);
        }
      }
    };
    

    const handleWeaponHeat = (data) => {
      const localPlayerId = ws?.gameStateManager?.playerId;
      
      
      if (data.playerId === localPlayerId) {
        setWeaponHeat(data.heat);
        

        window.debugStats = window.debugStats || {};
        window.debugStats.weaponHeat = data.heat;
      }
    };
    
    const handleWeaponOverheat = (data) => {
      const localPlayerId = ws?.gameStateManager?.playerId;
      
      if (data.playerId === localPlayerId) {
        setIsOverheated(true);

        setTimeout(() => {
          setIsOverheated(false);
          setWeaponHeat(0);
        }, data.cooldownTime);
      }
    };
    

    ws?.on('playerHit', handlePlayerHit);
    ws?.on('weaponHeat', handleWeaponHeat);
    ws?.on('weaponOverheat', handleWeaponOverheat);
    
    return () => {
      ws?.off('playerHit', handlePlayerHit);
      ws?.off('weaponHeat', handleWeaponHeat);
      ws?.off('weaponOverheat', handleWeaponOverheat);
    };
  }, [gameOver, playerName]);
  

  useEffect(() => {
    const audioManager = getAudioManager();
    

    const startEngine = () => {
      if (audioManager.initialized) {
        audioManager.playEngineSound();
      } else {

        const checkAudio = setInterval(() => {
          if (audioManager.initialized) {
            clearInterval(checkAudio);
            audioManager.playEngineSound();
          }
        }, 500);
        

        setTimeout(() => clearInterval(checkAudio), 10000);
      }
    };
    
    startEngine();
    
    return () => {

      audioManager.stopEngineSound();
    };
  }, []);
  
  useEffect(() => {
    const handleGameStateUpdate = (state) => {
      setGameState(state);
    };
    

    const ws = getWebSocketInstance();
    const checkRoomCreator = () => {
      if (ws?.gameStateManager?.currentRoom) {
        const room = ws.gameStateManager.currentRoom;
        const playerId = ws.gameStateManager.playerId;
        const isCreator = room.hostId === playerId || room.creatorId === playerId;
        setIsRoomCreator(isCreator);
      }
    };
    
    const handleReplayStarted = (data) => {


      setGameOver(null);
      setGameOverPlayers(null);
      setGameOverCurrentPlayer(null);
      setFinalGameStats(null);
      setServerPlayerStats(null);
      setServerOpponentStats(null);
      setPlayerHealth(100);
      setEnemyHealth(100);
      setPlayerBoost(100);
      setWaitingForReplay(false);
      setOpponentWantsReplay(null);
      setIsDraw(false);
      setEndReason('normal');
      setOpponentDisconnected(null);
      setDisconnectCountdown(0);
      setActiveWalls({});
      gameStatsTracker.startGame();


      const ws = getWebSocketInstance();
      if (ws?.resetForNewGame) {
        ws.resetForNewGame();
      }




      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('astra:replay-reset'));
        window.forceReplaySpawn = true;
        window.inputBuffer = [];
      }


      if (data?.gameState && ws?.gameStateManager) {
        const playerId = ws.gameStateManager.playerId;
        const yourState = data.gameState.players?.[playerId];
        ws.gameStateManager.handleStateUpdate({
          yourState: yourState,
          others: data.gameState.players,
          bullets: data.gameState.bullets || []
        });
      }


      if (window.gameCleanupCallbacks) {
        window.gameCleanupCallbacks.forEach(cb => {
          try { cb(); } catch (e) {}
        });
      }

      gameCountRef.current++;
      setReplayOverlayVisible(true);
      if (replayOverlayTimerRef.current) {
        clearTimeout(replayOverlayTimerRef.current);
      }
      replayOverlayTimerRef.current = setTimeout(() => {
        setReplayOverlayVisible(false);
      }, 2500);
    };

    const handleOpponentWantsReplay = (data) => {
      setOpponentWantsReplay(data.playerName || 'Opponent');
    };

    const handlePlayerDisconnected = (data) => {
      setOpponentDisconnected({
        playerName: data.playerName || 'Opponent',
        gracePeriodSeconds: data.gracePeriodSeconds || 45,
        timestamp: data.timestamp || Date.now()
      });
      setDisconnectCountdown(data.gracePeriodSeconds || 45);
    };

    const handlePlayerReconnected = (data) => {
      setOpponentDisconnected(null);
      setDisconnectCountdown(0);
      if (disconnectTimerRef.current) {
        clearInterval(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }

      if (data.oldPlayerId && data.oldPlayerId !== data.playerId) {
        const ws = getWebSocketInstance();
        if (ws?.gameStateManager?.gameState?.players) {
          delete ws.gameStateManager.gameState.players[data.oldPlayerId];
        }
      }
    };


    const handleRoundEnd = (data) => {
      setRoundEndData(data);
      setSeriesState({
        round: data.round,
        score: data.seriesScore,
        isSeriesEnd: false
      });

    };


    const handleSeriesEnd = (data) => {
      setRoundEndData(null);
      setSeriesState({
        round: data.roundsPlayed,
        score: data.seriesScore,
        isSeriesEnd: true,
        winnerId: data.winnerId
      });


      const wsInst = getWebSocketInstance();
      const myId = wsInst?.gameStateManager?.playerId || wsInst?.playerId;
      const didWin = data.winnerId === myId;

      window.dispatchEvent(new CustomEvent('game-ended'));
      const finalStats = gameStatsTracker.endGame(didWin);
      setFinalGameStats(finalStats);

      setGameOverPlayers([
        { id: data.winnerId, username: data.winnerName, display_name: data.winnerName },
        { id: data.loserId, username: data.loserName, display_name: data.loserName }
      ].filter(p => p.id || p.username));
      setGameOverCurrentPlayer({
        id: myId,
        username: wsInst?.gameStateManager?.playerName || playerName || 'You',
        display_name: wsInst?.gameStateManager?.playerName || playerName || 'You'
      });
      setEndReason('series_complete');
      setGameOver(didWin);
    };


    const handleRoundDraw = (data) => {
      setRoundEndData({ ...data, isDraw: true });
    };


    const handleSeriesNextRound = (data) => {
      setGameOver(null);
      setGameOverPlayers(null);
      setGameOverCurrentPlayer(null);
      setFinalGameStats(null);
      setPlayerHealth(100);
      setEnemyHealth(100);
      setPlayerBoost(100);
      setRoundEndData(null);
      setIsDraw(false);
      setEndReason('normal');
      setOpponentDisconnected(null);
      setDisconnectCountdown(0);
      gameStatsTracker.startGame();

      setSeriesState(prev => prev ? { ...prev, round: data.round, score: data.seriesScore } : null);


      const wsInst = getWebSocketInstance();
      if (wsInst?.gameStateManager) {
        wsInst.gameStateManager.gameState = {
          players: {},
          bullets: [],
          status: 'in_game',
          lastUpdate: Date.now()
        };
        wsInst.gameStateManager.pendingInputs = [];
        wsInst.gameStateManager.inputSequence = 0;
        wsInst.gameStateManager.lastServerUpdate = 0;
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('astra:replay-reset'));
        window.forceReplaySpawn = true;
        window.inputBuffer = [];
      }

      if (data?.gameState && wsInst?.gameStateManager) {
        const pid = wsInst.gameStateManager.playerId;
        const yourState = data.gameState.players?.[pid];
        if (yourState) {
          wsInst.gameStateManager.handleStateUpdate({
            yourState,
            others: data.gameState.players,
            bullets: data.gameState.bullets || []
          });
        } else {
          console.warn('Series next round: no yourState for pid', pid, Object.keys(data.gameState.players || {}));
        }



        const spawnPos = yourState?.position;
        if (spawnPos && window.gameMovementState?.position) {
          window.gameMovementState.position.set(spawnPos.x, spawnPos.y, spawnPos.z);
          window.gameMovementState.velocity?.set(0, 0, 0);
          window.gameMovementState.spawnReceived = true;
          window.gameMovementState.initialized = true;
          window.forceReplaySpawn = false;
        }
      }

      if (window.gameCleanupCallbacks) {
        window.gameCleanupCallbacks.forEach(cb => { try { cb(); } catch (e) {} });
      }

      setReplayOverlayVisible(true);
      if (replayOverlayTimerRef.current) clearTimeout(replayOverlayTimerRef.current);
      replayOverlayTimerRef.current = setTimeout(() => setReplayOverlayVisible(false), 2500);
    };

    const handleAsteroidDestroyed = (data) => {
      window.dispatchEvent(new CustomEvent('asteroid-destroyed', { detail: data }));
    };


    const handleWallDeployed = (data) => {
      setActiveWalls(prev => ({
        ...prev,
        [data.playerId]: data.wall,
      }));
    };
    const handleWallDamaged = (data) => {
      window.dispatchEvent(new CustomEvent('wall-damaged', { detail: data }));
    };
    const handleWallDestroyed = (data) => {
      window.dispatchEvent(new CustomEvent('wall-destroyed', { detail: data }));

      setTimeout(() => {
        setActiveWalls(prev => {
          const next = { ...prev };
          delete next[data.playerId];
          return next;
        });
      }, 700);
    };
    const handleWallExpired = (data) => {
      window.dispatchEvent(new CustomEvent('wall-expired', { detail: data }));
      setActiveWalls(prev => {
        const next = { ...prev };
        delete next[data.playerId];
        return next;
      });
    };
    const handleWallPassthrough = (data) => {
      window.dispatchEvent(new CustomEvent('wall-passthrough', { detail: data }));
    };

    ws.on('gameState', handleGameStateUpdate);
    ws.on('roomUpdate', checkRoomCreator);
    ws.on('replayGameStarted', handleReplayStarted);
    ws.on('opponentWantsReplay', handleOpponentWantsReplay);
    ws.on('playerDisconnected', handlePlayerDisconnected);
    ws.on('playerReconnected', handlePlayerReconnected);

    ws.on('roundEnd', handleRoundEnd);
    ws.on('seriesEnd', handleSeriesEnd);
    ws.on('roundDraw', handleRoundDraw);
    ws.on('seriesNextRound', handleSeriesNextRound);
    ws.on('asteroidDestroyed', handleAsteroidDestroyed);
    ws.on('wallDeployed', handleWallDeployed);
    ws.on('wallDamaged', handleWallDamaged);
    ws.on('wallDestroyed', handleWallDestroyed);
    ws.on('wallExpired', handleWallExpired);
    ws.on('wallPassthrough', handleWallPassthrough);


    checkRoomCreator();

    return () => {
      ws.off('gameState', handleGameStateUpdate);
      ws.off('roomUpdate', checkRoomCreator);
      ws.off('replayGameStarted', handleReplayStarted);
      ws.off('opponentWantsReplay', handleOpponentWantsReplay);
      ws.off('playerDisconnected', handlePlayerDisconnected);
      ws.off('playerReconnected', handlePlayerReconnected);

      ws.off('roundEnd', handleRoundEnd);
      ws.off('seriesEnd', handleSeriesEnd);
      ws.off('roundDraw', handleRoundDraw);
      ws.off('seriesNextRound', handleSeriesNextRound);
      ws.off('asteroidDestroyed', handleAsteroidDestroyed);
      ws.off('wallDeployed', handleWallDeployed);
      ws.off('wallDamaged', handleWallDamaged);
      ws.off('wallDestroyed', handleWallDestroyed);
      ws.off('wallExpired', handleWallExpired);
      ws.off('wallPassthrough', handleWallPassthrough);
    };
  }, []);
  
  useEffect(() => {
    return () => {
      if (replayOverlayTimerRef.current) {
        clearTimeout(replayOverlayTimerRef.current);
        replayOverlayTimerRef.current = null;
      }
    };
  }, []);


  useEffect(() => {
    if (opponentDisconnected) {
      disconnectTimerRef.current = setInterval(() => {
        setDisconnectCountdown(prev => {
          if (prev <= 1) {
            clearInterval(disconnectTimerRef.current);
            disconnectTimerRef.current = null;

            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (disconnectTimerRef.current) {
        clearInterval(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
    }
    return () => {
      if (disconnectTimerRef.current) {
        clearInterval(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
    };
  }, [opponentDisconnected]);


  useEffect(() => {
    const ws = getWebSocketInstance();
    const normalize = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
    const resolveLocalIdentity = () => ({
      playerId: ws?.gameStateManager?.playerId || ws?.playerId || null,
      playerName: ws?.gameStateManager?.playerName || ws?.playerName || playerName || null
    });
    let gameEndHandled = false;

    const handleGameEnd = async (data = {}) => {
      if (gameEndHandled) return;
      gameEndHandled = true;

      const { playerId: myPlayerId, playerName: myPlayerName } = resolveLocalIdentity();
      const myNameNormalized = normalize(myPlayerName);
      const winnerNameNormalized = normalize(data.winnerName);
      const loserNameNormalized = normalize(data.loserName);

      const isWinnerById = !!myPlayerId && data.winnerId === myPlayerId;
      const isLoserById = !!myPlayerId && data.loserId === myPlayerId;
      const isWinnerByName = !!myNameNormalized && winnerNameNormalized === myNameNormalized;
      const isLoserByName = !!myNameNormalized && loserNameNormalized === myNameNormalized;


      const matchIsDraw = data.isDraw === true || data.winnerId === null;
      setIsDraw(matchIsDraw);
      setEndReason(data.reason || 'normal');


      setOpponentDisconnected(null);
      setDisconnectCountdown(0);

      const isWinner = !matchIsDraw && (isWinnerById || (!isLoserById && isWinnerByName));
      const isLoser = !matchIsDraw && (isLoserById || (!isWinnerById && isLoserByName));
      const didWin = isWinner && !isLoser;

      window.dispatchEvent(new CustomEvent('game-ended'));

      const finalStats = gameStatsTracker.endGame(matchIsDraw ? false : didWin);
      setFinalGameStats(finalStats);


      if (data.combatStats) {
        const myStats = data.combatStats[myPlayerId] || {};
        const opponentId = myPlayerId === data.winnerId ? data.loserId : data.winnerId;
        const oppStats = data.combatStats[opponentId] || {};
        const dur = data.duration || 0;
        const timeStr = `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}`;
        setServerPlayerStats({
          kills: matchIsDraw ? 0 : (didWin ? 1 : 0),
          shots: myStats.shots || 0,
          hits: myStats.hits || 0,
          damage: myStats.damage || 0,
          time: timeStr
        });
        setServerOpponentStats({
          kills: matchIsDraw ? 0 : (didWin ? 0 : 1),
          shots: oppStats.shots || 0,
          hits: oppStats.hits || 0,
          damage: oppStats.damage || 0,
          time: timeStr
        });
      }


      const winnerInfo = { id: data.winnerId, username: data.winnerName, display_name: data.winnerName };
      const loserInfo = { id: data.loserId, username: data.loserName, display_name: data.loserName };
      const resolvedPlayers = [winnerInfo, loserInfo].filter((p) => p.id || p.username || p.display_name);
      setGameOverPlayers(resolvedPlayers.length > 0 ? resolvedPlayers : null);
      setGameOverCurrentPlayer({
        id: myPlayerId,
        username: myPlayerName || playerName || 'You',
        display_name: myPlayerName || playerName || 'You'
      });

      setGameOver(matchIsDraw ? 'draw' : didWin);


      if (!matchIsDraw && myPlayerId && myPlayerName) {
        if (didWin) {
          await playerStatsService.recordWin(myPlayerId, myPlayerName);
        } else {
          await playerStatsService.recordLoss(myPlayerId, myPlayerName);
        }
      }
    };


    const resetGameEndHandled = () => {
      gameEndHandled = false;
    };

    ws?.on('gameEnd', handleGameEnd);
    ws?.on('replayGameStarted', resetGameEndHandled);
    return () => {
      ws?.off('gameEnd', handleGameEnd);
      ws?.off('replayGameStarted', resetGameEndHandled);
    };
  }, []);
  
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Escape') {

        window.dispatchEvent(new CustomEvent('game-ended'));
        onLeaveGame();
      }
      

      if (event.key === 't' || event.key === 'T') {
        window.isTestModeActive = !window.isTestModeActive;
      }
      
      

      if ((event.key === 'r' || event.key === 'R') && event.shiftKey) {
        const newValue = !showRadar;
        setShowRadar(newValue);
        localStorage.setItem('showCockpitRadar', newValue.toString());
      }
      
      

      if (event.key === 'd' || event.key === 'D') {
        setShowRadarDiagnostic(prev => !prev);
      }
      

      if (event.key === 'b' || event.key === 'B') {
        const newValue = !showRadarPositionDebug;
        setShowRadarPositionDebug(newValue);
        localStorage.setItem('showRadarPositionDebug', newValue.toString());
      }
      

      if (event.key === 'f' || event.key === 'F') {

        localStorage.removeItem('radarCalibrations');
        

        window.RADAR_COORDS_CONFIRMED = {
          formula: 'atan2(dx, -dz)',
          xFlip: 1,
          yFlip: -1,
          zFlip: -1,
          angleOffset: 0
        };
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onLeaveGame]);
  
  const handleReplay = () => {
    const ws = getWebSocketInstance();
    if (!ws) return;



    ws.send('requestReplay');
    setWaitingForReplay(true);
  };

  const handleClaimVictory = () => {
    const ws = getWebSocketInstance();
    if (!ws) return;
    ws.send('claim_victory');

  };

  const handleReinvite = () => {


    const ws = getWebSocketInstance();
    if (!ws || !opponentDisconnected) return;

  };
  

  const handleBoostChange = (boostState) => {
    setPlayerBoostState(boostState);
    setPlayerBoost(boostState.boost);
  };


  useEffect(() => {
    if (shipState?.position) {
      window.localShipPosition = shipState.position;
    }
  }, [shipState]);
  

  useEffect(() => {
    const syncPortalAbility = () => {
      if (window.gameMovementState?.portalAbility) {
        setPortalAbility(window.gameMovementState.portalAbility);
      }
    };

    const interval = setInterval(syncPortalAbility, 16);
    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
    };
  }, []);

  const showNonCriticalUI = !deferNonCriticalUI;
  const debugOverlayEnabled = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('debug') === '1';

  return (
    <div className="relative w-full h-full" style={{
      opacity: (blinkOverlayEnabled && localDashing) ? 0.35 : 1,
      transition: 'opacity 0.08s ease-out',
    }}>
      <div 
        className="fixed inset-0"
        style={{
          zIndex: Z_INDEX.CANVAS,
          isolation: 'isolate',
          contain: 'layout style paint',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh'
        }}
      >
        <Canvas 
          className="w-full h-full"
          gl={{ alpha: true, antialias: true }}
          onCreated={({ gl, camera }) => {

            window.gameCamera = camera;
            window.gameRenderer = gl;
            setGameCanvas(gl.domElement);
            
            

            requestIdleCallback(() => {
              applyCanvasProperties(gl);
            });
            
            requestIdleCallback(() => {
              applyPerformanceSettings(gl);
              setupEventListeners(gl);
            }, { timeout: 50 });
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: Z_INDEX.CANVAS
          }}
        >

          <PerspectiveCamera 
            makeDefault 
            position={[0, 5, 10]} 
            near={0.1}
            far={5000}
            fov={75}
          />
          

          <CameraCapture onCameraCapture={setGameCamera} />
          

          <HDRSkybox />
          

          {progressiveLoading.lightingReady && !isPreloading && (
            <>
              <ambientLight intensity={0.4} color="#ffffff" />
              {isTestModeEnabled('shadows') && (
                <directionalLight 
                  position={[10, 20, 10]} 
                  intensity={1.2} 
                  color="#ffffff"
                  castShadow={performanceManager.shouldEnableFeature('shadows')}
                  shadow-mapSize={performanceManager.getSettings().quality === 'High' ? [2048, 2048] : [1024, 1024]}
                  shadow-camera-near={0.5}
                  shadow-camera-far={500}
                  shadow-camera-left={-100}
                  shadow-camera-right={100}
                  shadow-camera-top={100}
                  shadow-camera-bottom={-100}
                />
              )}
              {isTestModeEnabled('particles') && performanceManager.shouldEnableFeature('effects') && (
                <>
                  <pointLight position={[-10, 10, -10]} intensity={0.5} color="#88ccff" />
                  <pointLight position={[10, -10, 10]} intensity={0.3} color="#ffcc88" />
                </>
              )}
              

              <hemisphereLight 
                skyColor="#87CEEB" 
                groundColor="#362907" 
                intensity={0.6} 
              />

              <ArenaExternalLightRig />
            </>
          )}
          

          {isPreloading && (
            <ambientLight intensity={0.8} color="#ffffff" />
          )}
          

          {true && (
            <EnvironmentRenderer 
              loading={!progressiveLoading.environmentReady}
              onReady={() => {
                setEnvironmentReady(true);
              }} 
            />
          )}
          

          
          <BoundaryWithMarkers />
          
          <HitMarkerManager />


          <MasterRenderLoopDriver />

          <PlayerController 
            playerName={playerName}
            playerHealth={playerHealth}
            onHealthChange={setPlayerHealth}
            onBoostChange={handleBoostChange}
            onShipStateChange={setShipState}
            showCrosshair={false}
            isPreloading={isPreloading}
            onScreenPositionUpdate={(position) => {
              setCrosshairScreenPosition(position);
            }}
          />
          
          
          <BulletsRenderer />


          {Object.entries(activeWalls).map(([playerId, wall]) => (
            <CrystalWall key={wall.id || playerId} wallData={wall} ownerId={playerId} />
          ))}

          <CrystalWallPreview />
          

          {progressiveLoading.advancedReady && showNonCriticalUI && (
            <FixedTargetBrackets 
              shipPosition={shipState?.position}
              shipRotation={shipState?.rotation}
              isVisible={true}
              maxRange={5000}
              minRange={20}
            />
          )}
          
          
          
        </Canvas>

        <MouseLockIndicator autoLock={autoLockMouse} />
        

        <DamageVisualization 
          health={playerHealth / 100}
          enabled={true}
          intensity={1.0}
        />
        
        
      </div>
      

      {environmentReady && showNonCriticalUI && gameOver === null && (
        <CockpitRadar 
          shipPosition={shipState?.position} 
          shipRotation={shipState?.rotation}
          isVisible={showRadar}
          positionTop="79%"
          positionLeft="50%"
          positionTransform="translate(-50%, -50%) scale(0.74)"
          lockToCockpitAnchor={true}
          anchorScale={0.74}
          showLabels={false}
        />
      )}


      {!isPreloading && gameOver === null && (
        <GameHUD
          playerHealth={playerHealth}
          enemyHealth={enemyHealth}
          playerBoost={playerBoost}
          playerBoostState={playerBoostState}
          onLeaveGame={onLeaveGame}
          currentTarget={currentTarget}
          portalAbility={portalAbility}
        />
      )}

      <BoundaryWarningOverlay />

      {!isPreloading && gameOver === null && (
        <>
          {blinkOverlayEnabled && <DashOverlay />}
          <DashCooldownHUD />
        </>
      )}


      {showNonCriticalUI && debugOverlayEnabled && <DebugOverlay />}

      {isDebugEnabled() && <PerformanceOverlay />}

      {opponentDisconnected && gameOver === null && (
        <div
          className="fixed inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: Z_INDEX.GAME_OVER - 1 }}
        >
          <div className="pointer-events-auto bg-black/80 backdrop-blur-sm border-2 border-yellow-500/60 rounded-xl p-8 max-w-md text-center">
            <div className="text-yellow-400 text-5xl font-bold mb-4">
              {disconnectCountdown}s
            </div>
            <h2 className="text-yellow-300 text-xl font-bold mb-2">
              OPPONENT DISCONNECTED
            </h2>
            <p className="text-gray-300 mb-2">
              {opponentDisconnected.playerName} lost connection
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Waiting for reconnection... Auto-forfeit in {disconnectCountdown}s
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleClaimVictory}
                className="tactical-btn bg-green-600/80 hover:bg-green-500/80 px-6 py-3 rounded-lg font-bold text-white"
              >
                CLAIM VICTORY
              </button>
              <button
                onClick={handleReinvite}
                className="tactical-btn bg-blue-600/80 hover:bg-blue-500/80 px-6 py-3 rounded-lg font-bold text-white"
              >
                REINVITE
              </button>
            </div>
          </div>
        </div>
      )}


      {roundEndData && gameOver === null && (
        <div
          className="fixed inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: Z_INDEX.GAME_OVER - 1 }}
        >
          <div className="bg-black/85 backdrop-blur-sm border-2 border-purple-500/60 rounded-xl p-8 max-w-md text-center">
            {roundEndData.isDraw ? (
              <>
                <h2 className="text-yellow-400 text-3xl font-bold mb-2">DRAW</h2>
                <p className="text-gray-300 mb-4">Round doesn't count — replaying...</p>
              </>
            ) : (
              <>
                <h2 className="text-purple-300 text-2xl font-bold mb-2">
                  ROUND {roundEndData.nextRound} OF 3
                </h2>
                <p className="text-white text-lg mb-4">
                  {roundEndData.winnerName} won round {roundEndData.round}!
                </p>
              </>
            )}
            {roundEndData.seriesScore && (
              <div className="flex justify-center gap-8 text-3xl font-bold mb-4">
                {Object.entries(roundEndData.seriesScore).map(([pid, wins]) => (
                  <span key={pid} className={wins > 0 ? 'text-green-400' : 'text-gray-500'}>
                    {wins}
                  </span>
                ))}
              </div>
            )}
            <p className="text-cyan-400 text-sm animate-pulse">NEXT ROUND STARTING...</p>
          </div>
        </div>
      )}

      {gameOver !== null && (
        <GameOverScreen
          isWin={gameOver === 'draw' ? false : gameOver}
          isDraw={isDraw}
          endReason={endReason}
          onReplay={handleReplay}
          onLeaveGame={onLeaveGame}
          gameStats={finalGameStats}
          playerStats={serverPlayerStats}
          opponentStats={serverOpponentStats}
          players={gameOverPlayers}
          currentPlayer={gameOverCurrentPlayer}
          waitingForReplay={waitingForReplay}
          opponentWantsReplay={opponentWantsReplay}
          seriesState={seriesState}
        />
      )}

      {replayOverlayVisible && (
        <div
          className="fixed inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: Z_INDEX.LOADING_SCREEN }}
        >
          <div className="absolute inset-0 bg-black/45" />
          <div className="relative text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="text-6xl font-bold tactical-title mb-3"
              style={{ color: '#00ffff', textShadow: '0 0 25px #00ffff' }}
            >
              GAME {gameCountRef.current}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.35 }}
              className="text-xl text-cyan-300 font-mono"
            >
              Repositioning to spawn...
            </motion.div>
          </div>
        </div>
      )}


      {showNonCriticalUI && isTestModeEnabled('boost') && (
        <SimplifiedBoostArc
          boost={playerBoostState.boost}
          isBoosting={playerBoostState.isBoosting}
          screenPosition={crosshairScreenPosition}
        />
      )}


      {showNonCriticalUI && (
        <SimplifiedWeaponHeatArc
          weaponHeat={weaponHeat}
          maxHeat={GAME_CONFIG.combat.overheatThreshold}
          isOverheated={isOverheated}
          screenPosition={crosshairScreenPosition}
        />
      )}
      

      {showNonCriticalUI && <SkyboxSwitcherUI />}



      

      {false && (
        <RadarDiagnostic
          shipPosition={shipState?.position}
          shipRotation={shipState?.rotation}
          isVisible={showRadarDiagnostic}
        />
      )}
      

      {showNonCriticalUI && (
        <RadarPositionDebug
          isVisible={showRadarPositionDebug}
          onPositionChange={setRadarPosition}
          onRotationChange={setRadarRotation}
          onScaleChange={setRadarScale}
        />
      )}


      {environmentReady && gameOver === null && <StaticCrosshair />}

      
      {showNonCriticalUI && <AudioControls />}
      
    </div>
  );
};

export default MultiplayerGame;
