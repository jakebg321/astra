import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, X, Settings, Check } from 'lucide-react';
import controllerManager from '../game/systems/ControllerManager';

const ControllerDetectionNotification = () => {
  const [showNotification, setShowNotification] = useState(false);
  const [controllerInfo, setControllerInfo] = useState(null);
  const [userChoice, setUserChoice] = useState(null);
  
  useEffect(() => {
    const handleControllerConnect = (event) => {
      const { id, vibrationSupported } = event.detail;
      
      console.log('Controller connected notification:', id);

      if (!userChoice) {
        setControllerInfo({
          name: id.substring(0, 50),
          vibrationSupported,
          fullName: id
        });
        setShowNotification(true);
      }
    };
    
    const handleControllerDisconnect = () => {
      console.log('Controller disconnected');
      setShowNotification(false);
      setControllerInfo(null);

      setUserChoice(null);
    };

    const checkExistingController = () => {
      const status = controllerManager.getStatus();
      if (status.connected && !userChoice) {
        setControllerInfo({
          name: status.controllerId?.substring(0, 50) || 'Unknown Controller',
          vibrationSupported: status.vibrationSupported,
          fullName: status.controllerId || 'Unknown Controller'
        });
        setShowNotification(true);
      }
    };
    
    window.addEventListener('controllerConnected', handleControllerConnect);
    window.addEventListener('controllerDisconnected', handleControllerDisconnect);

    setTimeout(checkExistingController, 1000);
    
    return () => {
      window.removeEventListener('controllerConnected', handleControllerConnect);
      window.removeEventListener('controllerDisconnected', handleControllerDisconnect);
    };
  }, [userChoice]);
  
  const handleAccept = () => {
    console.log('User accepted controller');
    setUserChoice('accepted');
    setShowNotification(false);
    
    controllerManager.enabled = true;
    
    localStorage.setItem('astra_controller_preference', 'enabled');

    setTimeout(() => {
      controllerManager.vibrate(200, 0.5, 0.7);
    }, 500);
    
    setTimeout(() => {
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
    }, 100);
  };
  
  const handleDismiss = () => {
    console.log('User dismissed controller');
    setUserChoice('dismissed');
    setShowNotification(false);

    localStorage.setItem('astra_controller_preference', 'dismissed');
  };
  
  const handleSettings = () => {
    console.log('User wants controller settings');
    setUserChoice('accepted');
    setShowNotification(false);
    
    controllerManager.enabled = true;
    localStorage.setItem('astra_controller_preference', 'enabled');

    window.dispatchEvent(new CustomEvent('openControllerSettings'));
  };
  
  if (!showNotification || !controllerInfo) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          className="bg-gradient-to-br from-gray-900/95 to-purple-900/95 border border-purple-500/50 rounded-lg p-6 max-w-md w-full"
        >
          {userChoice === 'accepted' ? (

            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 bg-green-500/20 border-2 border-green-500/50 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Check className="w-8 h-8 text-green-400" />
              </motion.div>
              <h2 className="text-xl font-bold text-white mb-2">Controller Ready!</h2>
              <p className="text-gray-300 text-sm">
                Your controller is now active. Enjoy enhanced sticky aim and haptic feedback!
              </p>
            </div>
          ) : (

            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                    className="w-12 h-12 bg-blue-500/20 border-2 border-blue-500/50 rounded-full flex items-center justify-center"
                  >
                    <Gamepad2 className="w-6 h-6 text-blue-400" />
                  </motion.div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Controller Detected!</h2>
                    <p className="text-sm text-gray-400">Ready for enhanced gameplay</p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="bg-black/40 rounded-lg p-4 mb-4">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Controller:</span>
                    <span className="text-white text-xs font-mono">
                      {controllerInfo.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Vibration:</span>
                    <span className={controllerInfo.vibrationSupported ? 'text-green-400' : 'text-yellow-400'}>
                      {controllerInfo.vibrationSupported ? 'Supported' : 'Limited'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-bold text-purple-400 mb-2">🚀 Enhanced Features</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• <span className="text-cyan-400">Enhanced Sticky Aim</span> - Better target assistance</li>
                  <li>• <span className="text-green-400">Haptic Feedback</span> - Feel every shot and hit</li>
                  <li>• <span className="text-yellow-400">Analog Movement</span> - Precise thrust control</li>
                  <li>• <span className="text-purple-400">Star Wars Controls</span> - Squadrons-style layout</li>
                </ul>
              </div>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAccept}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-400 hover:to-blue-400 text-white font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Gamepad2 size={18} />
                  Yes, Use Controller
                </motion.button>
                
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSettings}
                    className="flex-1 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-500 hover:to-pink-500 text-white font-medium py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Settings size={16} />
                    Configure
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDismiss}
                    className="flex-1 bg-gray-600/80 hover:bg-gray-500/80 text-white font-medium py-2 px-3 rounded-lg transition-all"
                  >
                    Maybe Later
                  </motion.button>
                </div>
              </div>

              <div className="mt-4 p-3 bg-purple-900/30 border border-purple-500/30 rounded-lg">
                <p className="text-xs text-purple-300">
                  💡 <span className="font-bold">Pro Tip:</span> Controllers get enhanced sticky aim and haptic feedback for better combat experience!
                </p>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ControllerDetectionNotification;