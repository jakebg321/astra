import { isDebugEnabled } from '../game/utils/debug.js';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import GameLobby from '../game/components/GameLobby';
import ProfileRequiredModal from '../components/ProfileRequiredModal';
import SinglePlayerGame from '../game/modes/SinglePlayerGame';
import TrainingMode from '../game/modes/TrainingMode';
import TutorialMode from '../game/modes/TutorialMode';
import MultiplayerGame from '../game/modes/MultiplayerGame';
import WaitingRoom from '../game/modes/WaitingRoom';
import HyperTransition from '../game/components/HyperTransition';
import GameLoadingScreen from '../components/GameLoadingScreen';
import { getWebSocketInstance } from '../game/services/UnifiedWebSocket';
import { initializeAudioOnInteraction } from '../game/services/AudioManager';

const TRANSITION_BOOTSTRAP_TIMEOUT_MS = 12000;
const POST_REVEAL_DEFER_MS = 1000;
const TUTORIAL_VERSION = 'v2';
const getTutorialKey = (username) => `astra_tutorial_${TUTORIAL_VERSION}_completed_${username}`;
const getLegacyTutorialKey = (username) => `astra_tutorial_completed_${username}`;
const getForcedStartMode = () => {
  if (typeof window === 'undefined') return null;
  const mode = window.localStorage?.getItem('astra_force_start_mode');
  if (mode === 'tutorial' || mode === 'training') return mode;
  return null;
};
const hasCompletedTutorial = (username) => {
  if (!username || typeof window === 'undefined') return false;

  const v2Key = getTutorialKey(username);
  if (window.localStorage.getItem(v2Key)) return true;

  const legacyUserKey = getLegacyTutorialKey(username);
  const legacyGenericKey = 'astra_tutorial_completed';
  const hasLegacy = window.localStorage.getItem(legacyUserKey) || window.localStorage.getItem(legacyGenericKey);

  if (hasLegacy) {
    window.localStorage.setItem(v2Key, 'true');
    return true;
  }

  return false;
};


const EnforcedAssetLoader = ({ onComplete, onFailed }) => {
  const [progress, setProgress] = useState(0);
  const [currentAsset, setCurrentAsset] = useState('Initializing...');
  const [loadError, setLoadError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let completed = false;
    let pollId = null;
    let timeoutId = null;

    const cleanup = () => {
      if (pollId) clearInterval(pollId);
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('globalAssetsProgress', handleProgress);
      window.removeEventListener('globalAssetsReady', handleReady);
    };

    const finish = () => {
      if (completed) return;
      completed = true;
      cleanup();
      setCurrentAsset('Global assets synchronized');
      setProgress(100);
      setTimeout(onComplete, 250);
    };

    const handleProgress = (event) => {
      const { loadedAssets, totalAssets, currentAsset: assetName } = event.detail || {};
      if (typeof loadedAssets === 'number' && typeof totalAssets === 'number' && totalAssets > 0) {
        const percent = Math.min(95, Math.floor((loadedAssets / totalAssets) * 95));
        setProgress(percent);
      }
      if (assetName) {
        setCurrentAsset(`Syncing: ${assetName}`);
      }
    };

    const handleReady = () => {
      finish();
    };

    setLoadError(null);
    setCurrentAsset('Synchronizing global assets...');
    setProgress(5);

    if (window.globalAssetsReady || window.gameAssetsReady) {
      finish();
      return cleanup;
    }

    window.addEventListener('globalAssetsProgress', handleProgress);
    window.addEventListener('globalAssetsReady', handleReady);

    pollId = setInterval(() => {
      if (window.globalAssetsReady || window.gameAssetsReady) {
        finish();
      }
    }, 250);

    timeoutId = setTimeout(() => {
      if (completed) return;
      completed = true;
      cleanup();
      setLoadError('Timed out waiting for global preload to complete');
    }, 25000);

    return cleanup;
  }, [onComplete, retryCount]);

  useEffect(() => {
    window.checkVideoStatus = () => {
      const video = window.hyperVideoElement;
      if (!video) {
        return;
      }

      console.log('Hyper Video Status:', {
        src: video.src,
        readyState: video.readyState,
        readyStateText: ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'][video.readyState],
        duration: video.duration,
        buffered: video.buffered.length > 0 ? `${video.buffered.end(0)}s of ${video.duration}s` : 'Nothing buffered',
        error: video.error,
        canPlay: video.readyState >= 3
      });
    };
    if (isDebugEnabled() && window.performanceMonitor && !window.performanceMonitor.isEnabled) {
      window.performanceMonitor.enable();
    }
  }, []);


  if (loadError) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-4 text-red-500">
            GAME ASSETS FAILED TO LOAD
          </h1>
          <p className="text-gray-300 mb-4">{loadError}</p>
          <p className="text-gray-400 mb-6">
            The game cannot start without essential 3D models. Please check your internet connection.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setRetryCount(retryCount + 1)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-bold"
            >
              RETRY LOADING
            </button>
            <button
              onClick={onFailed}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded"
            >
              EXIT GAME
            </button>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            Attempt {retryCount + 1}/3
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <div className="absolute inset-0">
        <div className="stars absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-black" />
      </div>

      <div className="relative z-10 text-center max-w-md mx-auto px-8">
        <div className="text-6xl mb-8 animate-pulse">🚀</div>
        <h1 className="text-3xl font-bold mb-8 text-cyan-400">
          LOADING CRITICAL ASSETS
        </h1>
        <div className="w-full h-4 bg-gray-800 border border-cyan-500/50 mb-4 relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-cyan-300 font-mono text-sm mb-2">
          {currentAsset}
        </div>
        <div className="text-gray-400 text-xs">
          {Math.floor(progress)}% Complete
        </div>
      </div>
    </div>
  );
};

const GamePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, isLoading: isUserLoading } = useUser();
  const showDebugUi = isDebugEnabled();
  const [gameState, setGameState] = useState('loading');
  const [roomData, setRoomData] = useState(null);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [cameFromTransition, setCameFromTransition] = useState(false);
  const [isPreloadingGame, setIsPreloadingGame] = useState(false);
  const [transitionOverlayVisible, setTransitionOverlayVisible] = useState(false);
  const [transitionMinDone, setTransitionMinDone] = useState(false);
  const [gameBootstrapReady, setGameBootstrapReady] = useState(false);
  const [serverAllPlayersLoaded, setServerAllPlayersLoaded] = useState(false);
  const [bootstrapTimeoutHit, setBootstrapTimeoutHit] = useState(false);
  const [deferNonCriticalUi, setDeferNonCriticalUi] = useState(false);
  const bootstrapTimeoutRef = useRef(null);
  const postRevealTimerRef = useRef(null);
  const transitionStartTsRef = useRef(0);
  const transitionReadyTsRef = useRef(0);
  const bootstrapReadyTsRef = useRef(0);
  const lobbyPreloadStartedRef = useRef(false);
  const preloadStartedRef = useRef(false);

  useEffect(() => {
    document.body.classList.add('on-game-page');
    return () => {
      document.body.classList.remove('on-game-page');
    };
  }, []);


  useEffect(() => {

    if (typeof navigator !== 'undefined' && navigator.getGamepads) {
      const clearGamepadState = () => {
        try {
          const pads = navigator.getGamepads();
          const staleControllers = pads ? Array.from(pads).filter(p => p && p.connected).length : 0;

        } catch (error) {
          console.warn('Could not reset gamepad state:', error);
        }
      };

      clearGamepadState();
      setTimeout(clearGamepadState, 100);
      setTimeout(clearGamepadState, 500);
    }
  }, []);


  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  const [isTutorialRequired, setIsTutorialRequired] = useState(false);
  const bootMode = useMemo(() => {
    if (location.pathname === '/game/tutorial') return 'tutorial';
    if (location.pathname === '/game/training') return 'training';
    return 'default';
  }, [location.pathname]);
  const forcedStartMode = useMemo(
    () => (bootMode === 'default' ? getForcedStartMode() : null),
    [bootMode]
  );

  useEffect(() => {
    if (!assetsLoaded || gameState !== 'loading') return;
    if (bootMode !== 'tutorial' && bootMode !== 'training') return;
    setShowProfileModal(false);
    setProfileChecked(true);
    setIsTutorialRequired(bootMode === 'tutorial');
    setGameState(bootMode);
  }, [assetsLoaded, gameState, bootMode]);

  useEffect(() => {
    if (!assetsLoaded) return;
    if (bootMode !== 'tutorial' && bootMode !== 'training') return;
    if (gameState === bootMode) return;



    setShowProfileModal(false);
    setProfileChecked(true);
    setIsTutorialRequired(bootMode === 'tutorial');
    setRoomData(null);
    setGameState(bootMode);

  }, [assetsLoaded, bootMode, gameState, location.pathname]);

  useEffect(() => {
    if (!assetsLoaded || gameState !== 'loading' || !forcedStartMode) return;
    setShowProfileModal(false);
    setProfileChecked(true);
    setIsTutorialRequired(forcedStartMode === 'tutorial');
    setGameState(forcedStartMode);
  }, [assetsLoaded, gameState, forcedStartMode]);


  useEffect(() => {
    if (bootMode !== 'default') return;
    if (!isUserLoading) {
      if (!profile && !profileChecked) {
        setShowProfileModal(true);
        setProfileChecked(true);
      } else if (profile && !profileChecked) {
        setProfileChecked(true);
        const tutorialCompleted = hasCompletedTutorial(profile.username);

        if (!tutorialCompleted && gameState === 'loading' && assetsLoaded) {
          setIsTutorialRequired(true);
          setGameState('tutorial');
        } else if (tutorialCompleted && gameState === 'loading' && assetsLoaded) {
          setIsTutorialRequired(false);
          setGameState('lobby');
        } else if (gameState === 'loading' && assetsLoaded) {

          if (!tutorialCompleted) {
            setIsTutorialRequired(true);
            setGameState('tutorial');
          } else {
            setIsTutorialRequired(false);
            setGameState('lobby');
          }
        }
      }
    }
  }, [profile, profileChecked, isUserLoading, gameState, assetsLoaded, bootMode]);

  const stableUsername = useMemo(() => {
    if (profile?.username) return profile.username;
    return 'Guest';
  }, [profile?.username]);

  const trace = useCallback((label, data = {}) => {
    const stamp = `astra_${label}`;
    try {
      performance.mark(stamp);
    } catch (e) {
    }
  }, []);

  useEffect(() => {
    if (gameState !== 'transition') {
      return;
    }

    transitionStartTsRef.current = performance.now();
    transitionReadyTsRef.current = 0;
    bootstrapReadyTsRef.current = 0;
    setTransitionOverlayVisible(true);
    setTransitionMinDone(false);
    setGameBootstrapReady(false);
    setBootstrapTimeoutHit(false);
    setDeferNonCriticalUi(true);
    setCameFromTransition(false);
    setIsPreloadingGame(false);
    preloadStartedRef.current = false;
    lobbyPreloadStartedRef.current = false;

    performance.mark('astra_transition_start');
    trace('transition_start');
  }, [gameState, trace]);


  useEffect(() => {
    if (gameState !== 'transition' || gameBootstrapReady) {
      if (bootstrapTimeoutRef.current) {
        clearTimeout(bootstrapTimeoutRef.current);
        bootstrapTimeoutRef.current = null;
      }
      return;
    }

    bootstrapTimeoutRef.current = setTimeout(() => {
      console.warn(`Bootstrap readiness timeout hit (${TRANSITION_BOOTSTRAP_TIMEOUT_MS}ms). Forcing transition exit gate.`);
      setBootstrapTimeoutHit(true);
      setGameBootstrapReady(true);
    }, TRANSITION_BOOTSTRAP_TIMEOUT_MS);

    return () => {
      if (bootstrapTimeoutRef.current) {
        clearTimeout(bootstrapTimeoutRef.current);
        bootstrapTimeoutRef.current = null;
      }
    };
  }, [gameState, gameBootstrapReady]);

  useEffect(() => {
    return () => {
      if (bootstrapTimeoutRef.current) clearTimeout(bootstrapTimeoutRef.current);
      if (postRevealTimerRef.current) clearTimeout(postRevealTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!assetsLoaded) return;

    const ws = getWebSocketInstance();
    const applyReadyStatesToRoom = (readyStates) => {
      const readyEntries = Array.isArray(readyStates) ? readyStates : [];
      if (readyEntries.length === 0) return;

      const readyMap = new Map(readyEntries);
      setRoomData((prev) => {
        if (!prev || !Array.isArray(prev.players)) return prev;
        return {
          ...prev,
          players: prev.players.map((player) => (
            readyMap.has(player.id)
              ? { ...player, ready: !!readyMap.get(player.id) }
              : player
          ))
        };
      });
    };


    const handleStartLoading = () => {
      setServerAllPlayersLoaded(false);
      setRoomData((prev) => (prev ? { ...prev, gamePhase: 'loading' } : prev));
      setGameState('game-loading');
    };

    const handleAllPlayersLoaded = () => {
      setServerAllPlayersLoaded(true);
      setRoomData((prev) => (prev ? { ...prev, gamePhase: 'ready' } : prev));
      setGameState('waiting');
    };

    const handlePlayerJoined = (payload) => {
      const newPlayer = payload?.newPlayer;
      if (!newPlayer?.id) return;

      setRoomData((prev) => {
        if (!prev) return prev;
        const existingPlayers = Array.isArray(prev.players) ? prev.players : [];
        if (existingPlayers.some((player) => player.id === newPlayer.id)) {
          return prev;
        }
        return {
          ...prev,
          players: [...existingPlayers, { ...newPlayer, ready: !!newPlayer.ready }]
        };
      });
    };

    const handlePlayerLeft = (payload) => {
      const leftPlayerId = payload?.playerId;
      if (!leftPlayerId) return;

      setRoomData((prev) => {
        if (!prev || !Array.isArray(prev.players)) return prev;
        return {
          ...prev,
          players: prev.players.filter((player) => player.id !== leftPlayerId)
        };
      });
    };

    const handlePlayerReadyUpdate = (payload) => {
      setRoomData((prev) => (prev ? { ...prev, gamePhase: 'ready' } : prev));
      applyReadyStatesToRoom(payload?.readyStates);
    };

    const handleWaitingForReady = (payload) => {
      setRoomData((prev) => (prev ? { ...prev, gamePhase: 'ready' } : prev));
      applyReadyStatesToRoom(payload?.playersReady);
    };

    const handleRoomsUpdated = (rooms) => {
      if (!Array.isArray(rooms)) return;
      setRoomData((prev) => {
        if (!prev?.id) return prev;
        const latestRoom = rooms.find((room) => room.id === prev.id);
        if (!latestRoom) return prev;
        return {
          ...prev,
          ...latestRoom,
          players: Array.isArray(latestRoom.players) ? latestRoom.players : prev.players
        };
      });
    };

    const handleGameStart = () => {


      setGameState((prevState) => {
        if (
          prevState === 'transition' ||
          prevState === 'game' ||
          prevState === 'game-loading' ||
          prevState === 'playing'
        ) {
          return prevState;
        }
        return 'transition';
      });

      setTimeout(() => {
      }, 2000);
    };

    const handleRoomJoined = (data) => {
      const room = data?.room || data;
      if (room?.id) {
        setRoomData({ ...room, reconnected: !!data?.reconnected });
        setGameState('waiting');
      }
    };
    const handleRoomCreated = (data) => {
      const room = data?.room || data;
      if (room?.id) {
        setRoomData(room);
        setGameState('waiting');
      }
    };


    ws.on('start_loading', handleStartLoading);
    ws.on('all_players_loaded', handleAllPlayersLoaded);
    ws.on('player_joined', handlePlayerJoined);
    ws.on('player_left', handlePlayerLeft);
    ws.on('player_ready_update', handlePlayerReadyUpdate);
    ws.on('waiting_for_ready', handleWaitingForReady);
    ws.on('rooms_updated', handleRoomsUpdated);

    ws.on('gameStart', handleGameStart);
    ws.on('room_joined', handleRoomJoined);
    ws.on('room_created', handleRoomCreated);

    const handleForceTransition = (event) => {
      setGameState('transition');
    };

    window.addEventListener('forceGameTransition', handleForceTransition);

    return () => {

      ws.off('start_loading', handleStartLoading);
      ws.off('all_players_loaded', handleAllPlayersLoaded);
      ws.off('player_joined', handlePlayerJoined);
      ws.off('player_left', handlePlayerLeft);
      ws.off('player_ready_update', handlePlayerReadyUpdate);
      ws.off('waiting_for_ready', handleWaitingForReady);
      ws.off('rooms_updated', handleRoomsUpdated);

      ws.off('gameStart', handleGameStart);
      ws.off('room_joined', handleRoomJoined);
      ws.off('room_created', handleRoomCreated);
      window.removeEventListener('forceGameTransition', handleForceTransition);
    };
  }, [assetsLoaded]);

  const handleAssetsLoaded = useCallback(() => {
    setAssetsLoaded(true);

    initializeAudioOnInteraction();

    if (bootMode === 'tutorial' || bootMode === 'training') {
      setShowProfileModal(false);
      setProfileChecked(true);
      setIsTutorialRequired(bootMode === 'tutorial');
      setGameState(bootMode);
      return;
    }


    if (profile && hasCompletedTutorial(profile.username)) {
      setIsTutorialRequired(false);
      setGameState('lobby');
    } else if (profile) {


      if (!hasCompletedTutorial(profile.username)) {
        setIsTutorialRequired(true);
        setGameState('tutorial');
      } else {
        setIsTutorialRequired(false);
        setGameState('lobby');
      }
    }
  }, [profile, bootMode]);

  useEffect(() => {
    if (assetsLoaded) return;
    if (!window.globalAssetsReady && !window.gameAssetsReady) return;

    const timer = setTimeout(() => {
      handleAssetsLoaded();
    }, 10);

    return () => clearTimeout(timer);
  }, [assetsLoaded, handleAssetsLoaded]);

  const handleProfileCreated = (newProfile) => {
    setShowProfileModal(false);

    initializeAudioOnInteraction();

    if (bootMode !== 'default') {
      if (assetsLoaded) {
        setIsTutorialRequired(bootMode === 'tutorial');
        setGameState(bootMode);
      }
      return;
    }

    const tutorialCompleted = hasCompletedTutorial(newProfile.username);

    if (assetsLoaded) {
      if (!tutorialCompleted) {
        setIsTutorialRequired(true);
        setGameState('tutorial');
      } else {
        setIsTutorialRequired(false);
        setGameState('lobby');
      }
    } else {

    }
  };

  const handleTutorialComplete = () => {
    if (profile?.username) {
      localStorage.setItem(getTutorialKey(profile.username), 'true');
    }
    if (bootMode === 'tutorial') {
      setIsTutorialRequired(false);
      navigate('/game');
      return;
    }
    setIsTutorialRequired(false);
    setGameState('lobby');
  };

  const handleAssetsLoadFailed = () => {
    console.log('Asset loading failed - returning to home');
    navigate('/');
  };

  const handleJoinRoom = (room) => {


    if (!window.globalAssetsReady && !window.gameAssetsReady) {
      setGameState('game-loading');

      const pollAssets = setInterval(() => {
        if (window.globalAssetsReady || window.gameAssetsReady) {
          clearInterval(pollAssets);
          setRoomData(room);
          setGameState('waiting');
        }
      }, 500);

      setTimeout(() => {
        clearInterval(pollAssets);
        console.error('Asset loading timeout - forcing join anyway');
        setRoomData(room);
        setGameState('waiting');
      }, 10000);

      return;
    }


    if (!validateVideoAssets()) {
      return;
    }

    setRoomData(room);
    setGameState('waiting');
  };

  const handleStartGamePreload = useCallback(async () => {
    if (preloadStartedRef.current || isPreloadingGame) {
      return;
    }
    preloadStartedRef.current = true;
    trace('transition_preload_start');
    setIsPreloadingGame(true);

    try {
      await Promise.all([
        import('three'),
        import('three/examples/jsm/loaders/GLTFLoader'),
        import('three/examples/jsm/loaders/DRACOLoader')
      ]);

      await import('@react-three/fiber');
      await import('@react-three/drei');

      await Promise.all([
        import('../game/components/PlayerController'),
        import('../game/components/GameHUD'),
        import('../game/renderers/EnvironmentRenderer'),
        import('../game/renderers/BulletsRenderer')
      ]);

      if (!window.__astraWebGLPrewarmed) {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        canvas.getContext('webgl2') || canvas.getContext('webgl');
        window.__astraWebGLPrewarmed = true;
      }

      setIsPreloadingGame(false);
    } catch (error) {
      setIsPreloadingGame(false);
    }
  }, [isPreloadingGame, trace]);

  useEffect(() => {
    if (gameState !== 'transition') return;
    handleStartGamePreload();
  }, [gameState, handleStartGamePreload]);

  useEffect(() => {
    const shouldPreload = gameState === 'lobby' || gameState === 'waiting';
    if (!shouldPreload || lobbyPreloadStartedRef.current) return;
    lobbyPreloadStartedRef.current = true;
    handleStartGamePreload();
  }, [gameState, handleStartGamePreload]);

  const handleTransitionReadyToExit = () => {
    if (!transitionReadyTsRef.current) {
      transitionReadyTsRef.current = performance.now();
      performance.mark('astra_transition_min_complete');
      trace('transition_min_complete');
    }
    setTransitionMinDone(true);
  };

  const handleMultiplayerBootstrapReady = () => {
    if (!bootstrapReadyTsRef.current) {
      bootstrapReadyTsRef.current = performance.now();
      performance.mark('astra_bootstrap_ready');
    }
    trace('game_bootstrap_ready');
    setGameBootstrapReady(true);
  };

  const handleTransitionComplete = () => {
    const now = performance.now();
    const transitionDurationMs = transitionStartTsRef.current
      ? now - transitionStartTsRef.current
      : null;
    const bootstrapDurationMs = (transitionStartTsRef.current && bootstrapReadyTsRef.current)
      ? bootstrapReadyTsRef.current - transitionStartTsRef.current
      : null;
    const overlayHoldMs = (transitionReadyTsRef.current && bootstrapReadyTsRef.current)
      ? Math.max(0, bootstrapReadyTsRef.current - transitionReadyTsRef.current)
      : null;

    console.log('Transition readiness report', {
      transitionDurationMs: transitionDurationMs ? transitionDurationMs.toFixed(2) : 'n/a',
      bootstrapDurationMs: bootstrapDurationMs ? bootstrapDurationMs.toFixed(2) : 'n/a',
      overlayHoldMs: overlayHoldMs ? overlayHoldMs.toFixed(2) : 'n/a',
      timeoutFallbackUsed: bootstrapTimeoutHit,
    });

    performance.mark('astra_overlay_hidden');
    trace('overlay_exit', {
      timeoutFallbackUsed: bootstrapTimeoutHit
    });
    if (bootstrapTimeoutRef.current) {
      clearTimeout(bootstrapTimeoutRef.current);
      bootstrapTimeoutRef.current = null;
    }
    setTransitionOverlayVisible(false);
    setCameFromTransition(true);
    setIsPreloadingGame(false);
    setGameState('game');

    if (postRevealTimerRef.current) {
      clearTimeout(postRevealTimerRef.current);
    }
    postRevealTimerRef.current = setTimeout(() => {
      setDeferNonCriticalUi(false);
    }, POST_REVEAL_DEFER_MS);
  };

  const handleGameReady = () => {

  };


  const validateVideoAssets = () => {
    const hasVideo = !!window.hyperVideoElement;
    const videoReady = window.hyperVideoElement?.readyState >= 3;
    const globalReady = window.globalAssetsReady;


    if (!hasVideo || !videoReady) {
      console.error('VIDEO NOT READY - BLOCKING GAME JOIN');
      alert('Game assets are still loading. Please wait for the preload to complete before joining a game.');
      return false;
    }

    return true;
  };

  const handleLeaveGame = () => {

    setCameFromTransition(false);
    setTransitionOverlayVisible(false);
    setTransitionMinDone(false);
    setGameBootstrapReady(false);
    setServerAllPlayersLoaded(false);
    setBootstrapTimeoutHit(false);
    setDeferNonCriticalUi(false);
    setIsPreloadingGame(false);
    if (bootstrapTimeoutRef.current) {
      clearTimeout(bootstrapTimeoutRef.current);
      bootstrapTimeoutRef.current = null;
    }
    if (postRevealTimerRef.current) {
      clearTimeout(postRevealTimerRef.current);
      postRevealTimerRef.current = null;
    }
    if (bootMode === 'default') {
      setGameState('lobby');
    } else {
      navigate('/game');
    }
    setRoomData(null);


    const ws = getWebSocketInstance();
    if (ws && ws.leaveRoom) {
      ws.leaveRoom({ force: true, source: 'handleLeaveGame' });
    } else if (ws) {
      ws.send('leave_room', { force: true, source: 'handleLeaveGame' });
    }

    if (ws && ws.resetForNewGame) {
      ws.resetForNewGame();
    }

    if (ws && ws.gameStateManager && !ws.resetForNewGame) {
      console.warn('Using fallback WebSocket cleanup - resetForNewGame not available');
      ws.gameStateManager.gameState = {
        players: {},
        bullets: [],
        status: 'waiting',
        lastUpdate: Date.now()
      };
      ws.gameStateManager.pendingInputs = [];
      ws.gameStateManager.inputSequence = 0;
    }

    if (window.gameStatsTracker) {
      window.gameStatsTracker.reset();
    }

    if (window.gameCleanupCallbacks) {
      window.gameCleanupCallbacks.forEach(callback => {
        try { callback(); } catch (e) { console.warn('Cleanup callback failed:', e); }
      });
      window.gameCleanupCallbacks = [];
    }


    if (window.gc && typeof window.gc === 'function') {
      setTimeout(() => window.gc(), 1000);
    }

  };


  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-cyan-400 font-mono">Loading user profile...</div>
      </div>
    );
  }


  if (!assetsLoaded && !window.globalAssetsReady) {
    return (
      <EnforcedAssetLoader
        onComplete={handleAssetsLoaded}
        onFailed={handleAssetsLoadFailed}
      />
    );
  }

  if (showProfileModal) {
    return (
      <>
        <ProfileRequiredModal
          isOpen={showProfileModal}
          onProfileCreated={handleProfileCreated}
        />
      </>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-cyan-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  const shouldMountMultiplayerGame = !!roomData && (
    gameState === 'transition' || gameState === 'game' || gameState === 'playing'
  );
  const shouldShowTransitionOverlay = transitionOverlayVisible && (gameState === 'transition' || gameState === 'game');

  return (
    <div className="h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-black z-0">
        <div className="stars absolute inset-0" />
      </div>

      <div className="absolute top-4 left-4 z-[9999] flex gap-2">
        <motion.button
          onClick={() => navigate('/')}
          className="tactical-btn flex items-center gap-2 px-4 py-2"
          style={{ position: 'relative', zIndex: 99999, pointerEvents: 'auto' }}
        >
          <ArrowLeft size={20} />
          <span>EXIT</span>
        </motion.button>

        {showDebugUi && gameState === 'lobby' && (
          <>
            <motion.button
              onClick={() => setGameState('training')}
              className="tactical-btn px-4 py-2"
              style={{ position: 'relative', zIndex: 99999, pointerEvents: 'auto' }}
            >
              TRAINING
            </motion.button>
          </>
        )}

        {(gameState === 'playing' || gameState === 'training' || gameState === 'singleplayer') && (
          <motion.button
            onClick={handleLeaveGame}
            className="tactical-btn px-4 py-2"
          >
            LOBBY
          </motion.button>
        )}
      </div>

      {gameState === 'lobby' && (
        <GameLobby
          onJoinRoom={handleJoinRoom}
          playerName={stableUsername}
          onEnterTestMode={() => {
            navigate('/game/training');
          }}
          onEnterTraining={() => {
            setIsTutorialRequired(false);
            navigate('/game/training');
          }}
          onEnterTutorial={() => {
            setIsTutorialRequired(false);
            navigate('/game/tutorial');
          }}
        />
      )}

      {gameState === 'waiting' && roomData && (
        <WaitingRoom
          roomData={roomData}
          onLeaveGame={handleLeaveGame}
        />
      )}

      {shouldMountMultiplayerGame && (
        <MultiplayerGame
          playerName={stableUsername}
          onLeaveGame={handleLeaveGame}
          autoLockMouse={cameFromTransition}
          isPreloading={isPreloadingGame || !gameBootstrapReady}
          onBootstrapReady={handleMultiplayerBootstrapReady}
          deferNonCriticalUI={deferNonCriticalUi || transitionOverlayVisible}
        />
      )}

      {shouldShowTransitionOverlay && (
        <HyperTransition
          onComplete={handleTransitionComplete}
          onReadyToExit={handleTransitionReadyToExit}
          canExit={gameBootstrapReady && transitionMinDone && serverAllPlayersLoaded}
          isMultiplayer={roomData !== null}
          onStartPreload={handleStartGamePreload}
          onTrace={trace}
        />
      )}

      {gameState === 'game-loading' && (
        <GameLoadingScreen onReady={handleGameReady} />
      )}

      {gameState === 'training' && (
        <TrainingMode
          playerName={stableUsername}
          onLeaveGame={handleLeaveGame}
        />
      )}

      {gameState === 'tutorial' && (
        <TutorialMode
          playerName={stableUsername}
          onLeaveGame={isTutorialRequired ? undefined : handleLeaveGame}
          requireCompletion={isTutorialRequired}
          onComplete={handleTutorialComplete}
        />
      )}

      {gameState === 'singleplayer' && (
        <SinglePlayerGame
          playerName={stableUsername}
          onLeaveGame={handleLeaveGame}
        />
      )}


    </div>
  );
};

export default GamePage;
