import React, { useState, useEffect } from 'react';
import { getWebSocketInstance } from '../game/services/UnifiedWebSocket';

const GameLoadingScreen = ({ onReady }) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Initializing...');
  const [otherPlayersProgress, setOtherPlayersProgress] = useState({});

  const sendLoadingProgress = (progress, step) => {
    const ws = getWebSocketInstance();
    if (ws && ws.connection && ws.connection.isConnected()) {
      ws.send('loading_progress', { progress, step });
    }
  };

  const sendLoadingComplete = (retries = 8) => {
    const ws = getWebSocketInstance();
    if (ws && ws.connection && ws.connection.isConnected()) {
      ws.send('loading_complete', { progress: 100 });
      return true;
    }
    if (retries > 0) {
      setTimeout(() => sendLoadingComplete(retries - 1), 250);
    }
    return false;
  };
  
  useEffect(() => {
    let mounted = true;

    const ws = getWebSocketInstance();
    
    const handleLoadingProgressUpdate = (payload) => {
      const { loadingStates } = payload;
      
      const progressMap = {};
      const currentPlayerId = ws.gameStateManager?.playerId || ws.playerId;
      
      loadingStates.forEach(state => {
        if (state.playerId !== currentPlayerId) {
          progressMap[state.playerName] = {
            progress: state.progress,
            step: state.step,
            status: state.status
          };
        }
      });
      
      setOtherPlayersProgress(progressMap);
    };
    
    if (ws) {
      ws.on('loading_progress_update', handleLoadingProgressUpdate);
    }
    
    const loadGame = async () => {
      try {

        const step1 = 'Initializing graphics engine...';
        setCurrentStep(step1);
        setProgress(20);
        sendLoadingProgress(20, step1);
        
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        
        if (!gl) {
          throw new Error('WebGL not supported');
        }

        const step2 = 'Compiling shaders...';
        setCurrentStep(step2);
        setProgress(40);
        sendLoadingProgress(40, step2);

        await new Promise(resolve => setTimeout(resolve, 50));

        const step3 = 'Loading 3D engine...';
        setCurrentStep(step3);
        setProgress(60);
        sendLoadingProgress(60, step3);

        await Promise.all([
          import('three'),
          import('@react-three/fiber'),
          import('@react-three/drei')
        ]);

        const step4 = 'Loading game systems...';
        setCurrentStep(step4);
        setProgress(80);
        sendLoadingProgress(80, step4);
        
        await Promise.all([
          import('../game/components/PlayerController'),
          import('../game/renderers/EnvironmentRenderer'),
          import('../game/components/FixedTargetBrackets')
        ]);

        const step5 = 'Starting game...';
        setCurrentStep(step5);
        setProgress(100);
        sendLoadingProgress(100, step5);

        await new Promise(resolve => setTimeout(resolve, 200));
        
        sendLoadingComplete();
        
        if (mounted && typeof onReady === 'function') {
          onReady();
        }
        
      } catch (error) {
        console.error('Game loading failed:', error);

        setCurrentStep('Load failed, using fallback start...');
        setProgress(100);
        sendLoadingProgress(100, 'Fallback start');
        sendLoadingComplete();
        if (mounted && typeof onReady === 'function') {
          onReady();
        }
      }
    };
    
    setTimeout(loadGame, 300);
    
    return () => {
      mounted = false;
      if (ws) {
        ws.off('loading_progress_update', handleLoadingProgressUpdate);
      }
    };
  }, [onReady]);
  
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="text-center">
        <div className="w-80 h-2 bg-gray-800 rounded-full mb-4">
          <div 
            className="h-full bg-cyan-400 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="text-cyan-400 text-xl font-mono mb-2">
          {currentStep}
        </div>
        
        <div className="text-gray-400 text-sm">
          {progress}%
        </div>
        
        <div className="mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
        </div>
        

        {Object.keys(otherPlayersProgress).length > 0 && (
          <div className="mt-8 text-left">
            <div className="text-cyan-300 text-sm font-mono mb-3">Other Players:</div>
            {Object.entries(otherPlayersProgress).map(([playerName, playerProgress]) => (
              <div key={playerName} className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-cyan-200 text-sm">{playerName}</span>
                  <span className="text-gray-400 text-xs">{playerProgress.progress}%</span>
                </div>
                <div className="w-full h-1 bg-gray-800 rounded-full">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      playerProgress.status === 'complete' ? 'bg-green-400' :
                      playerProgress.status === 'failed' ? 'bg-red-400' :
                      'bg-blue-400'
                    }`}
                    style={{ width: `${playerProgress.progress}%` }}
                  />
                </div>
                <div className="text-gray-500 text-xs mt-1 truncate">
                  {playerProgress.step}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameLoadingScreen;
