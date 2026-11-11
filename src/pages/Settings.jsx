import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { motion } from 'framer-motion';
import GameTutorial from '../components/GameTutorial';
import gameSettingsService from '../services/gameSettingsService';

const Settings = () => {
  const navigate = useNavigate();
  const [showTutorial, setShowTutorial] = useState(false);
  
  const [settings, setSettings] = useState({
    mouseSensitivity: gameSettingsService.get('mouseSensitivity'),
    invertY: gameSettingsService.get('invertY'),
    noRollStrafe: gameSettingsService.get('noRollStrafe'),
    visualRollOnly: gameSettingsService.get('visualRollOnly'),
    cameraMomentum: gameSettingsService.get('cameraMomentum'),
    cameraMode: gameSettingsService.get('cameraMode'),
    cameraDistance: gameSettingsService.get('cameraDistance'),
    boostCameraDistance: gameSettingsService.get('boostCameraDistance'),
    cameraSmoothing: gameSettingsService.get('cameraSmoothing'),
    boostCameraSmoothing: gameSettingsService.get('boostCameraSmoothing'),
    speedBasedCamera: gameSettingsService.get('speedBasedCamera'),
    cameraDistanceMin: gameSettingsService.get('cameraDistanceMin'),
    cameraDistanceMax: gameSettingsService.get('cameraDistanceMax'),
    universalSpeedMultiplier: gameSettingsService.get('universalSpeedMultiplier'),
    showDevSettings: gameSettingsService.get('showDevSettings')
  });

  useEffect(() => {
    gameSettingsService.setMultiple(settings);
    
    if (window.gameSettings) {
      window.gameSettings = { ...settings };
    }
  }, [settings]);

  const handleSliderChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: parseFloat(value)
    }));
  };

  const handleToggle = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const resetToDefaults = () => {
    setSettings({
      mouseSensitivity: 0.002,
      invertY: false,
      noRollStrafe: false,
      visualRollOnly: false,
      cameraMomentum: false,
      cameraMode: 'simple',
      cameraDistance: 12,
      boostCameraDistance: 1.3,
      cameraSmoothing: 0.15,
      boostCameraSmoothing: 0.20,
      speedBasedCamera: false,
      cameraDistanceMin: 0.8,
      cameraDistanceMax: 1.3,
      universalSpeedMultiplier: 1.0,
      showDevSettings: false
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Game Settings</h1>
          <p className="text-gray-400">Customize your flight controls</p>
        </div>

        <div className="bg-slate-800/90 border border-cyan-500/30 rounded-lg p-6 space-y-6">
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-cyan-300">
              Mouse Sensitivity: {settings.mouseSensitivity.toFixed(3)}
            </label>
            <input
              type="range"
              min="0.001"
              max="0.005"
              step="0.0001"
              value={settings.mouseSensitivity}
              onChange={(e) => handleSliderChange('mouseSensitivity', e.target.value)}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Slow</span>
              <span>Fast</span>
            </div>
          </div>


          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-cyan-300">
              Invert Y-Axis (Look)
            </label>
            <button
              onClick={() => handleToggle('invertY')}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                settings.invertY ? 'bg-cyan-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                  settings.invertY ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
            <label className="text-sm font-medium text-gray-400">
              Show Developer Settings
            </label>
            <button
              onClick={() => handleToggle('showDevSettings')}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                settings.showDevSettings ? 'bg-purple-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                  settings.showDevSettings ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>


          {settings.showDevSettings && (
            <div className="mt-4 p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg space-y-4">
              <h3 className="text-sm font-medium text-purple-300 mb-2">Developer Settings</h3>
              

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-purple-300">
                    No-Roll Strafe
                  </label>
                  <p className="text-xs text-gray-400 mt-1">
                    Keep ship centered while strafing (easier aiming)
                  </p>
                </div>
                <button
                  onClick={() => handleToggle('noRollStrafe')}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                    settings.noRollStrafe ? 'bg-cyan-500' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                      settings.noRollStrafe ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-purple-300">
                    Visual Roll Only
                  </label>
                  <p className="text-xs text-gray-400 mt-1">
                    Ship rolls visually but crosshair stays centered
                  </p>
                </div>
                <button
                  onClick={() => handleToggle('visualRollOnly')}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                    settings.visualRollOnly ? 'bg-cyan-500' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                      settings.visualRollOnly ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-purple-300">
                  Camera Style
                </label>
                <select
                  value={settings.cameraMode}
                  onChange={(e) => setSettings(prev => ({ ...prev, cameraMode: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="simple">Simple - Basic following</option>
                  <option value="momentum">Momentum - Pro physics with lag</option>
                  <option value="arcade">Arcade - Star Fox style (instant)</option>
                  <option value="racing">Racing - Speed-based distance</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Choose your preferred camera behavior
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-purple-300">
                  Camera Distance: {settings.cameraDistance.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="6"
                  max="20"
                  step="0.5"
                  value={settings.cameraDistance}
                  onChange={(e) => handleSliderChange('cameraDistance', e.target.value)}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Close (6)</span>
                  <span>Far (20)</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  How far back the camera sits from your ship
                </p>
              </div>
              
              <div className="mt-4 p-3 bg-cyan-900/20 border border-cyan-700/50 rounded-lg space-y-3">
                <h4 className="text-xs font-medium text-cyan-300 uppercase">Boost Camera</h4>
                
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-cyan-300">
                    Boost Distance: {settings.boostCameraDistance.toFixed(2)}x
                  </label>
                  <input
                    type="range"
                    min="1.0"
                    max="1.5"
                    step="0.05"
                    value={settings.boostCameraDistance}
                    onChange={(e) => handleSliderChange('boostCameraDistance', e.target.value)}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>1.0x (No change)</span>
                    <span>1.5x (Far)</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-cyan-300">
                    Camera Smoothing: {settings.cameraSmoothing.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.30"
                    step="0.01"
                    value={settings.cameraSmoothing}
                    onChange={(e) => handleSliderChange('cameraSmoothing', e.target.value)}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Smooth (0.05)</span>
                    <span>Snappy (0.30)</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-cyan-300">
                    Boost Smoothing: {settings.boostCameraSmoothing.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.30"
                    step="0.01"
                    value={settings.boostCameraSmoothing}
                    onChange={(e) => handleSliderChange('boostCameraSmoothing', e.target.value)}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Smooth (0.05)</span>
                    <span>Snappy (0.30)</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-red-900/20 border border-red-700/50 rounded-lg space-y-3">
                <h4 className="text-xs font-medium text-red-300 uppercase">Universal Speed Control</h4>
                
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-red-300">
                    Speed Multiplier: {settings.universalSpeedMultiplier?.toFixed(2) || '1.00'}x
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={settings.universalSpeedMultiplier || 1.0}
                    onChange={(e) => handleSliderChange('universalSpeedMultiplier', e.target.value)}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>0.1x (Very Slow)</span>
                    <span>3.0x (Very Fast)</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Affects movement speed for ALL players before match starts
                  </p>
                </div>
              </div>


              <div className="mt-4 p-3 bg-orange-900/20 border border-orange-700/50 rounded-lg space-y-3">
                <h4 className="text-xs font-medium text-orange-300 uppercase">Speed-Based Camera</h4>
                

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-medium text-orange-300">
                      Dynamic Distance
                    </label>
                    <p className="text-xs text-gray-400 mt-1">
                      Camera pulls back with speed
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle('speedBasedCamera')}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                      settings.speedBasedCamera ? 'bg-orange-500' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                        settings.speedBasedCamera ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                {settings.speedBasedCamera && (
                  <>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-orange-300">
                        Min Distance: {settings.cameraDistanceMin.toFixed(2)}x
                      </label>
                      <input
                        type="range"
                        min="0.6"
                        max="1.0"
                        step="0.05"
                        value={settings.cameraDistanceMin}
                        onChange={(e) => handleSliderChange('cameraDistanceMin', e.target.value)}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-orange-300">
                        Max Distance: {settings.cameraDistanceMax.toFixed(2)}x
                      </label>
                      <input
                        type="range"
                        min="1.0"
                        max="1.5"
                        step="0.05"
                        value={settings.cameraDistanceMax}
                        onChange={(e) => handleSliderChange('cameraDistanceMax', e.target.value)}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3 pt-4 border-t border-gray-700">
            <button
              onClick={resetToDefaults}
              className="w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              Reset to Defaults
            </button>
            
            <button
              onClick={() => navigate('/game')}
              className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              Save & Return to Game
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              Back to Menu
            </button>
          </div>
        </div>

        <div className="mt-6 bg-slate-800/90 border border-cyan-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-cyan-300">Tutorial</h3>
            <Info className="w-5 h-5 text-cyan-400" />
          </div>
          
          <p className="text-sm text-gray-400 mb-4">
            Review the game tutorial and controls at any time.
          </p>
          
          <button
            onClick={() => setShowTutorial(true)}
            className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            View Tutorial
          </button>
        </div>

        <div className="mt-6 bg-slate-800/50 border border-gray-700/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-cyan-300 mb-2">Controls</h3>
          <div className="text-xs text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Movement:</span>
              <span>WASD / Arrow Keys</span>
            </div>
            <div className="flex justify-between">
              <span>Up/Down:</span>
              <span>Q / E</span>
            </div>
            <div className="flex justify-between">
              <span>Boost:</span>
              <span>Space</span>
            </div>
            <div className="flex justify-between">
              <span>Fire:</span>
              <span>Left Click</span>
            </div>
            <div className="flex justify-between">
              <span>Look:</span>
              <span>Mouse</span>
            </div>
          </div>
        </div>
      </div>
      
      <GameTutorial
        isOpen={showTutorial}
        onComplete={() => setShowTutorial(false)}
        isFirstTime={false}
      />
    </div>
  );
};

export default Settings;