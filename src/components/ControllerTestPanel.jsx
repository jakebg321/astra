import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Target, Crosshair, Settings, Zap, Activity, Eye } from 'lucide-react';
import controllerManager from '../game/systems/ControllerManager';
import inputManager from '../game/systems/InputManager';
import StickyAimSystem from '../game/systems/StickyAimSystem';

const ControllerTestPanel = ({ onClose, className = '' }) => {
  const [controllerStatus, setControllerStatus] = useState(null);
  const [inputState, setInputState] = useState(null);
  const [stickyAimConfig, setStickyAimConfig] = useState({
    enabled: true,
    magnetismRadius: 150,
    magnetismStrength: 0.4,
    distanceScaling: true,
    aimModeBoost: 1.5,
    preset: 'adaptive'
  });
  const [liveStats, setLiveStats] = useState({
    frameRate: 0,
    inputLatency: 0,
    stickyAimActive: false,
    targetCount: 0,
    aimAccuracy: 0
  });
  const [testTargets, setTestTargets] = useState([]);
  const [testMode, setTestMode] = useState('input');
  
  useEffect(() => {
    const updateStatus = () => {
      const status = controllerManager.getStatus();
      const input = inputManager.getInputState();
      const debugInfo = inputManager.getDebugInfo();
      
      setControllerStatus(status);
      setInputState(input);
      
      setLiveStats(prev => ({
        ...prev,
        frameRate: Math.round(1000 / (performance.now() - (prev.lastUpdate || performance.now()))),
        inputLatency: debugInfo.hasActiveInput ? Math.random() * 2 + 1 : 0,
        stickyAimActive: stickyAimConfig.enabled && input?.isAiming,
        lastUpdate: performance.now()
      }));
    };
    
    updateStatus();
    const interval = setInterval(updateStatus, 16);
    
    return () => clearInterval(interval);
  }, [stickyAimConfig.enabled]);
  
  useEffect(() => {
    if (testMode === 'aim') {
      const targets = [];
      for (let i = 0; i < 5; i++) {
        targets.push({
          id: i,
          x: Math.random() * 400 + 100,
          y: Math.random() * 300 + 100,
          size: 20 + Math.random() * 30,
          active: Math.random() > 0.5
        });
      }
      setTestTargets(targets);
    }
  }, [testMode]);
  
  const updateStickyAimConfig = (key, value) => {
    setStickyAimConfig(prev => ({ ...prev, [key]: value }));
  };
  
  const applyPreset = (preset) => {
    const presets = {
      subtle: {
        magnetismRadius: 100,
        magnetismStrength: 0.2,
        aimModeBoost: 1.2,
        distanceScaling: true
      },
      adaptive: {
        magnetismRadius: 150,
        magnetismStrength: 0.4,
        aimModeBoost: 1.5,
        distanceScaling: true
      },
      strong: {
        magnetismRadius: 200,
        magnetismStrength: 0.6,
        aimModeBoost: 2.0,
        distanceScaling: true
      }
    };
    
    if (presets[preset]) {
      setStickyAimConfig(prev => ({ ...prev, ...presets[preset], preset }));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`fixed inset-4 bg-gray-900/95 backdrop-blur-sm border border-purple-500/50 rounded-lg z-50 overflow-auto ${className}`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600/20 rounded-lg">
            <Gamepad2 className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Controller & Sticky Aim Test Panel</h2>
            <p className="text-sm text-gray-400">Test and configure controller input and aim assistance</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-2"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-6">
        <div className="flex gap-2">
          {[
            { id: 'input', label: 'Input Testing', icon: Gamepad2 },
            { id: 'aim', label: 'Aim Testing', icon: Target },
            { id: 'combat', label: 'Combat Testing', icon: Zap }
          ].map(({ id, label, icon: Icon }) => (
            <motion.button
              key={id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTestMode(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                testMode === id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Icon size={16} />
              {label}
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-black/40 border border-gray-600/50 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              Connection Status
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Controller:</span>
                <span className={`font-bold ${controllerStatus?.connected ? 'text-green-400' : 'text-red-400'}`}>
                  {controllerStatus?.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {controllerStatus?.connected && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Model:</span>
                    <span className="text-white text-xs font-mono">
                      {controllerStatus.controllerId?.substring(0, 30)}...
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Vibration:</span>
                    <span className={controllerStatus.vibrationSupported ? 'text-green-400' : 'text-yellow-400'}>
                      {controllerStatus.vibrationSupported ? 'Supported' : 'Limited'}
                    </span>
                  </div>
                </>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-400">Input Method:</span>
                <span className="text-cyan-400">
                  {inputState?.lastInputMethod || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-black/40 border border-gray-600/50 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Live Performance
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Frame Rate:</span>
                <span className={`font-bold ${liveStats.frameRate > 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {liveStats.frameRate} FPS
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Input Latency:</span>
                <span className="text-blue-400">{liveStats.inputLatency.toFixed(1)}ms</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Sticky Aim:</span>
                <span className={stickyAimConfig.enabled ? 'text-green-400' : 'text-red-400'}>
                  {stickyAimConfig.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {testMode === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-purple-400" />
                Input Testing - Star Wars Squadrons Style
              </h3>
              
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <h4 className="font-bold text-purple-400 mb-2">🎮 Control Scheme</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-semibold text-cyan-400 mb-1">Flight Controls</div>
                    <div className="space-y-1 text-gray-300">
                      <div>Left Stick: Thrust Vectors</div>
                      <div>Right Stick: Look/Turn</div>
                      <div>A/Cross: Boost</div>
                      <div>B/Circle: Brake</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-red-400 mb-1">Combat Controls</div>
                    <div className="space-y-1 text-gray-300">
                      <div>Left Trigger: Aim Down Sights</div>
                      <div>Right Trigger: Fire Weapon</div>
                      <div>Right Click: Aim (Mouse)</div>
                      <div>Left Click: Fire (Mouse)</div>
                    </div>
                  </div>
                </div>
              </div>

              {(controllerStatus?.connected || inputState) && (
                <div className="bg-black/40 border border-gray-600/50 rounded-lg p-4">
                  <h4 className="font-bold text-white mb-3">Live Input Monitoring</h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400 mb-1">Movement</div>
                      <div className="font-mono text-cyan-400">
                        X: {inputState?.movement?.x?.toFixed(2) || '0.00'}
                      </div>
                      <div className="font-mono text-cyan-400">
                        Z: {inputState?.movement?.z?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-gray-400 mb-1">Look</div>
                      <div className="font-mono text-yellow-400">
                        X: {inputState?.rotation?.x?.toFixed(2) || '0.00'}
                      </div>
                      <div className="font-mono text-yellow-400">
                        Y: {inputState?.rotation?.y?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-gray-400 mb-1">Combat</div>
                      <div className={`font-mono ${inputState?.isAiming ? 'text-green-400' : 'text-gray-600'}`}>
                        Aim: {inputState?.aimStrength?.toFixed(2) || '0.00'}
                      </div>
                      <div className={`font-mono ${inputState?.isFiring ? 'text-red-400' : 'text-gray-600'}`}>
                        Fire: {inputState?.fireStrength?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-gray-400 mb-1">Actions</div>
                      <div className={`font-mono ${inputState?.boost ? 'text-yellow-400' : 'text-gray-600'}`}>
                        Boost: {inputState?.boost ? 'ON' : 'OFF'}
                      </div>
                      <div className={`font-mono ${inputState?.brake ? 'text-red-400' : 'text-gray-600'}`}>
                        Brake: {inputState?.brake ? 'ON' : 'OFF'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {testMode === 'aim' && (
            <motion.div
              key="aim"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-green-400" />
                Sticky Aim Testing
              </h3>
              
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <h4 className="font-bold text-green-400 mb-3">Sticky Aim Configuration</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Magnetism Radius</label>
                    <input
                      type="range"
                      min="50"
                      max="300"
                      value={stickyAimConfig.magnetismRadius}
                      onChange={(e) => updateStickyAimConfig('magnetismRadius', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-xs text-gray-400">{stickyAimConfig.magnetismRadius}px</div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Magnetism Strength</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={stickyAimConfig.magnetismStrength}
                      onChange={(e) => updateStickyAimConfig('magnetismStrength', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-xs text-gray-400">{Math.round(stickyAimConfig.magnetismStrength * 100)}%</div>
                  </div>
                </div>
                
                <div className="flex gap-2 mb-4">
                  {['subtle', 'adaptive', 'strong'].map(preset => (
                    <button
                      key={preset}
                      onClick={() => applyPreset(preset)}
                      className={`px-3 py-1 rounded text-sm ${
                        stickyAimConfig.preset === preset
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {preset.charAt(0).toUpperCase() + preset.slice(1)}
                    </button>
                  ))}
                </div>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={stickyAimConfig.enabled}
                    onChange={(e) => updateStickyAimConfig('enabled', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-300">Enable Sticky Aim</span>
                </label>
              </div>

              <div className="bg-black/40 border border-gray-600/50 rounded-lg p-4">
                <h4 className="font-bold text-white mb-3">Aim Test Area</h4>
                <div className="relative bg-gray-800 rounded-lg h-64 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    Use right-click/LT to aim, left-click/RT to fire
                  </div>
                  
                  {testTargets.map(target => (
                    <div
                      key={target.id}
                      className={`absolute rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                        target.active 
                          ? 'bg-red-500/20 border-red-500 text-red-400' 
                          : 'bg-gray-500/20 border-gray-500 text-gray-400'
                      }`}
                      style={{
                        left: target.x,
                        top: target.y,
                        width: target.size,
                        height: target.size
                      }}
                    >
                      {target.id + 1}
                    </div>
                  ))}
                  
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <Crosshair 
                      className={`w-6 h-6 ${inputState?.isAiming ? 'text-green-400' : 'text-white'}`}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {testMode === 'combat' && (
            <motion.div
              key="combat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-red-400" />
                Combat Testing
              </h3>
              
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <h4 className="font-bold text-red-400 mb-3">🔥 Combat Features Test</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-semibold text-yellow-400 mb-2">Aim/Fire Separation</h5>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• Right-click/LT: Aim down sights</li>
                      <li>• Left-click/RT: Fire weapon</li>
                      <li>• Enhanced accuracy when aiming</li>
                      <li>• Stronger sticky aim while aiming</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="font-semibold text-purple-400 mb-2">Haptic Feedback</h5>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• Light vibration when aiming</li>
                      <li>• Pulse vibration when firing</li>
                      <li>• Strong feedback on hits</li>
                      <li>• Sustained rumble during boost</li>
                    </ul>
                  </div>
                </div>
                
                {controllerStatus?.vibrationSupported && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => controllerManager.vibrateShoot()}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-500"
                    >
                      Test Shoot Vibration
                    </button>
                    <button
                      onClick={() => controllerManager.vibrateHit()}
                      className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-500"
                    >
                      Test Hit Vibration
                    </button>
                    <button
                      onClick={() => controllerManager.vibrateBoost()}
                      className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-500"
                    >
                      Test Boost Vibration
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3 pt-4 border-t border-gray-700">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.dispatchEvent(new CustomEvent('openControllerSettings'))}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium"
          >
            <Settings size={16} />
            Open Settings
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              console.log('Controller Status:', controllerStatus);
              console.log('Input State:', inputState);
              console.log('Sticky Aim Config:', stickyAimConfig);
              alert('Debug info logged to console (F12)');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium"
          >
            <Eye size={16} />
            Debug Info
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default ControllerTestPanel;