import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const HyperTransition = ({
  onComplete,
  onReadyToExit,
  canExit = false,
  duration = 5000,
  isMultiplayer = false,
  onStartPreload,
  onTrace
}) => {
  const videoRef = useRef();
  const onCompleteRef = useRef(onComplete);
  const onStartPreloadRef = useRef(onStartPreload);
  const onReadyToExitRef = useRef(onReadyToExit);
  const onTraceRef = useRef(onTrace);
  const initializedRef = useRef(false);
  const exitTriggeredRef = useRef(false);
  const [countdown, setCountdown] = useState(null);
  const [phase, setPhase] = useState('initializing');
  const hasStartedPreload = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onStartPreloadRef.current = onStartPreload;
    onReadyToExitRef.current = onReadyToExit;
    onTraceRef.current = onTrace;
  }, [onComplete, onStartPreload, onReadyToExit, onTrace]);
  
  useEffect(() => {
    if (initializedRef.current) {
      return undefined;
    }
    initializedRef.current = true;
    let isActive = true;

    const startPreloadOnce = () => {
      if (hasStartedPreload.current || !onStartPreloadRef.current) return;
      hasStartedPreload.current = true;
      onStartPreloadRef.current();
    };

    const startVideoPlayback = async () => {
      const videoEl = videoRef.current;
      if (!videoEl || !isActive) {
        startPreloadOnce();
        return;
      }
      onTraceRef.current?.('transition_video_play_start');

      if (window.performanceMonitor?.isEnabled) {
        window.performanceMonitor.markPhaseStart('hyperTransition');
      }

      if (window.hyperVideoElement && window.hyperVideoElement.readyState >= 3) {
        if (videoEl !== window.hyperVideoElement) {
          videoEl.src = window.hyperVideoElement.src;
          videoEl.currentTime = 0;
        }
      } else {
        const preloadedSrc = window.hyperVideoBlobUrl || '/hyper.mp4';
        if (videoEl.src !== preloadedSrc) {
          videoEl.src = preloadedSrc;
        }
        videoEl.currentTime = 0;
      }

      const startPlayback = () => {
        if (!isActive || !videoEl) return;
        
        videoEl.play().then(() => {
        }).catch(playError => {
          if (isActive && playError?.name !== 'AbortError') {
            console.warn('Hyper transition video playback failed:', playError);
          }
        }).finally(() => {
          if (isActive) {
            startPreloadOnce();
          }
        });
      };

      requestAnimationFrame(startPlayback);
    };

    startVideoPlayback();

    const initialCountdown = Math.max(3, Math.round((duration || 5000) / 1000) - 1);
    setPhase('countdown');
    
    const countdownTimer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return initialCountdown;
        if (prev > 1) return prev - 1;
        
        clearInterval(countdownTimer);
        setPhase('launching');
        setTimeout(() => {
          if (!isActive) return;
          setPhase('holding');

          if (window.performanceMonitor?.isEnabled) {
            window.performanceMonitor.markPhaseEnd('hyperTransition');
          }
          
          onReadyToExitRef.current?.();
        }, 1000);
        return 0;
      });
    }, 1000);

    return () => {
      isActive = false;
      clearInterval(countdownTimer);
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch (e) {

        }
      }
    };
  }, [duration, isMultiplayer]);

  useEffect(() => {
    if (phase !== 'holding' || !canExit || exitTriggeredRef.current) return;
    exitTriggeredRef.current = true;
    setPhase('complete');
    onCompleteRef.current?.();
  }, [phase, canExit]);
  
  const getCountdownText = () => {
    if (phase === 'initializing') return 'OPENING WORMHOLE...';
    if (phase === 'countdown' && countdown !== null) {
      if (countdown > 0) return countdown.toString();
      return 'FIGHT!';
    }
    if (phase === 'launching') return 'WARPING IN!';
    if (phase === 'holding') return 'SYNCING ARENA...';
    if (phase === 'complete') return 'ENTERING COMBAT...';
    return 'WARPING...';
  };

  const getCountdownColor = () => {
    if (phase === 'countdown' && countdown === 0) return '#ff3366';
    if (phase === 'launching') return '#e040fb';
    if (phase === 'holding') return '#b388ff';
    return '#ce93d8';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        preload="auto"
        playsInline
        loop
      />
      

      <div className="absolute inset-0 bg-black/40" />
      


      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at center, transparent 20%, rgba(156,39,176,0.15) 60%, rgba(74,20,140,0.4) 100%)',
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.9, 0.4],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
    </motion.div>
  );
};

export default HyperTransition;
