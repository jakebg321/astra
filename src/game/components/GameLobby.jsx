import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, RefreshCw, Zap, Settings, Gamepad2 } from 'lucide-react';
import { getWebSocketInstance } from '../services/UnifiedWebSocket';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import ProfileRequiredModal from '../../components/ProfileRequiredModal';
import GameTutorial from '../../components/GameTutorial';
import FriendsWidget from '../../components/FriendsWidget';
import AssetStatusIndicator from './AssetStatusIndicator';
import Avatar from '../../components/ui/Avatar';
import Banner from '../../components/ui/Banner';
import { initializeAudioOnInteraction } from '../services/AudioManager';
import AudioControls from './AudioControls';

const GameLobby = ({ onJoinRoom, playerName, onEnterTestMode, onEnterTraining, onEnterTutorial }) => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [forceCockpitMode, setForceCockpitMode] = useState(false);
  const [seriesType, setSeriesType] = useState(null);
  const { profile } = useUser();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    initializeAudioOnInteraction();
  }, []);

  useEffect(() => {
    const connectWithRetry = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const UnifiedWebSocket = getWebSocketInstance();

          if (!UnifiedWebSocket.ws || UnifiedWebSocket.ws.readyState !== WebSocket.OPEN) {
            console.log(`Connection attempt ${i + 1}/${retries}`);
            await UnifiedWebSocket.connect(playerName);
            setIsConnected(true);
            setConnectionError(null);
            break;
          } else {
            setIsConnected(true);
            break;
          }
        } catch (error) {
          console.error(`Connection attempt ${i + 1} failed:`, error);
          if (i === retries - 1) {
            setConnectionError('Failed to connect to game server');
          } else {

            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    };

    connectWithRetry();

    const handleConnected = () => setIsConnected(true);
    const handleDisconnected = () => setIsConnected(false);
    const handleError = (error) => setConnectionError(error.message || 'Connection error');
    const handleRoomsUpdate = (rooms) => {
      console.log('GameLobby - Received rooms update:', rooms);

      (rooms || []).forEach((room, roomIndex) => {
        console.log(`Room ${roomIndex + 1} (${room.name || room.id}) players:`, {
          roomId: room.id,
          roomName: room.name,
          playerCount: room.players?.length || 0,
          players: room.players?.map((player, playerIndex) => ({
            playerIndex,
            name: player.display_name || player.name,
            username: player.username,
            avatar: player.avatar,
            avatar_type: player.avatar_type,
            avatarType: player.avatarType,
            custom_avatar: player.custom_avatar,
            customAvatar: player.customAvatar,
            hasCustomAvatar: !!(player.custom_avatar || player.customAvatar),
            customAvatarLength: (player.custom_avatar || player.customAvatar)?.length || 0,
            hasCustomization: !!(player.customization),
            customizationAvatarType: player.customization?.avatarType,
            customizationCustomAvatar: player.customization?.customAvatar,
            customizationCustomAvatarLength: player.customization?.customAvatar?.length || 0,

            theme: player.theme || 'none',
            allKeys: Object.keys(player),

            shouldShowCustom: !!(
              (player.avatar_type === 'custom' || player.avatarType === 'custom' || player.customization?.avatarType === 'custom') &&
              (player.custom_avatar || player.customAvatar || player.customization?.customAvatar)
            )
          }))
        });

        room.players?.forEach((player, playerIndex) => {
        });
      });

      setRooms(rooms || []);
    };
    const handleRoomCreated = (data) => {

      const room = data?.room || data;

      setIsCreatingRoom(false);
      setNewRoomName('');
      onJoinRoom(room);
    };
    const handleRoomJoined = (data) => {

      const room = data?.room || data;

      onJoinRoom(room);
    };
    const handleGameStart = () => {

      console.log('Game starting!');
    };

    const UnifiedWebSocket = getWebSocketInstance();
    UnifiedWebSocket.on('connected', handleConnected);
    UnifiedWebSocket.on('disconnected', handleDisconnected);
    UnifiedWebSocket.on('error', handleError);
    UnifiedWebSocket.on('rooms_updated', handleRoomsUpdate);
    UnifiedWebSocket.on('room_created', handleRoomCreated);
    UnifiedWebSocket.on('room_joined', handleRoomJoined);
    UnifiedWebSocket.on('gameStart', handleGameStart);
    return () => {
      UnifiedWebSocket.off('connected', handleConnected);
      UnifiedWebSocket.off('disconnected', handleDisconnected);
      UnifiedWebSocket.off('error', handleError);
      UnifiedWebSocket.off('rooms_updated', handleRoomsUpdate);
      UnifiedWebSocket.off('room_created', handleRoomCreated);
      UnifiedWebSocket.off('room_joined', handleRoomJoined);
      UnifiedWebSocket.off('gameStart', handleGameStart);
                };
  }, [playerName, onJoinRoom]);

  const handleCreateRoom = () => {
    if (!profile) {
      setShowProfileModal(true);
      return;
    }

    if (!newRoomName.trim() || !isConnected) return;

    const roomData = {
      roomName: newRoomName,
      forceCockpitMode: forceCockpitMode,
      ...(seriesType && { seriesType })
    };

    if (forceCockpitMode) {
      localStorage.setItem('roomForceCockpitMode', 'true');
      console.log('Room creator: Force cockpit mode enabled - you and all players will use first-person view');
    } else {
      localStorage.removeItem('roomForceCockpitMode');
    }

    getWebSocketInstance().createRoom(newRoomName, roomData, profile);
    setIsCreatingRoom(false);
    setNewRoomName('');
  };

  const handleStartCreating = () => {
    if (!profile) {
      setShowProfileModal(true);
      return;
    }

    setIsCreatingRoom(true);
  };

  const handleJoinRoom = (room) => {
    if (!profile) {
      setShowProfileModal(true);
      return;
    }

    if (room.players.length < room.maxPlayers && room.status === 'waiting' && isConnected) {
      if (room.forceCockpitMode) {
        localStorage.setItem('roomForceCockpitMode', 'true');
        console.log('Room requires cockpit mode - forcing all players into first-person view');
      } else {
        localStorage.removeItem('roomForceCockpitMode');
      }

      getWebSocketInstance().joinRoom(room.id, profile);
    }
  };

  const refreshRooms = () => {
    if (isConnected) {
      getWebSocketInstance().getRooms();
    }
  };

  if (connectionError) {
    return (
      <div className="relative flex items-center justify-center min-h-screen overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="fixed inset-0 w-full h-full z-0"
          style={{
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            objectPosition: 'center 60%',
            transform: 'scale(1.05)'
          }}
        >
          <source src="/newLobby.mp4" type="video/mp4" />
        </video>


        <div className="fixed inset-0 bg-black/60 z-10" />

        <div className="relative z-20 hud-panel p-8 text-center max-w-md">
          <div className="text-red-400 mb-4 text-lg">⚠️ {connectionError}</div>
          
          <div 
            className="mb-6 p-4 rounded-lg"
            style={{ 
              background: '#1a1a2e', 
              border: '1px solid #ff6600'
            }}
          >
            <p className="text-gray-300 mb-2">Can't connect to the game server?</p>
            <p className="text-gray-500 text-xs mt-2">
              Keep npm run demo running, then try reconnecting.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.reload()}
            className="tactical-btn"
          >
            Retry Connection
          </motion.button>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="relative flex items-center justify-center min-h-screen overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="fixed inset-0 w-full h-full z-0"
          style={{
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            objectPosition: 'center 60%',
            transform: 'scale(1.05)'
          }}
        >
          <source src="/newLobby.mp4" type="video/mp4" />
        </video>


        <div className="fixed inset-0 bg-black/60 z-10" />

        <div className="relative z-20 hud-panel p-8 text-center">
          <div className="text-cyan-400 mb-4">Connecting to server...</div>
          <div className="animate-pulse">
            <Zap className="w-8 h-8 mx-auto text-cyan-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen p-4 overflow-hidden">
      <AssetStatusIndicator />

      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="fixed inset-0 w-full h-full z-0"
        style={{
          width: '100vw',
          height: '115vh',
          objectFit: 'cover',
          objectPosition: 'center 70%',
          transform: 'scale(1.15)'
        }}
      >
        <source src="/newLobby.mp4" type="video/mp4" />
      </video>


      <div className="fixed inset-0 bg-black/50 z-10" />

      <div className="relative z-20 hud-panel p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto backdrop-blur-sm bg-black/30">
        {profile && (
          <div className="mb-6 p-4 rounded-lg bg-black/40 border border-purple-500/30">
            <div className="flex items-center gap-4 flex-wrap">
              <Avatar
                user={profile}
                size="xl"
                showBorder={true}
                showStatus={true}
                theme={profile.theme}
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white">{profile.display_name || profile.username}</h2>
                <p className="text-cyan-400">@{profile.username}</p>
                <div className="flex gap-4 text-sm text-gray-300 mt-1">
                  <span>Wins: {profile.wins || 0}</span>
                  <span>Games: {profile.total_games || 0}</span>
                  <span>Streak: {profile.current_win_streak || 0}</span>
                </div>
              </div>
              {profile.personal_banner && (
                <div className="hidden md:block">
                  <Banner
                    user={profile}
                    height={80}
                    width={200}
                    className="border border-purple-500/50"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tactical-title">SPACE COMBAT LOBBY</h1>
          <div className="flex gap-2 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/settings')}
              className="bg-gradient-to-r from-gray-600/80 to-gray-700/80 hover:from-gray-500 hover:to-gray-600 border border-gray-500/50 text-white font-bold py-2 px-3 transition-all flex items-center gap-1 tactical-btn text-sm"
            >
              <Settings size={18} />
              <span className="hidden sm:inline">SETTINGS</span>
            </motion.button>
            <FriendsWidget onInviteFriend={(friend, inviteMessage) => {
              const ws = getWebSocketInstance();
              if (!ws) return;

              ws.inviteFriend(
                friend.id,
                'multiplayer',
                inviteMessage || `${profile?.username || 'A player'} invited you to play!`
              );
            }} />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={refreshRooms}
              className="tactical-btn flex items-center gap-1 text-sm py-2 px-3"
            >
              <RefreshCw size={18} />
              <span className="hidden sm:inline">REFRESH</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                console.log('[TUTORIAL-DEBUG] Tutorial button clicked', {
                  at: new Date().toISOString(),
                  pathname: window.location.pathname,
                  hasHandler: !!onEnterTutorial
                });
                if (onEnterTutorial) {
                  onEnterTutorial();
                }
              }}
              className="bg-gradient-to-r from-cyan-600/80 to-blue-600/80 hover:from-cyan-500 hover:to-blue-500 border border-cyan-500/50 text-white font-bold py-2 px-3 transition-all flex items-center gap-1 tactical-btn text-sm"
            >
              <Gamepad2 size={18} />
              <span className="hidden lg:inline">TUTORIAL</span>
              <span className="hidden sm:inline lg:hidden">TUTOR</span>
              <span className="sm:hidden">📘</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                console.log('[TUTORIAL-DEBUG] Training button clicked', {
                  at: new Date().toISOString(),
                  pathname: window.location.pathname,
                  hasHandler: !!onEnterTraining
                });
                if (onEnterTraining) {
                  onEnterTraining();
                }
              }}
              className="bg-gradient-to-r from-green-600/80 to-emerald-600/80 hover:from-green-500 hover:to-emerald-500 border border-green-500/50 text-white font-bold py-2 px-3 transition-all flex items-center gap-1 tactical-btn text-sm"
            >
              <Gamepad2 size={18} />
              <span className="hidden lg:inline">TRAINING RANGE</span>
              <span className="hidden sm:inline lg:hidden">RANGE</span>
              <span className="sm:hidden">🎯</span>
            </motion.button>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold text-cyan-400 mb-2">Create a Game</h3>
            <p className="text-sm text-gray-400">Open a room, then invite a friend or wait for a pilot to join</p>
          </div>
          <div className="flex gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStartCreating}
              className="tactical-btn flex items-center gap-2"
            >
              <span>CREATE GAME</span>
            </motion.button>
          </div>
        </div>


        {isCreatingRoom && (
          <div className="mb-4 text-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSeriesType(seriesType === 'bo3' ? null : 'bo3')}
              className={`px-4 py-2 rounded text-sm tactical-btn ${seriesType === 'bo3'
                ? 'bg-purple-600/80 border-purple-500/50 ring-1 ring-purple-400'
                : 'bg-gray-700/80 border-gray-500/50'
              }`}
            >
              {seriesType === 'bo3' ? '✓ BEST OF 3' : 'BEST OF 3'}
            </motion.button>
            {seriesType === 'bo3' && (
              <p className="text-sm text-purple-400 mt-1">First to 2 wins takes the series</p>
            )}
          </div>
        )}


        {isCreatingRoom && (
          <div className="mb-8">
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateRoom(); }}
                placeholder="Enter room name"
                className="flex-1 bg-black/70 border border-cyan-500/50 text-white px-4 py-2 rounded backdrop-blur-sm"
                autoFocus
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCreateRoom}
                className="tactical-btn"
              >
                CREATE GAME
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setIsCreatingRoom(false);
                  setNewRoomName('');
                }}
                className="tactical-btn bg-red-600/80 hover:bg-red-500/80"
              >
                CANCEL
              </motion.button>
            </div>

            <div className="p-4 bg-black/40 border border-purple-500/50 rounded-lg">
              <motion.label
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={forceCockpitMode}
                  onChange={(e) => setForceCockpitMode(e.target.checked)}
                  className="w-5 h-5 rounded border-2 border-purple-500 bg-black/50 checked:bg-purple-600 checked:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="text-purple-300 font-bold text-lg">🚀 Force All Players Cockpit Mode</div>
                  <div className="text-gray-400 text-sm">All players in this room will be automatically put in first-person cockpit view</div>
                  <div className="text-cyan-400 text-xs mt-1">Recommended for competitive play and immersive combat</div>
                </div>
              </motion.label>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <motion.div
              key={room.id}
              whileHover={{ scale: 1.02 }}
              className="hud-panel p-4 backdrop-blur-sm bg-black/40"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold tactical-title">{room.name}</h2>
                <div className="flex items-center gap-2 text-cyan-400">
                  <Users size={16} />
                  <span>{room.players.length}/{room.maxPlayers}</span>
                </div>
              </div>

              {room.forceCockpitMode && (
                <div className="mb-2 p-2 bg-purple-900/20 border border-purple-500/30 rounded">
                  <div className="flex items-center gap-1 text-purple-400 text-sm">
                    🚀 <span>Cockpit Mode Required</span>
                  </div>
                </div>
              )}

              <div className="space-y-3 mb-4">
                {room.players.map((player, index) => {

                  return (
                    <div key={index} className="flex items-center justify-between bg-black/20 p-2 rounded">
                      <div className="flex items-center gap-3">
                        <Avatar
                          user={player}
                          size="sm"
                          showStatus={true}
                          theme={player.theme || 'cosmic'}
                        />
                        <div>
                          <span className="text-cyan-300 font-medium">{player.display_name || player.name}</span>
                          <div className="text-xs text-gray-400">@{player.username || player.name}</div>
                        </div>
                      </div>
                      <span className="text-green-400 font-mono text-sm">READY</span>
                    </div>
                  );
                })}
                {Array.from({ length: room.maxPlayers - room.players.length }).map((_, index) => (
                  <div key={`empty-${index}`} className="flex items-center justify-between bg-black/10 p-2 rounded border-dashed border border-gray-600">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-700/50 border-2 border-dashed border-gray-500"></div>
                      <span className="text-gray-500 text-sm">Waiting for player...</span>
                    </div>
                    <span className="text-gray-500 font-mono text-sm">OPEN</span>
                  </div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleJoinRoom(room)}
                disabled={room.players.length >= room.maxPlayers || room.status !== 'waiting'}
                className={`w-full tactical-btn ${room.players.length >= room.maxPlayers || room.status !== 'waiting'
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                  }`}
              >
                {room.players.length >= room.maxPlayers ? 'ROOM FULL' : 'JOIN COMBAT'}
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>

      <ProfileRequiredModal
        isOpen={showProfileModal}
        isOptional={false}
        onProfileCreated={(profile) => {
          console.log('Profile created:', profile);
          setShowProfileModal(false);
          const tutorialCompleted = localStorage.getItem('astra_tutorial_completed');
          if (!tutorialCompleted) {
            setShowTutorial(true);
          }
        }}
        onClose={() => setShowProfileModal(false)}
      />

      <GameTutorial
        isOpen={showTutorial}
        onComplete={() => {
          setShowTutorial(false);
        }}
        isFirstTime={!localStorage.getItem('astra_tutorial_completed')}
      />

      <AudioControls />

    </div>
  );
};

export default GameLobby;
