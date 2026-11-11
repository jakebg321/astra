import React, { useState, useEffect } from 'react';
import { getWebSocketInstance } from '../services/UnifiedWebSocket';
import { Z_INDEX } from '../constants/zIndex';

const FACE_KEYS = ['left', 'right', 'front', 'back', 'top', 'bottom'];
const FACE_LABELS = {
  left: 'Left',
  right: 'Right',
  front: 'Front',
  back: 'Back',
  top: 'Top',
  bottom: 'Bottom'
};

const DEFAULT_EXTERNAL_FACE_LIGHT = {
  enabled: true,
  intensityMultiplier: 1,
  distanceMultiplier: 1,
  colorHex: '#7cc8ff'
};

const createDefaultExternalArenaLights = () => ({
  enabled: true,
  linkAllFaces: true,
  globalIntensity: 8,
  globalDistance: 0,
  globalDecay: 1.2,
  outsideOffset: 260,
  globalColorHex: '#9bd6ff',
  coneAngle: 1.1,
  penumbra: 0.35,
  perFace: {
    left: { ...DEFAULT_EXTERNAL_FACE_LIGHT },
    right: { ...DEFAULT_EXTERNAL_FACE_LIGHT },
    front: { ...DEFAULT_EXTERNAL_FACE_LIGHT },
    back: { ...DEFAULT_EXTERNAL_FACE_LIGHT },
    top: { ...DEFAULT_EXTERNAL_FACE_LIGHT },
    bottom: { ...DEFAULT_EXTERNAL_FACE_LIGHT }
  }
});

const DEFAULT_ENVIRONMENT_DEBUG_SETTINGS = {
  planet: {
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scale: 1.86,
    hue: 58,
    brightness: 1,
    opacity: 1,
    orbitalBrightness: 1,
    orbitalGlow: 0
  },
  boundary: {
    hue: 0,
    brightness: 1,
    lineOpacity: 0.75,
    glowIntensity: 0.5,
    panelOpacity: 0,
    panelBrightness: 1,
    lineColorHex: '#00ffff',
    panelColorHex: '#00ffff',
    animationSpeed: 1,
    pulseSpeed: 2,
    pulseAmount: 0.3,
    scanSpeed: 1.5,
    scanAmount: 0.2,
    edgeTint: 0.8,
    distanceReactive: 0.5
  },
  externalArenaLights: createDefaultExternalArenaLights(),
  nebula: {
    enabled: true,
    globalOpacity: 1.0,
    sphereRadius: 4500,
    radiusMultiplier: 1,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    outsideMargin: 200,
    maskThreshold: 0.62,
    maskSoftness: 0.12,
    layers: [
      { texture: '/textures/nebula/nebula1.jpg', rotationX: 0, rotationY: 0, rotationZ: 0, opacity: 0.45, enabled: true, hue: 0, driftSpeed: 0.3, driftAxisX: 0, driftAxisY: 1, driftAxisZ: 0, pulseSpeed: 0.4, pulseAmount: 0.08 },
      { texture: '/textures/nebula/nebula1.jpg', rotationX: 0, rotationY: 180, rotationZ: 27, opacity: 0.3, enabled: true, hue: 0, driftSpeed: -0.2, driftAxisX: 0.3, driftAxisY: 0.7, driftAxisZ: 0, pulseSpeed: 0.25, pulseAmount: 0.06 },
      { texture: '/textures/nebula/nebula1.jpg', rotationX: 90, rotationY: 126, rotationZ: 0, opacity: 0.25, enabled: true, hue: 0, driftSpeed: 0.15, driftAxisX: 0, driftAxisY: 0, driftAxisZ: 1, pulseSpeed: 0.6, pulseAmount: 0.1 },
    ]
  }
};

const HEX_COLOR_PATTERN = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const normalizeHexColor = (value, fallback = '#00ffff') => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  const prefixed = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (!HEX_COLOR_PATTERN.test(prefixed)) return fallback;

  if (prefixed.length === 4) {
    const r = prefixed[1];
    const g = prefixed[2];
    const b = prefixed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return prefixed.toLowerCase();
};

const mergeExternalArenaLights = (incoming = {}) => {
  const defaults = createDefaultExternalArenaLights();
  const mergedPerFace = {};

  FACE_KEYS.forEach((faceKey) => {
    mergedPerFace[faceKey] = {
      ...defaults.perFace[faceKey],
      ...(incoming.perFace?.[faceKey] || {})
    };
    mergedPerFace[faceKey].colorHex = normalizeHexColor(
      mergedPerFace[faceKey].colorHex,
      defaults.perFace[faceKey].colorHex
    );
  });

  return {
    ...defaults,
    ...(incoming || {}),
    globalColorHex: normalizeHexColor(
      incoming.globalColorHex ?? defaults.globalColorHex,
      defaults.globalColorHex
    ),
    perFace: mergedPerFace
  };
};

const mergeEnvironmentDebugSettings = (incoming = {}) => ({
  planet: {
    ...DEFAULT_ENVIRONMENT_DEBUG_SETTINGS.planet,
    ...(incoming.planet || {})
  },
  boundary: {
    ...DEFAULT_ENVIRONMENT_DEBUG_SETTINGS.boundary,
    ...(incoming.boundary || {})
  },
  externalArenaLights: mergeExternalArenaLights(incoming.externalArenaLights || {}),
  nebula: {
    ...DEFAULT_ENVIRONMENT_DEBUG_SETTINGS.nebula,
    ...(incoming.nebula || {}),
    layers: incoming.nebula?.layers || DEFAULT_ENVIRONMENT_DEBUG_SETTINGS.nebula.layers
  }
});

const SliderControl = ({ label, value, min, max, step = 1, onChange, formatValue }) => (
  <div className="mb-1">
    <label className="text-xs">
      {label}: {formatValue ? formatValue(value) : value}
    </label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-gray-600"
    />
  </div>
);

const DebugOverlay = () => {
  const [debugData, setDebugData] = useState({
    playerPos: { x: 0, y: 0, z: 0 },
    playerRot: { x: 0, y: 0, z: 0 },
    bulletCount: 0,
    lastFirePos: null,
    lastFireTime: null,
    gameState: null
  });
  
  const [isVisible, setIsVisible] = useState(true);
  const [environmentSettings, setEnvironmentSettings] = useState(DEFAULT_ENVIRONMENT_DEBUG_SETTINGS);
  const [lineColorHexInput, setLineColorHexInput] = useState(DEFAULT_ENVIRONMENT_DEBUG_SETTINGS.boundary.lineColorHex);
  const [panelColorHexInput, setPanelColorHexInput] = useState(DEFAULT_ENVIRONMENT_DEBUG_SETTINGS.boundary.panelColorHex);
  const [externalGlobalColorInput, setExternalGlobalColorInput] = useState(
    DEFAULT_ENVIRONMENT_DEBUG_SETTINGS.externalArenaLights.globalColorHex
  );
  const [externalFaceColorInputs, setExternalFaceColorInputs] = useState(() => {
    const initialValues = {};
    FACE_KEYS.forEach((faceKey) => {
      initialValues[faceKey] =
        DEFAULT_ENVIRONMENT_DEBUG_SETTINGS.externalArenaLights.perFace[faceKey].colorHex;
    });
    return initialValues;
  });

  const [expandedSections, setExpandedSections] = useState({
    debugInfo: true,
    crackDebug: false,
    laserFx: false,
    planetFx: false,
    arenaGridFx: false,
    externalArenaLights: false
  });

  const [laserPresets, setLaserPresets] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('laserPresets');
        return saved ? JSON.parse(saved) : {
          "1": null, "2": null, "3": null, "4": null, "5": null, "6": null
        };
      } catch (e) {
        return { "1": null, "2": null, "3": null, "4": null, "5": null, "6": null };
      }
    }
    return { "1": null, "2": null, "3": null, "4": null, "5": null, "6": null };
  });
  
  const [selectedPreset, setSelectedPreset] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('lastPreset') || '1';
      } catch (e) {
        return '1';
      }
    }
    return '1';
  });

  const [beamSettings, setBeamSettings] = useState(() => {
    const defaults = {
      holdMs: 80,
      fadeMs: 320,
      flashMs: 80,
      flashSize: 1.0,
      flashOpacity: 0.5,
      coreRadius: 0.03,
      glowRadius: 0.2,
      bloomRadius: 0.8,
      glowOpacity: 0.45,
      bloomOpacity: 0.12,

      coreColor: '#ffffff',
      glowColor: '#ff2200',
      bloomColor: '#ff3300',
      flashColor: '#ffaa33',
      hueShift: 0,

      beamLength: 1500,
      taperTip: 1.0,

      flicker: 0,
    };
    window.beamSettings = defaults;
    return defaults;
  });

  const updateBeamSetting = (key, value) => {
    const next = { ...beamSettings, [key]: value };
    setBeamSettings(next);
    window.beamSettings = next;
  };

  const saveLaserPreset = () => {
    const name = window.prompt(`Enter name for Preset ${selectedPreset}:`, `Preset ${selectedPreset}`);
    if (!name) return;
    
    const newPresets = {
      ...laserPresets,
      [selectedPreset]: { name, ...beamSettings }
    };
    setLaserPresets(newPresets);
    if (typeof window !== 'undefined') {
      localStorage.setItem('laserPresets', JSON.stringify(newPresets));
      localStorage.setItem('lastPreset', selectedPreset);
    }
  };
  
  const loadLaserPreset = (presetId) => {
    const preset = laserPresets[presetId];
    if (!preset) return;
    
    const { name, ...settings } = preset;
    setBeamSettings(settings);
    window.beamSettings = settings;
    setSelectedPreset(presetId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastPreset', presetId);
    }
  };
  
  const deleteLaserPreset = () => {
    const newPresets = {
      ...laserPresets,
      [selectedPreset]: null
    };
    setLaserPresets(newPresets);
    if (typeof window !== 'undefined') {
      localStorage.setItem('laserPresets', JSON.stringify(newPresets));
    }
  };
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  const expandAllSections = () => {
    setExpandedSections({
      debugInfo: true,
      crackDebug: true,
      laserFx: true,
      planetFx: true,
      arenaGridFx: true,
      externalArenaLights: true
    });
  };
  
  const collapseAllSections = () => {
    setExpandedSections({
      debugInfo: true,
      crackDebug: false,
      laserFx: false,
      planetFx: false,
      arenaGridFx: false,
      externalArenaLights: false
    });
  };

  useEffect(() => {
    const lastPresetId = typeof window !== 'undefined' ? localStorage.getItem('lastPreset') : null;
    if (lastPresetId && laserPresets[lastPresetId]) {
      loadLaserPreset(lastPresetId);
    }
  }, []);

  const [crackSettings, setCrackSettings] = useState({
    enabled: true,
    level: 3,
    opacity: 0.8,
    positionZ: -0.01,
    scaleX: 10,
    scaleY: 10
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const currentSettings = window.getEnvironmentDebug?.();
      if (currentSettings) {
        setEnvironmentSettings(mergeEnvironmentDebugSettings(currentSettings));
      }
    } catch (error) {

    }
  }, []);

  useEffect(() => {
    setLineColorHexInput(environmentSettings.boundary.lineColorHex || '#00ffff');
    setPanelColorHexInput(environmentSettings.boundary.panelColorHex || '#00ffff');
  }, [environmentSettings.boundary.lineColorHex, environmentSettings.boundary.panelColorHex]);

  useEffect(() => {
    setExternalGlobalColorInput(
      environmentSettings.externalArenaLights.globalColorHex || '#7cc8ff'
    );

    const faceColorValues = {};
    FACE_KEYS.forEach((faceKey) => {
      faceColorValues[faceKey] =
        environmentSettings.externalArenaLights.perFace?.[faceKey]?.colorHex || '#7cc8ff';
    });
    setExternalFaceColorInputs(faceColorValues);
  }, [
    environmentSettings.externalArenaLights.globalColorHex,
    environmentSettings.externalArenaLights.perFace
  ]);

  const updateEnvironmentSettings = (nextSettings) => {
    const mergedSettings = mergeEnvironmentDebugSettings(nextSettings);
    setEnvironmentSettings(mergedSettings);
    if (window.setEnvironmentDebug) {
      window.setEnvironmentDebug(mergedSettings);
    }
  };

  const updatePlanetSetting = (key, value) => {
    const next = {
      ...environmentSettings,
      planet: {
        ...environmentSettings.planet,
        [key]: value
      }
    };
    updateEnvironmentSettings(next);
  };

  const updateBoundarySetting = (key, value) => {
    const next = {
      ...environmentSettings,
      boundary: {
        ...environmentSettings.boundary,
        [key]: value
      }
    };
    updateEnvironmentSettings(next);
  };

  const updateExternalArenaLights = (updater) => {
    const currentExternal = environmentSettings.externalArenaLights;
    const nextExternal =
      typeof updater === 'function' ? updater(currentExternal) : updater;
    const next = {
      ...environmentSettings,
      externalArenaLights: mergeExternalArenaLights(nextExternal)
    };
    updateEnvironmentSettings(next);
  };

  const updateExternalLightSetting = (key, value) => {
    updateExternalArenaLights((currentExternal) => ({
      ...currentExternal,
      [key]: value
    }));
  };

  const updateExternalFaceSetting = (faceKey, key, value) => {
    updateExternalArenaLights((currentExternal) => ({
      ...currentExternal,
      perFace: {
        ...currentExternal.perFace,
        [faceKey]: {
          ...(currentExternal.perFace?.[faceKey] || DEFAULT_EXTERNAL_FACE_LIGHT),
          [key]: value
        }
      }
    }));
  };

  const commitBoundaryHex = (key, rawValue, fallbackColor = '#00ffff') => {
    const normalized = normalizeHexColor(rawValue, fallbackColor);
    if (key === 'lineColorHex') {
      setLineColorHexInput(normalized);
    } else {
      setPanelColorHexInput(normalized);
    }
    updateBoundarySetting(key, normalized);
  };

  const commitExternalGlobalHex = (rawValue) => {
    const normalized = normalizeHexColor(rawValue, '#7cc8ff');
    setExternalGlobalColorInput(normalized);
    updateExternalLightSetting('globalColorHex', normalized);
  };

  const commitExternalFaceHex = (faceKey, rawValue) => {
    const fallbackColor =
      environmentSettings.externalArenaLights.perFace?.[faceKey]?.colorHex || '#7cc8ff';
    const normalized = normalizeHexColor(rawValue, fallbackColor);
    setExternalFaceColorInputs((current) => ({
      ...current,
      [faceKey]: normalized
    }));
    updateExternalFaceSetting(faceKey, 'colorHex', normalized);
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'F12') {
        e.preventDefault();
        setIsVisible(!isVisible);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);
  
  const formatNum = (num) => typeof num === 'number' ? num.toFixed(2) : '0.00';
  const externalLights = environmentSettings.externalArenaLights;
  
  if (!isVisible) {
    return (
      <div 
        className="absolute top-4 right-4 bg-black/80 text-green-400 font-mono text-xs p-2 rounded border border-green-500/50 cursor-pointer"
        onClick={() => setIsVisible(true)}
        style={{
          zIndex: Z_INDEX.DEBUG_OVERLAY,
          contain: 'layout style',
          willChange: 'auto'
        }}
      >
        <div className="text-green-300 font-bold">🔍 DEBUG (F12)</div>
      </div>
    );
  }
  
  return (
    <div 
      className="absolute top-4 right-4 bg-black/90 text-green-400 font-mono text-xs p-4 rounded border border-green-500/50 max-w-xs max-h-[85vh] overflow-y-auto"
      style={{
        zIndex: Z_INDEX.DEBUG_OVERLAY,
        contain: 'layout style',
        willChange: 'auto',
        backdropFilter: 'blur(2px)'
      }}
    >

      <div className="flex justify-between items-center mb-2">
        <div className="text-green-300 font-bold">🔍 DEBUG INFO</div>
        <div className="flex gap-2">
          <button 
            onClick={expandAllSections}
            className="text-cyan-400 hover:text-cyan-300 text-xs"
            title="Expand All"
          >
            ▼
          </button>
          <button 
            onClick={collapseAllSections}
            className="text-cyan-400 hover:text-cyan-300 text-xs"
            title="Collapse All"
          >
            ▶
          </button>
          <button 
            onClick={() => setIsVisible(false)}
            className="text-red-400 hover:text-red-300 text-xs"
          >
            ✕
          </button>
        </div>
      </div>
      

      <details open={expandedSections.debugInfo} className="mb-2 border border-green-600/30 rounded">
        <summary
          className="cursor-pointer text-green-300 font-bold text-xs p-1 hover:bg-green-900/20"
          onClick={(e) => {
            e.preventDefault();
            toggleSection('debugInfo');
          }}
        >
          {expandedSections.debugInfo ? '▼' : '▶'} DEBUG INFO
        </summary>
        {expandedSections.debugInfo && (
          <div className="p-1">

            <div className="mb-2">
              <div className="text-cyan-400 font-bold">PLAYER POSITION:</div>
              <div>X: {formatNum(debugData.playerPos.x)}</div>
              <div>Y: {formatNum(debugData.playerPos.y)}</div>
              <div>Z: {formatNum(debugData.playerPos.z)}</div>
            </div>
            

            <div className="mb-2">
              <div className="text-cyan-400 font-bold">PLAYER ROTATION:</div>
              <div>X: {formatNum(debugData.playerRot.x)}</div>
              <div>Y: {formatNum(debugData.playerRot.y)}</div>
              <div>Z: {formatNum(debugData.playerRot.z)}</div>
            </div>
            

            <div className="mb-2">
              <div className="text-orange-400 font-bold">BULLETS:</div>
              <div>Count: {debugData.bulletCount}</div>
              <div>Last Fire: {debugData.lastFireTime ? new Date(debugData.lastFireTime).toLocaleTimeString() : 'Never'}</div>
            </div>
            

            <div className="mb-2">
              <div className="text-purple-400 font-bold">GAME STATE:</div>
              <div>Status: {debugData.gameState?.status || 'unknown'}</div>
              <div>Players: {Object.keys(debugData.gameState?.players || {}).length}</div>
              <div>Test Mode: {window.MULTIPLAYER_TEST_MODE ? 'YES' : 'NO'}</div>
            </div>
            
            <div className="mb-2">
              <div className="text-yellow-400 font-bold">PERFORMANCE:</div>
              <div>Mouse: {document.pointerLockElement ? 'LOCKED' : 'FREE'}</div>
              <div>Assets: {window.gameAssetsReady ? 'READY' : 'LOADING'}</div>
            </div>
            
            <div className="mb-2">
              <div className="text-purple-400 font-bold">CONNECTION:</div>
              <div>Status: {debugData.gameState?.lastUpdate ? 
                (Date.now() - debugData.gameState.lastUpdate < 5000 ? 'GOOD' : 'STALE') : 'UNKNOWN'}</div>
              <div>WS State: {getWebSocketInstance()?.connection?.ws?.readyState === 1 ? 'OPEN' : 'CLOSED'}</div>
              <div>Last Update: {debugData.gameState?.lastUpdate ? 
                `${Math.round((Date.now() - debugData.gameState.lastUpdate) / 1000)}s ago` : 'Never'}</div>
            </div>
          </div>
        )}
      </details>


      <details open={expandedSections.crackDebug} className="mb-2 border border-red-600/30 rounded">
        <summary
          className="cursor-pointer text-red-400 font-bold text-xs p-1 hover:bg-red-900/20"
          onClick={(e) => {
            e.preventDefault();
            toggleSection('crackDebug');
          }}
        >
          {expandedSections.crackDebug ? '▼' : '▶'} 🩸 CRACK DEBUG
        </summary>
        {expandedSections.crackDebug && (
          <div className="p-1">
            <div className="flex items-center gap-2 mb-1">
              <label className="text-xs">Enable:</label>
              <input 
                type="checkbox" 
                checked={crackSettings.enabled}
                onChange={(e) => {
                  const newSettings = {...crackSettings, enabled: e.target.checked};
                  setCrackSettings(newSettings);
                  if (window.setCrackDebug) window.setCrackDebug(newSettings);
                }}
              />
            </div>
            
            <div className="mb-1">
              <label className="text-xs">Level: {crackSettings.level}</label>
              <input 
                type="range" 
                min="1" 
                max="5" 
                value={crackSettings.level}
                onChange={(e) => {
                  const newSettings = {...crackSettings, level: parseInt(e.target.value)};
                  setCrackSettings(newSettings);
                  if (window.setCrackDebug) window.setCrackDebug(newSettings);
                }}
                className="w-full h-1 bg-gray-600"
              />
            </div>
            
            <div className="mb-1">
              <label className="text-xs">Opacity: {crackSettings.opacity.toFixed(1)}</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                value={crackSettings.opacity}
                onChange={(e) => {
                  const newSettings = {...crackSettings, opacity: parseFloat(e.target.value)};
                  setCrackSettings(newSettings);
                  if (window.setCrackDebug) window.setCrackDebug(newSettings);
                }}
                className="w-full h-1 bg-gray-600"
              />
            </div>
            
            <div className="mb-1">
              <label className="text-xs">Z Pos: {crackSettings.positionZ.toFixed(2)}</label>
              <input 
                type="range" 
                min="-2" 
                max="2" 
                step="0.01"
                value={crackSettings.positionZ}
                onChange={(e) => {
                  const newSettings = {...crackSettings, positionZ: parseFloat(e.target.value)};
                  setCrackSettings(newSettings);
                  if (window.setCrackDebug) window.setCrackDebug(newSettings);
                }}
                className="w-full h-1 bg-gray-600"
              />
            </div>
            
            <div className="mb-1">
              <label className="text-xs">Scale: {crackSettings.scaleX}x</label>
              <input 
                type="range" 
                min="1" 
                max="20" 
                value={crackSettings.scaleX}
                onChange={(e) => {
                  const scale = parseInt(e.target.value);
                  const newSettings = {...crackSettings, scaleX: scale, scaleY: scale};
                  setCrackSettings(newSettings);
                  if (window.setCrackDebug) window.setCrackDebug(newSettings);
                }}
                className="w-full h-1 bg-gray-600"
              />
            </div>
          </div>
        )}
      </details>


      <details open={expandedSections.laserFx} className="mb-2 border border-orange-600/30 rounded">
        <summary
          className="cursor-pointer text-orange-300 font-bold text-xs p-1 hover:bg-orange-900/20"
          onClick={(e) => {
            e.preventDefault();
            toggleSection('laserFx');
          }}
        >
          {expandedSections.laserFx ? '▼' : '▶'} 🔫 LASER FX
        </summary>
        {expandedSections.laserFx && (
          <div className="p-1">
            <div className="mb-2 flex items-center gap-2">
              <select
                value={selectedPreset}
                onChange={(e) => {
                  setSelectedPreset(e.target.value);
                  loadLaserPreset(e.target.value);
                }}
                className="bg-black/60 border border-orange-700 rounded px-2 py-1 text-xs text-orange-200"
              >
                {Object.entries(laserPresets).map(([id, preset]) => (
                  <option key={id} value={id}>
                    {preset ? `${id}: ${preset.name}` : `${id}: Empty`}
                  </option>
                ))}
              </select>
              <button
                onClick={saveLaserPreset}
                className="bg-orange-900/50 border border-orange-600 rounded px-2 py-1 text-xs hover:bg-orange-800/60"
              >
                Save
              </button>
              <button
                onClick={deleteLaserPreset}
                className="bg-red-900/50 border border-red-600 rounded px-2 py-1 text-xs hover:bg-red-800/60"
              >
                Delete
              </button>
            </div>

        <SliderControl label="Hold (ms)" value={beamSettings.holdMs} min={0} max={300} step={10}
          onChange={(v) => updateBeamSetting('holdMs', v)} />
        <SliderControl label="Fade (ms)" value={beamSettings.fadeMs} min={100} max={1000} step={10}
          onChange={(v) => updateBeamSetting('fadeMs', v)} />
        <SliderControl label="Flash Duration" value={beamSettings.flashMs} min={0} max={200} step={10}
          onChange={(v) => updateBeamSetting('flashMs', v)} />
        <SliderControl label="Flash Size" value={beamSettings.flashSize} min={0} max={3} step={0.1}
          formatValue={(v) => v.toFixed(1)}
          onChange={(v) => updateBeamSetting('flashSize', v)} />
        <SliderControl label="Flash Opacity" value={beamSettings.flashOpacity} min={0} max={1} step={0.05}
          formatValue={(v) => v.toFixed(2)}
          onChange={(v) => updateBeamSetting('flashOpacity', v)} />
        <SliderControl label="Core Radius" value={beamSettings.coreRadius} min={0.01} max={0.2} step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(v) => updateBeamSetting('coreRadius', v)} />
        <SliderControl label="Glow Radius" value={beamSettings.glowRadius} min={0.05} max={1} step={0.05}
          formatValue={(v) => v.toFixed(2)}
          onChange={(v) => updateBeamSetting('glowRadius', v)} />
        <SliderControl label="Bloom Radius" value={beamSettings.bloomRadius} min={0.2} max={2} step={0.1}
          formatValue={(v) => v.toFixed(1)}
          onChange={(v) => updateBeamSetting('bloomRadius', v)} />
        <SliderControl label="Glow Opacity" value={beamSettings.glowOpacity} min={0} max={1} step={0.05}
          formatValue={(v) => v.toFixed(2)}
          onChange={(v) => updateBeamSetting('glowOpacity', v)} />
        <SliderControl label="Bloom Opacity" value={beamSettings.bloomOpacity} min={0} max={0.5} step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(v) => updateBeamSetting('bloomOpacity', v)} />

        <div className="text-orange-200 font-semibold text-xs mt-2 mb-1">COLOR:</div>

        <SliderControl label="Hue Shift" value={beamSettings.hueShift} min={-180} max={180} step={1}
          formatValue={(v) => `${Math.round(v)}°`}
          onChange={(v) => updateBeamSetting('hueShift', v)} />

        <div className="mb-1">
          <label className="text-xs block">Core Color</label>
          <div className="flex gap-2">
            <input type="color" value={beamSettings.coreColor}
              onChange={(e) => updateBeamSetting('coreColor', e.target.value)}
              className="h-5 w-8 cursor-pointer border border-orange-700 bg-black" />
            <span className="text-xs text-gray-400">{beamSettings.coreColor}</span>
          </div>
        </div>
        <div className="mb-1">
          <label className="text-xs block">Glow Color</label>
          <div className="flex gap-2">
            <input type="color" value={beamSettings.glowColor}
              onChange={(e) => updateBeamSetting('glowColor', e.target.value)}
              className="h-5 w-8 cursor-pointer border border-orange-700 bg-black" />
            <span className="text-xs text-gray-400">{beamSettings.glowColor}</span>
          </div>
        </div>
        <div className="mb-1">
          <label className="text-xs block">Bloom Color</label>
          <div className="flex gap-2">
            <input type="color" value={beamSettings.bloomColor}
              onChange={(e) => updateBeamSetting('bloomColor', e.target.value)}
              className="h-5 w-8 cursor-pointer border border-orange-700 bg-black" />
            <span className="text-xs text-gray-400">{beamSettings.bloomColor}</span>
          </div>
        </div>
        <div className="mb-1">
          <label className="text-xs block">Flash Color</label>
          <div className="flex gap-2">
            <input type="color" value={beamSettings.flashColor}
              onChange={(e) => updateBeamSetting('flashColor', e.target.value)}
              className="h-5 w-8 cursor-pointer border border-orange-700 bg-black" />
            <span className="text-xs text-gray-400">{beamSettings.flashColor}</span>
          </div>
        </div>

        <div className="text-orange-200 font-semibold text-xs mt-2 mb-1">SHAPE:</div>

        <SliderControl label="Beam Length" value={beamSettings.beamLength} min={200} max={3000} step={50}
          onChange={(v) => updateBeamSetting('beamLength', v)} />
        <SliderControl label="Taper Tip" value={beamSettings.taperTip} min={0.1} max={1} step={0.05}
          formatValue={(v) => v.toFixed(2)}
          onChange={(v) => updateBeamSetting('taperTip', v)} />

        <div className="text-orange-200 font-semibold text-xs mt-2 mb-1">EFFECTS:</div>

        <SliderControl label="Flicker" value={beamSettings.flicker} min={0} max={1} step={0.05}
          formatValue={(v) => v.toFixed(2)}
          onChange={(v) => updateBeamSetting('flicker', v)} />
          </div>
        )}
      </details>


      <details open={expandedSections.planetFx} className="mb-2 border border-cyan-700/30 rounded">
        <summary
          className="cursor-pointer text-cyan-300 font-bold text-xs p-1 hover:bg-cyan-900/20"
          onClick={(e) => {
            e.preventDefault();
            toggleSection('planetFx');
          }}
        >
          {expandedSections.planetFx ? '▼' : '▶'} 🪐 PLANET FX
        </summary>
        {expandedSections.planetFx && (
          <div className="p-1">

        <SliderControl
          label="Opacity"
          value={environmentSettings.planet.opacity}
          min={0}
          max={1}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(value) => updatePlanetSetting('opacity', value)}
        />
        <SliderControl
          label="Brightness"
          value={environmentSettings.planet.brightness}
          min={0}
          max={2}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(value) => updatePlanetSetting('brightness', value)}
        />
        <SliderControl
          label="All Planets Brightness"
          value={environmentSettings.planet.orbitalBrightness}
          min={0}
          max={3}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(value) => updatePlanetSetting('orbitalBrightness', value)}
        />
        <SliderControl
          label="All Planets Glow"
          value={environmentSettings.planet.orbitalGlow}
          min={0}
          max={2}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(value) => updatePlanetSetting('orbitalGlow', value)}
        />
        <SliderControl
          label="Hue"
          value={environmentSettings.planet.hue}
          min={-180}
          max={180}
          step={1}
          formatValue={(v) => `${Math.round(v)}°`}
          onChange={(value) => updatePlanetSetting('hue', value)}
        />
        <SliderControl
          label="Scale"
          value={environmentSettings.planet.scale}
          min={0.1}
          max={4}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(value) => updatePlanetSetting('scale', value)}
        />
        <SliderControl
          label="Pos X"
          value={environmentSettings.planet.positionX}
          min={-500}
          max={500}
          step={1}
          onChange={(value) => updatePlanetSetting('positionX', value)}
        />
        <SliderControl
          label="Pos Y"
          value={environmentSettings.planet.positionY}
          min={-500}
          max={500}
          step={1}
          onChange={(value) => updatePlanetSetting('positionY', value)}
        />
        <SliderControl
          label="Pos Z"
          value={environmentSettings.planet.positionZ}
          min={-500}
          max={500}
          step={1}
          onChange={(value) => updatePlanetSetting('positionZ', value)}
        />
        <SliderControl
          label="Rot X"
          value={environmentSettings.planet.rotationX}
          min={-180}
          max={180}
          step={1}
          formatValue={(v) => `${Math.round(v)}°`}
          onChange={(value) => updatePlanetSetting('rotationX', value)}
        />
        <SliderControl
          label="Rot Y"
          value={environmentSettings.planet.rotationY}
          min={-180}
          max={180}
          step={1}
          formatValue={(v) => `${Math.round(v)}°`}
          onChange={(value) => updatePlanetSetting('rotationY', value)}
        />
        <SliderControl
          label="Rot Z"
          value={environmentSettings.planet.rotationZ}
          min={-180}
          max={180}
          step={1}
          formatValue={(v) => `${Math.round(v)}°`}
          onChange={(value) => updatePlanetSetting('rotationZ', value)}
        />

        <button
          onClick={() => {
            setEnvironmentSettings(DEFAULT_ENVIRONMENT_DEBUG_SETTINGS);
            if (window.resetEnvironmentDebug) {
              window.resetEnvironmentDebug();
            } else if (window.setEnvironmentDebug) {
              window.setEnvironmentDebug(DEFAULT_ENVIRONMENT_DEBUG_SETTINGS);
            }
          }}
          className="mt-2 w-full text-xs bg-cyan-900/50 border border-cyan-600 rounded px-2 py-1 hover:bg-cyan-800/60"
        >
          Reset Environment FX
        </button>
          </div>
        )}
      </details>


      <details open={expandedSections.arenaGridFx} className="mb-2 border border-sky-700/30 rounded">
        <summary
          className="cursor-pointer text-sky-300 font-bold text-xs p-1 hover:bg-sky-900/20"
          onClick={(e) => {
            e.preventDefault();
            toggleSection('arenaGridFx');
          }}
        >
          {expandedSections.arenaGridFx ? '▼' : '▶'} 🧱 ARENA GRID FX
        </summary>
        {expandedSections.arenaGridFx && (
          <div className="p-1">

        <div className="mb-2">
          <label className="text-xs block mb-1">
            Line Hex Color
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={normalizeHexColor(lineColorHexInput, '#00ffff')}
              onChange={(e) => commitBoundaryHex('lineColorHex', e.target.value, '#00ffff')}
              className="h-6 w-10 cursor-pointer border border-sky-700 bg-black"
            />
            <input
              type="text"
              value={lineColorHexInput}
              onChange={(e) => setLineColorHexInput(e.target.value)}
              onBlur={() => commitBoundaryHex('lineColorHex', lineColorHexInput, '#00ffff')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitBoundaryHex('lineColorHex', lineColorHexInput, '#00ffff');
                }
              }}
              placeholder="#00ffff"
              className="flex-1 bg-black/60 border border-sky-700 rounded px-2 py-1 text-xs text-cyan-200"
            />
          </div>
        </div>

        <div className="mb-2">
          <label className="text-xs block mb-1">
            Panel Hex Color
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={normalizeHexColor(panelColorHexInput, normalizeHexColor(lineColorHexInput, '#00ffff'))}
              onChange={(e) => commitBoundaryHex('panelColorHex', e.target.value, normalizeHexColor(lineColorHexInput, '#00ffff'))}
              className="h-6 w-10 cursor-pointer border border-sky-700 bg-black"
            />
            <input
              type="text"
              value={panelColorHexInput}
              onChange={(e) => setPanelColorHexInput(e.target.value)}
              onBlur={() => commitBoundaryHex('panelColorHex', panelColorHexInput, normalizeHexColor(lineColorHexInput, '#00ffff'))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitBoundaryHex('panelColorHex', panelColorHexInput, normalizeHexColor(lineColorHexInput, '#00ffff'));
                }
              }}
              placeholder="#00ffff"
              className="flex-1 bg-black/60 border border-sky-700 rounded px-2 py-1 text-xs text-cyan-200"
            />
          </div>
        </div>

        <SliderControl
          label="Animation Speed"
          value={environmentSettings.boundary.animationSpeed}
          min={0}
          max={2}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(value) => updateBoundarySetting('animationSpeed', value)}
        />
        <SliderControl
          label="Pulse Speed"
          value={environmentSettings.boundary.pulseSpeed}
          min={0}
          max={4}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(value) => updateBoundarySetting('pulseSpeed', value)}
        />
        <SliderControl
          label="Pulse Amount"
          value={environmentSettings.boundary.pulseAmount}
          min={0}
          max={0.6}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(value) => updateBoundarySetting('pulseAmount', value)}
        />
        <SliderControl
          label="Scan Speed"
          value={environmentSettings.boundary.scanSpeed}
          min={0}
          max={4}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(value) => updateBoundarySetting('scanSpeed', value)}
        />
        <SliderControl
          label="Scan Amount"
          value={environmentSettings.boundary.scanAmount}
          min={0}
          max={0.6}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(value) => updateBoundarySetting('scanAmount', value)}
        />
        <SliderControl
          label="Edge Tint"
          value={environmentSettings.boundary.edgeTint}
          min={0}
          max={1}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(value) => updateBoundarySetting('edgeTint', value)}
        />
        <SliderControl
          label="Player Reactive"
          value={environmentSettings.boundary.distanceReactive}
          min={0}
          max={1}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(value) => updateBoundarySetting('distanceReactive', value)}
        />

        <SliderControl
          label="Line Opacity"
          value={environmentSettings.boundary.lineOpacity}
          min={0}
          max={1}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(value) => updateBoundarySetting('lineOpacity', value)}
        />
        <SliderControl
          label="Line Brightness"
          value={environmentSettings.boundary.brightness}
          min={0}
          max={4}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(value) => updateBoundarySetting('brightness', value)}
        />
        <SliderControl
          label="Line Glow"
          value={environmentSettings.boundary.glowIntensity}
          min={0}
          max={3}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(value) => updateBoundarySetting('glowIntensity', value)}
        />
        <SliderControl
          label="Panel Opacity"
          value={environmentSettings.boundary.panelOpacity}
          min={0}
          max={0.8}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(value) => updateBoundarySetting('panelOpacity', value)}
        />
        <SliderControl
          label="Panel Brightness"
          value={environmentSettings.boundary.panelBrightness}
          min={0}
          max={3}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(value) => updateBoundarySetting('panelBrightness', value)}
        />
        <SliderControl
          label="Grid Hue"
          value={environmentSettings.boundary.hue}
          min={-180}
          max={180}
          step={1}
          formatValue={(v) => `${Math.round(v)}°`}
          onChange={(value) => updateBoundarySetting('hue', value)}
        />
          </div>
        )}
      </details>


      <details open={expandedSections.externalArenaLights} className="mb-2 border border-amber-700/30 rounded">
        <summary
          className="cursor-pointer text-amber-300 font-bold text-xs p-1 hover:bg-amber-900/20"
          onClick={(e) => {
            e.preventDefault();
            toggleSection('externalArenaLights');
          }}
        >
          {expandedSections.externalArenaLights ? '▼' : '▶'} 💡 EXTERNAL ARENA LIGHTS
        </summary>
        {expandedSections.externalArenaLights && (
          <div className="p-1">

        <div className="flex items-center gap-2 mb-2">
          <label className="text-xs">Enable:</label>
          <input
            type="checkbox"
            checked={externalLights.enabled}
            onChange={(e) => updateExternalLightSetting('enabled', e.target.checked)}
          />
        </div>

        <div className="flex items-center gap-2 mb-2">
          <label className="text-xs">Link All Faces:</label>
          <input
            type="checkbox"
            checked={externalLights.linkAllFaces}
            onChange={(e) => updateExternalLightSetting('linkAllFaces', e.target.checked)}
          />
        </div>

        <div className="mb-2">
          <label className="text-xs block mb-1">
            Global Hex Color
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={normalizeHexColor(externalGlobalColorInput, '#7cc8ff')}
              onChange={(e) => commitExternalGlobalHex(e.target.value)}
              className="h-6 w-10 cursor-pointer border border-amber-700 bg-black"
            />
            <input
              type="text"
              value={externalGlobalColorInput}
              onChange={(e) => setExternalGlobalColorInput(e.target.value)}
              onBlur={() => commitExternalGlobalHex(externalGlobalColorInput)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitExternalGlobalHex(externalGlobalColorInput);
                }
              }}
              placeholder="#7cc8ff"
              className="flex-1 bg-black/60 border border-amber-700 rounded px-2 py-1 text-xs text-amber-200"
            />
          </div>
        </div>

        <SliderControl
          label="Global Intensity"
          value={externalLights.globalIntensity}
          min={0}
          max={2}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(value) => updateExternalLightSetting('globalIntensity', value)}
        />
        <SliderControl
          label="Global Distance"
          value={externalLights.globalDistance}
          min={0}
          max={5000}
          step={10}
          formatValue={(v) => (v <= 0 ? 'Infinite' : Math.round(v))}
          onChange={(value) => updateExternalLightSetting('globalDistance', value)}
        />
        <SliderControl
          label="Global Decay"
          value={externalLights.globalDecay}
          min={0}
          max={3}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(value) => updateExternalLightSetting('globalDecay', value)}
        />
        <SliderControl
          label="Outside Offset"
          value={externalLights.outsideOffset}
          min={0}
          max={1200}
          step={1}
          formatValue={(v) => `${Math.round(v)} u`}
          onChange={(value) => updateExternalLightSetting('outsideOffset', value)}
        />
        <SliderControl
          label="Cone Angle"
          value={externalLights.coneAngle}
          min={0.2}
          max={1.4}
          step={0.01}
          formatValue={(v) => `${v.toFixed(2)} rad`}
          onChange={(value) => updateExternalLightSetting('coneAngle', value)}
        />
        <SliderControl
          label="Penumbra"
          value={externalLights.penumbra}
          min={0}
          max={1}
          step={0.01}
          formatValue={(v) => v.toFixed(2)}
          onChange={(value) => updateExternalLightSetting('penumbra', value)}
        />

        {!externalLights.linkAllFaces && (
          <div className="mt-2 border-t border-amber-900/50 pt-2">
            <div className="text-amber-200 font-semibold text-xs mb-1">
              Per-Face Tuning
            </div>
            {FACE_KEYS.map((faceKey) => {
              const faceSettings = externalLights.perFace?.[faceKey] || DEFAULT_EXTERNAL_FACE_LIGHT;
              return (
                <details key={faceKey} className="mb-2 border border-amber-900/60 rounded p-1">
                  <summary className="cursor-pointer text-xs text-amber-100">
                    {FACE_LABELS[faceKey]} Face
                  </summary>
                  <div className="mt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-xs">Enable:</label>
                      <input
                        type="checkbox"
                        checked={faceSettings.enabled}
                        onChange={(e) => updateExternalFaceSetting(faceKey, 'enabled', e.target.checked)}
                      />
                    </div>

                    <div className="mb-1">
                      <label className="text-xs block mb-1">Face Hex Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={normalizeHexColor(externalFaceColorInputs[faceKey], '#7cc8ff')}
                          onChange={(e) => commitExternalFaceHex(faceKey, e.target.value)}
                          className="h-6 w-10 cursor-pointer border border-amber-700 bg-black"
                        />
                        <input
                          type="text"
                          value={externalFaceColorInputs[faceKey] || '#7cc8ff'}
                          onChange={(e) => {
                            const nextColorInputs = {
                              ...externalFaceColorInputs,
                              [faceKey]: e.target.value
                            };
                            setExternalFaceColorInputs(nextColorInputs);
                          }}
                          onBlur={() => commitExternalFaceHex(faceKey, externalFaceColorInputs[faceKey])}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              commitExternalFaceHex(faceKey, externalFaceColorInputs[faceKey]);
                            }
                          }}
                          placeholder="#7cc8ff"
                          className="flex-1 bg-black/60 border border-amber-700 rounded px-2 py-1 text-xs text-amber-200"
                        />
                      </div>
                    </div>

                    <SliderControl
                      label="Intensity Mult"
                      value={faceSettings.intensityMultiplier}
                      min={0}
                      max={2}
                      step={0.01}
                      formatValue={(v) => v.toFixed(2)}
                      onChange={(value) => updateExternalFaceSetting(faceKey, 'intensityMultiplier', value)}
                    />
                    <SliderControl
                      label="Distance Mult"
                      value={faceSettings.distanceMultiplier}
                      min={0.2}
                      max={2}
                      step={0.01}
                      formatValue={(v) => v.toFixed(2)}
                      onChange={(value) => updateExternalFaceSetting(faceKey, 'distanceMultiplier', value)}
                    />
                  </div>
                </details>
              );
            })}
          </div>
        )}
          </div>
        )}
      </details>

      <div className="text-gray-400 text-xs mt-2 border-t border-gray-600 pt-2">
        <div>F12: Toggle overlay</div>
        <div>Click ✕: Hide</div>
      </div>
    </div>
  );
};

export default DebugOverlay;
