import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PreloadIndicator = () => {
  const [showIndicator, setShowIndicator] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentAsset, setCurrentAsset] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const handleProgress = (event) => {
      const { loadedAssets, totalAssets, currentAsset: asset } = event.detail || {};
      if (totalAssets > 0) {
        const percent = Math.round((loadedAssets / totalAssets) * 100);
        setProgress(percent);
        setCurrentAsset(asset || 'Loading assets...');
        setShowIndicator(true);

        if (percent >= 100) {
          setTimeout(() => setShowIndicator(false), 2000);
        }
      }
    };

    const handleComplete = () => {
      setIsComplete(true);
      setCurrentAsset('Game assets ready!');
      setProgress(100);
      
      setTimeout(() => {
        setShowIndicator(false);
      }, 2000);
    };

    if (window.globalAssetsReady) {
      handleComplete();
    } else {
      if (window.globalAssetsPreloading) {
        setShowIndicator(true);
        setCurrentAsset('Starting asset preload...');
      }
    }

    window.addEventListener('globalAssetsProgress', handleProgress);
    window.addEventListener('globalAssetsReady', handleComplete);

    return () => {
      window.removeEventListener('globalAssetsProgress', handleProgress);
      window.removeEventListener('globalAssetsReady', handleComplete);
    };
  }, []);

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed bottom-4 right-4 z-[200] bg-black/90 backdrop-blur-sm border border-cyan-500/50 rounded-lg p-4 max-w-xs"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              {isComplete ? (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              ) : (
                <>
                  <div className="w-6 h-6 border-2 border-cyan-500/30 rounded-full"></div>
                  <motion.div
                    className="absolute inset-0 border-2 border-cyan-500 rounded-full"
                    style={{
                      borderTopColor: 'transparent',
                      borderRightColor: 'transparent',
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                </>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="text-cyan-400 text-xs font-mono mb-1">
                {isComplete ? 'READY' : 'PRELOADING'}
              </div>
              <div className="text-white text-xs truncate">
                {currentAsset}
              </div>
              {!isComplete && (
                <div className="mt-2">
                  <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                      initial={{ width: '0%' }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <div className="text-cyan-400 text-xs mt-1 text-right">
                    {progress}%
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PreloadIndicator;