import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Move3D, RotateCw, Maximize, Minimize } from 'lucide-react';

const RadarPositionDebug = ({ isVisible, onPositionChange, onRotationChange, onScaleChange }) => {
  const [position, setPosition] = useState({ x: 0.4, y: -0.3, z: -0.7 });
  const [rotation, setRotation] = useState({ x: -0.2, y: 0.1, z: 0 });
  const [scale, setScale] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const savedPosition = localStorage.getItem('radar3d_position');
    const savedRotation = localStorage.getItem('radar3d_rotation');
    const savedScale = localStorage.getItem('radar3d_scale');
    
    if (savedPosition) {
      const pos = JSON.parse(savedPosition);
      setPosition(pos);
      onPositionChange?.(pos);
    }
    
    if (savedRotation) {
      const rot = JSON.parse(savedRotation);
      setRotation(rot);
      onRotationChange?.(rot);
    }
    
    if (savedScale) {
      const scl = parseFloat(savedScale);
      setScale(scl);
      onScaleChange?.(scl);
    }
  }, []);

  const updatePosition = (axis, value) => {
    const newPosition = { ...position, [axis]: value };
    setPosition(newPosition);
    localStorage.setItem('radar3d_position', JSON.stringify(newPosition));
    onPositionChange?.(newPosition);
  };

  const updateRotation = (axis, value) => {
    const newRotation = { ...rotation, [axis]: value };
    setRotation(newRotation);
    localStorage.setItem('radar3d_rotation', JSON.stringify(newRotation));
    onRotationChange?.(newRotation);
  };

  const updateScale = (value) => {
    setScale(value);
    localStorage.setItem('radar3d_scale', value.toString());
    onScaleChange?.(value);
  };

  const resetToDefaults = () => {
    const defaultPos = { x: 0.4, y: -0.3, z: -0.7 };
    const defaultRot = { x: -0.2, y: 0.1, z: 0 };
    const defaultScale = 1;
    
    setPosition(defaultPos);
    setRotation(defaultRot);
    setScale(defaultScale);
    
    localStorage.setItem('radar3d_position', JSON.stringify(defaultPos));
    localStorage.setItem('radar3d_rotation', JSON.stringify(defaultRot));
    localStorage.setItem('radar3d_scale', defaultScale.toString());
    
    onPositionChange?.(defaultPos);
    onRotationChange?.(defaultRot);
    onScaleChange?.(defaultScale);
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 right-4 bg-black/90 backdrop-blur-sm border border-purple-500/50 rounded-lg p-4 text-white z-50"
      style={{ width: isExpanded ? '400px' : '300px' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Move3D className="text-purple-400" size={20} />
          <h3 className="text-white font-semibold">3D Radar Debug</h3>
          <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-1 rounded">Camera-Relative</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-purple-500/20 rounded text-purple-400"
          >
            {isExpanded ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <button
            onClick={resetToDefaults}
            className="px-2 py-1 text-xs bg-purple-500/20 hover:bg-purple-500/30 rounded"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm text-purple-300 font-medium">Position</div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 w-4">X:</label>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.1"
              value={position.x}
              onChange={(e) => updatePosition('x', parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-gray-300 w-12">{position.x.toFixed(1)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 w-4">Y:</label>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.1"
              value={position.y}
              onChange={(e) => updatePosition('y', parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-gray-300 w-12">{position.y.toFixed(1)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 w-4">Z:</label>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.1"
              value={position.z}
              onChange={(e) => updatePosition('z', parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-gray-300 w-12">{position.z.toFixed(1)}</span>
          </div>
        </div>

        {isExpanded && (
          <>
            <div className="text-sm text-purple-300 font-medium mt-4">Rotation</div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 w-4">X:</label>
                <input
                  type="range"
                  min={-Math.PI}
                  max={Math.PI}
                  step="0.1"
                  value={rotation.x}
                  onChange={(e) => updateRotation('x', parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-gray-300 w-12">{(rotation.x * 180 / Math.PI).toFixed(0)}°</span>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 w-4">Y:</label>
                <input
                  type="range"
                  min={-Math.PI}
                  max={Math.PI}
                  step="0.1"
                  value={rotation.y}
                  onChange={(e) => updateRotation('y', parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-gray-300 w-12">{(rotation.y * 180 / Math.PI).toFixed(0)}°</span>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 w-4">Z:</label>
                <input
                  type="range"
                  min={-Math.PI}
                  max={Math.PI}
                  step="0.1"
                  value={rotation.z}
                  onChange={(e) => updateRotation('z', parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-gray-300 w-12">{(rotation.z * 180 / Math.PI).toFixed(0)}°</span>
              </div>
            </div>

            <div className="text-sm text-purple-300 font-medium mt-4">Scale</div>
            
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 w-12">Size:</label>
              <input
                type="range"
                min="0.01"
                max="10"
                step="0.1"
                value={scale}
                onChange={(e) => updateScale(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-gray-300 w-12">{scale.toFixed(1)}x</span>
            </div>
          </>
        )}

        <div className="text-sm text-purple-300 font-medium mt-4">Quick Presets</div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const preset = { x: 0, y: -0.1, z: -0.5 };
              updatePosition('x', preset.x);
              updatePosition('y', preset.y);
              updatePosition('z', preset.z);
            }}
            className="px-2 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 rounded"
          >
            Center
          </button>
          <button
            onClick={() => {
              const preset = { x: 0.4, y: -0.3, z: -0.7 };
              updatePosition('x', preset.x);
              updatePosition('y', preset.y);
              updatePosition('z', preset.z);
            }}
            className="px-2 py-1 text-xs bg-green-500/20 hover:bg-green-500/30 rounded"
          >
            Right Panel
          </button>
          <button
            onClick={() => {
              const preset = { x: -0.4, y: -0.3, z: -0.7 };
              updatePosition('x', preset.x);
              updatePosition('y', preset.y);
              updatePosition('z', preset.z);
            }}
            className="px-2 py-1 text-xs bg-yellow-500/20 hover:bg-yellow-500/30 rounded"
          >
            Left Panel
          </button>
        </div>

        <div className="text-xs text-gray-400 mt-4 p-2 bg-gray-800/50 rounded">
          <div>Pos: [{position.x.toFixed(2)}, {position.y.toFixed(2)}, {position.z.toFixed(2)}]</div>
          <div>Rot: [{(rotation.x * 180 / Math.PI).toFixed(0)}°, {(rotation.y * 180 / Math.PI).toFixed(0)}°, {(rotation.z * 180 / Math.PI).toFixed(0)}°]</div>
          <div>Scale: {scale.toFixed(1)}x</div>
        </div>
      </div>
    </motion.div>
  );
};

export default RadarPositionDebug;