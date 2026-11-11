import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

const AssetStatusIndicator = () => {
  const [status, setStatus] = useState({
    globalReady: false,
    gameReady: false,
    videoReady: false
  });

  useEffect(() => {
    const checkStatus = () => {
      setStatus({
        globalReady: window.globalAssetsReady || false,
        gameReady: window.gameAssetsReady || false, 
        videoReady: window.hyperVideoElement?.readyState >= 3 || false
      });
    };

    checkStatus();

    const interval = setInterval(checkStatus, 2000);

    const handleGlobalReady = () => checkStatus();
    window.addEventListener('globalAssetsReady', handleGlobalReady);

    return () => {
      clearInterval(interval);
      window.removeEventListener('globalAssetsReady', handleGlobalReady);
    };
  }, []);

  const getIcon = (ready) => {
    if (ready) return <CheckCircle size={14} className="text-green-400" />;
    return <Loader2 size={14} className="text-yellow-400 animate-spin" />;
  };

  const allReady = status.globalReady && status.videoReady;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed top-4 left-4 bg-black/80 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-3 text-xs font-mono"
    >
      <div className="text-cyan-400 mb-2 font-bold">Asset Status</div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {getIcon(status.globalReady)}
          <span className={status.globalReady ? 'text-green-400' : 'text-yellow-400'}>
            Global Assets
          </span>
        </div>
        <div className="flex items-center gap-2">
          {getIcon(status.videoReady)}
          <span className={status.videoReady ? 'text-green-400' : 'text-yellow-400'}>
            Hyper Video
          </span>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-600">
        <div className={`text-xs ${allReady ? 'text-green-400' : 'text-yellow-400'}`}>
          {allReady ? '✅ Ready for Game' : '⏳ Loading...'}
        </div>
      </div>
    </motion.div>
  );
};

export default AssetStatusIndicator;