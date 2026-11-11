import React, { useState, useEffect, useRef } from 'react';
import { Z_INDEX } from '../constants/zIndex';

const PerformanceOverlay = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {

    const handleKeyPress = (e) => {
      if (e.key === 'F9') {
        e.preventDefault();
        setIsVisible(!isVisible);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  useEffect(() => {
    if (isVisible && window.performanceMonitor?.isEnabled) {

      intervalRef.current = setInterval(() => {
        const data = window.performanceMonitor.getLiveSnapshot();
        setSnapshot(data);
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isVisible]);

  const formatNumber = (num) => {
    if (num < 1000) return num.toFixed(1);
    if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
    return (num / 1000000).toFixed(1) + 'M';
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  };

  const getFPSColor = (fps) => {
    if (fps >= 55) return '#00ff00';
    if (fps >= 30) return '#ffff00';
    return '#ff0000';
  };

  const getFrameTimeColor = (frameTime) => {
    if (frameTime <= 16.67) return '#00ff00';
    if (frameTime <= 33.33) return '#ffff00';
    return '#ff0000';
  };

  const renderSparkline = (data, width = 120, height = 30) => {
    if (!data || data.length === 0) return null;
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
    
    const avgValue = data.reduce((sum, val) => sum + val, 0) / data.length;
    const strokeColor = getFrameTimeColor(avgValue);
    
    return (
      <svg width={width} height={height} className="ml-2">
        <polyline
          points={points}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1"
        />
      </svg>
    );
  };

  if (!isVisible) {
    return (
      <div 
        className="absolute top-4 left-4 bg-black/80 text-cyan-400 font-mono text-xs p-2 rounded border border-cyan-500/50 cursor-pointer"
        onClick={() => setIsVisible(true)}
        style={{
          zIndex: Z_INDEX.DEBUG_OVERLAY,
          contain: 'layout style',
          willChange: 'auto'
        }}
      >
        <div className="text-cyan-300 font-bold">⚡ PERF (F9)</div>
      </div>
    );
  }

  if (!snapshot || !window.performanceMonitor?.isEnabled) {
    return (
      <div 
        className="absolute top-4 left-4 bg-black/90 text-red-400 font-mono text-xs p-4 rounded border border-red-500/50"
        style={{
          zIndex: Z_INDEX.DEBUG_OVERLAY,
          contain: 'layout style',
          willChange: 'auto'
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <div className="text-red-300 font-bold">⚡ PERFORMANCE MONITOR</div>
          <button 
            onClick={() => setIsVisible(false)}
            className="text-red-400 hover:text-red-300 text-xs"
          >
            ✕
          </button>
        </div>
        <div className="text-red-400">Performance monitor not enabled</div>
        <div className="text-gray-400 text-xs mt-2">Press F12 to open debug panel and enable monitoring</div>
      </div>
    );
  }

  return (
    <div 
      className="absolute top-4 left-4 bg-black/90 text-green-400 font-mono text-xs p-4 rounded border border-green-500/50 max-w-md"
      style={{
        zIndex: Z_INDEX.DEBUG_OVERLAY,
        contain: 'layout style',
        willChange: 'auto',
        backdropFilter: 'blur(2px)'
      }}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="text-green-300 font-bold">⚡ PERFORMANCE MONITOR</div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="text-cyan-400 hover:text-cyan-300 text-xs"
          >
            {showDetails ? '📉' : '📊'}
          </button>
          <button 
            onClick={() => setIsVisible(false)}
            className="text-red-400 hover:text-red-300 text-xs"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="mb-3 border-b border-green-600/30 pb-2">
        <div className="text-yellow-400 font-bold mb-1">FPS:</div>
        <div className="flex items-center">
          <span style={{ color: getFPSColor(snapshot.fps.current) }}>
            {snapshot.fps.current.toFixed(1)}
          </span>
          <span className="text-gray-400 ml-2">
            avg: {snapshot.fps.avg5s.toFixed(1)} | 
            min: {snapshot.fps.min5s.toFixed(1)} | 
            max: {snapshot.fps.max5s.toFixed(1)}
          </span>
        </div>
      </div>

      <div className="mb-3 border-b border-green-600/30 pb-2">
        <div className="text-yellow-400 font-bold mb-1">Frame Time:</div>
        <div className="flex items-center">
          <span style={{ color: getFrameTimeColor(snapshot.frameTime.current) }}>
            {snapshot.frameTime.current.toFixed(2)}ms
          </span>
          {renderSparkline(snapshot.frameTime.sparkline)}
        </div>
      </div>

      <div className="mb-3 border-b border-green-600/30 pb-2">
        <div className="text-yellow-400 font-bold mb-1">Current Phase:</div>
        <div className="text-cyan-300">
          {snapshot.phase === 'hyperTransition' && '🚀 HYPERSPACE TRANSITION'}
          {snapshot.phase === 'assetLoading' && '📦 ASSET LOADING'}
          {snapshot.phase === 'gameplay' && '🎮 GAMEPLAY'}
          {snapshot.phase === 'unknown' && '❓ UNKNOWN'}
        </div>
      </div>

      <div className="mb-3 border-b border-green-600/30 pb-2">
        <div className="text-yellow-400 font-bold mb-1">Assets:</div>
        <div className="text-gray-300">
          Total: {snapshot.assets.totalAssets} | 
          Duplicates: <span className="text-red-400">{snapshot.assets.totalDuplicates}</span> | 
          Wasted: <span className="text-orange-400">{formatBytes(snapshot.assets.wastedMemoryFromDuplicates)}</span>
        </div>
        {snapshot.assets.totalDuplicates > 0 && (
          <div className="text-red-400 text-xs mt-1">⚠️ DUPLICATE ASSETS DETECTED!</div>
        )}
      </div>

      <div className="mb-3 border-b border-green-600/30 pb-2">
        <div className="text-yellow-400 font-bold mb-1">WebGL:</div>
        <div className="text-gray-300 text-xs">
          Draw: {formatNumber(snapshot.webgl.drawCalls)} | 
          Triangles: {formatNumber(snapshot.webgl.triangles)} | 
          Textures: {snapshot.webgl.textures}
        </div>
      </div>

      <div className="mb-3">
        <div className="text-yellow-400 font-bold mb-1">Memory:</div>
        <div className="text-gray-300 text-xs">
          Current: {formatBytes(snapshot.memory.current)} | 
          Growth: <span className={snapshot.memory.growth > 0 ? 'text-red-400' : 'text-green-400'}>
            {snapshot.memory.growth > 0 ? '+' : ''}{formatBytes(snapshot.memory.growth)}
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-green-600/30">
          <div className="text-yellow-400 font-bold mb-2">📊 DETAILED STATS</div>
          
          <div className="mb-2">
            <div className="text-cyan-400 font-semibold mb-1">Asset Breakdown:</div>
            <div className="text-gray-400 text-xs">
              <div>Videos: Loading...</div>
              <div>Models: Loading...</div>
              <div>Textures: Loading...</div>
              <div>Audio: Loading...</div>
            </div>
          </div>

          <div className="mb-2">
            <div className="text-cyan-400 font-semibold mb-1">Recent Spikes:</div>
            <div className="text-gray-400 text-xs">
              <div>Frame spike detection active...</div>
            </div>
          </div>

          <div className="mb-2">
            <div className="text-cyan-400 font-semibold mb-1">Network:</div>
            <div className="text-gray-400 text-xs">
              <div>Messages: In/Out tracking...</div>
              <div>Bytes: Tracking...</div>
            </div>
          </div>

          <div>
            <div className="text-cyan-400 font-semibold mb-1">Components:</div>
            <div className="text-gray-400 text-xs">
              <div>Mount/Unmount tracking...</div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-green-600/30">
        <button
          onClick={() => {
            if (window.performanceMonitor) {
              window.performanceMonitor.exportSession();
            }
          }}
          className="w-full bg-green-900/50 border border-green-600 rounded px-2 py-1 hover:bg-green-800/60 text-green-300 text-xs mb-2"
        >
          📊 Export Session
        </button>
        
        <button
          onClick={() => {
            if (window.sessionLogger) {
              window.sessionLogger.downloadAllSessions();
            }
          }}
          className="w-full bg-blue-900/50 border border-blue-600 rounded px-2 py-1 hover:bg-blue-800/60 text-blue-300 text-xs"
        >
          📦 Download All Sessions
        </button>
      </div>
    </div>
  );
};

export default PerformanceOverlay;
