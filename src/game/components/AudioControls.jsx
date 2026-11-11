import React, { useState, useEffect } from 'react';
import { getAudioManager } from '../services/AudioManager';

const AudioControls = ({ className = '' }) => {
  const [audioState, setAudioState] = useState({
    musicEnabled: true,
    sfxEnabled: true,
    engineEnabled: true,
    isMuted: false,
    initialized: false
  });

  const audioManager = getAudioManager();

  const updateState = () => {
    setAudioState(audioManager.getState());
  };

  useEffect(() => {
    updateState();
    
    const interval = setInterval(updateState, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMusicToggle = () => {
    audioManager.toggleMusic();
    updateState();
  };

  const handleMuteToggle = () => {
    audioManager.toggleMute();
    updateState();
  };

  const handleSfxToggle = () => {
    audioManager.toggleSfx();
    updateState();
  };

  const handleEngineToggle = () => {
    audioManager.toggleEngine();
    updateState();
  };

  if (!audioState.initialized) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-20 z-[9999] flex gap-1 ${className}`}>
      <button
        onClick={handleMusicToggle}
        className={`px-2 py-1 rounded text-xs font-mono transition-all ${
          audioState.musicEnabled && !audioState.isMuted
            ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-400/50 hover:bg-cyan-500/25'
            : 'bg-black/50 text-gray-400 border border-gray-600/60 hover:bg-gray-700/60'
        }`}
        title={`Background music: ${audioState.musicEnabled ? 'ON' : 'OFF'}`}
      >
        🎵 {audioState.musicEnabled ? 'ON' : 'OFF'}
      </button>

      <button
        onClick={handleSfxToggle}
        className={`px-2 py-1 rounded text-xs font-mono transition-all ${
          audioState.sfxEnabled && !audioState.isMuted
            ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-400/50 hover:bg-cyan-500/25'
            : 'bg-black/50 text-gray-400 border border-gray-600/60 hover:bg-gray-700/60'
        }`}
        title={`Sound effects: ${audioState.sfxEnabled ? 'ON' : 'OFF'}`}
      >
        🔫 {audioState.sfxEnabled ? 'ON' : 'OFF'}
      </button>

      <button
        onClick={handleEngineToggle}
        className={`px-2 py-1 rounded text-xs font-mono transition-all ${
          audioState.engineEnabled && !audioState.isMuted
            ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-400/50 hover:bg-cyan-500/25'
            : 'bg-black/50 text-gray-400 border border-gray-600/60 hover:bg-gray-700/60'
        }`}
        title={`Engine sound: ${audioState.engineEnabled ? 'ON' : 'OFF'}`}
      >
        🚁 {audioState.engineEnabled ? 'ON' : 'OFF'}
      </button>

      <button
        onClick={handleMuteToggle}
        className={`px-2 py-1 rounded text-xs font-mono transition-all ${
          audioState.isMuted
            ? 'bg-orange-500/20 text-orange-200 border border-orange-400/60 hover:bg-orange-500/30'
            : 'bg-black/50 text-gray-400 border border-gray-600/60 hover:bg-gray-700/60'
        }`}
        title={`Master audio: ${audioState.isMuted ? 'MUTED' : 'ON'}`}
      >
        {audioState.isMuted ? '🔇' : '🔊'}
      </button>
    </div>
  );
};

export default AudioControls;