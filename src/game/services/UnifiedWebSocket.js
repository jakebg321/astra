import { NetworkConnection } from './NetworkConnection.js';
import { GameStateManager } from './GameStateManager.js';
import { MessageHandler } from './MessageHandler.js';
import { TestModeSimulator } from './TestModeSimulator.js';
import { SimpleEventEmitter } from './SimpleEventEmitter.js';

const globalScope = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
const UWS_INSTANCE_KEY = '__UNIFIED_WEBSOCKET_INSTANCE__';

class UnifiedWebSocket extends SimpleEventEmitter {
  constructor() {
    super();

    this.connection = new NetworkConnection();
    this.gameStateManager = new GameStateManager();
    this.messageHandler = new MessageHandler(this.gameStateManager, this);
    this.testMode = new TestModeSimulator(this.gameStateManager, this);
    this.activeRoomId = null;
    this.hasConnectedOnce = false;

    this.performanceMonitor = null;
    this.userTiming = null;

    if (typeof window !== 'undefined') {
      window.wsMonitor = this.performanceMonitor;
      window.wsUserTiming = this.userTiming;
    }

    this.connection.on('connected', () => {
      const isReconnect = this.hasConnectedOnce;
      this.hasConnectedOnce = true;

      if (this.gameStateManager.playerId && this.gameStateManager.playerName) {
        this.send('register', {
          playerId: this.gameStateManager.playerId,
          playerName: this.gameStateManager.playerName
        });
        this.send('get_rooms', {});

        if (isReconnect && this.activeRoomId) {
          console.warn(`Rejoining active room after reconnect: ${this.activeRoomId}`);
          this.send('join_room', { roomId: this.activeRoomId });
        }
      }

      this.emit('connected');
    });
    this.connection.on('disconnected', () => this.emit('disconnected'));
    this.connection.on('message', ({ type, payload }) => {
      if ((type === 'room_created' || type === 'room_joined') && payload?.room?.id) {
        this.activeRoomId = payload.room.id;
      }

      if (type === 'error' && payload?.message === 'Room not found') {
        this.activeRoomId = null;
      }

      const markName = this.performanceMonitor?.measureMessageReceived(type);

      if (this.pendingRoundTripMeasures && this.pendingRoundTripMeasures.has(type)) {
        const endMeasure = this.pendingRoundTripMeasures.get(type);
        endMeasure();
        this.pendingRoundTripMeasures.delete(type);
      }

      this.messageHandler.handleMessage(type, payload);

      if (type === 'friend_request') {
        console.log('RECEIVED FRIEND REQUEST:', payload);
        window.dispatchEvent(new CustomEvent('friendRequestReceived', {
          detail: payload
        }));
      }

      if (type === 'friend_request_accepted') {
        console.log('RECEIVED FRIEND REQUEST ACCEPTED:', payload);
        window.dispatchEvent(new CustomEvent('friendRequestAccepted', {
          detail: payload
        }));
      }

      if (type === 'game_invite_received') {
        console.log('Game invite received:', payload);
        if (window.gameInviteManager) {
          window.gameInviteManager.addInvite({
            inviterName: payload.fromPlayerName,
            roomId: payload.roomId,
            roomName: `${payload.fromPlayerName}'s Game`,
            gameType: payload.gameType || 'multiplayer',
            message: payload.message || "Let's battle!"
          });
        }
      }

      this.performanceMonitor?.measureMessageProcessed(markName, { type, payloadSize: JSON.stringify(payload).length });
    });
  }

  async connect(playerName) {

    if (this.connection.ws && this.connection.ws.readyState === WebSocket.OPEN) {

      if (!this.gameStateManager.playerId || !this.gameStateManager.playerId.startsWith(playerName)) {
        console.log('EXISTING CONNECTION DETECTED - Closing for new player');
        this.connection.disconnect();

        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        console.log('REUSING EXISTING CONNECTION for same player');
        return Promise.resolve(this.connection.ws);
      }
    }

    if (!this.gameStateManager.playerId || !this.gameStateManager.playerId.startsWith(playerName)) {
      console.log('Generating new player ID for:', playerName);

      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const newPlayerId = `${playerName}_${timestamp}_${randomId}`;

      console.log(`NEW PLAYER ID: ${newPlayerId} (timestamp: ${timestamp})`);
      this.gameStateManager.setPlayerId(newPlayerId, playerName);
    } else {
      console.log('Reusing existing player ID for reconnection:', this.gameStateManager.playerId);
      this.gameStateManager.setPlayerName(playerName);
    }

    const wsUrl = this.getWebSocketURL();

    return this.connection.connect(wsUrl).then(() => this.connection.ws);
  }

  send(type, payload) {
    const messageId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const endRoundTripMeasure = this.userTiming?.measureRoundTrip(messageId);

    if (endRoundTripMeasure) {
      this.pendingRoundTripMeasures = this.pendingRoundTripMeasures || new Map();
      this.pendingRoundTripMeasures.set(type, endRoundTripMeasure);
    }

    if (process.env.NODE_ENV !== 'production') {
      window.debugPerf?.startTimer('network');
    }

    if (process.env.NODE_ENV !== 'production') {
      window.networkDebugStats = window.networkDebugStats || { sent: 0, received: 0, latency: 0 };
      window.networkDebugStats.sent++;
    }

    if (window.MULTIPLAYER_TEST_MODE && type !== 'register') {
      if (process.env.NODE_ENV !== 'production') {
        window.debugPerf?.endTimer('network');
      }
      return true;
    }

    const result = this.connection.send(type, payload);

    if (process.env.NODE_ENV !== 'production') {
      window.debugPerf?.endTimer('network');
    }
    return result;
  }

  sendInput(input) {
    const packet = this.gameStateManager.createInputPacket(input);
    return this.send('input', packet);
  }

  fire(actualPosition, actualRotation) {

    console.log('FIRE ATTEMPT:', {
      hasWs: !!this.ws,
      wsReadyState: this.ws ? this.ws.readyState : 'NULL',
      connectionIsConnected: this.connection?.isConnected(),
      connectionWs: !!this.connection?.ws
    });

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('FIRE BLOCKED - Connection not ready');
      return;
    }

    const position = {
      x: actualPosition.x,
      y: actualPosition.y,
      z: actualPosition.z
    };

    const rotation = {
      x: actualRotation.x,
      y: actualRotation.y,
      z: actualRotation.z
    };

    console.log('SENDING FIRE MESSAGE:', { position, rotation });
    const result = this.send('fire', {
      position,
      rotation
    });
    console.log('FIRE SEND RESULT:', result);
  }

  createRoom(roomName, roomData = {}, profile = null) {

    const testConfig = window.testMode ? window.testMode.config : null;

    let lightProfile = null;
    if (profile) {
      lightProfile = {
        username: profile.username,
        display_name: profile.display_name,
        customization: {
          avatar: profile.customization?.avatar,
          avatarType: profile.customization?.avatarType,
          theme: profile.customization?.theme,
          bio: profile.customization?.bio,
          status: profile.customization?.status
        }
      };

      if (profile.customization?.customAvatar) {
        lightProfile.customization.customAvatar = profile.customization.customAvatar;
      }
    }

    console.log('Creating room with profile:', lightProfile ? {
      username: lightProfile.username,
      avatarType: lightProfile.customization?.avatarType,
      theme: lightProfile.customization?.theme,
      hasCustomAvatar: !!lightProfile.customization?.customAvatar,
      customAvatarSize: lightProfile.customization?.customAvatar?.length || 0,
      note: 'Avatar already resized during upload'
    } : 'NO PROFILE PROVIDED');

    const message = {
      name: roomName,
      maxPlayers: 2,
      ...(roomData.seriesType && { seriesType: roomData.seriesType }),
      ...(testConfig && { testModeConfig: testConfig }),
      ...(lightProfile && { profile: lightProfile })
    };

    console.log('[CLIENT] Sending create_room message:', {
      messageKeys: Object.keys(message),
      hasProfile: !!message.profile,
      profileAvatarSize: message.profile?.customization?.customAvatar?.length || 0,
      totalMessageSize: JSON.stringify(message).length
    });

    this.send('create_room', message);
  }

  joinRoom(roomId, profile = null) {

    let lightProfile = null;
    if (profile) {
      lightProfile = {
        username: profile.username,
        display_name: profile.display_name,
        customization: {
          avatar: profile.customization?.avatar,
          avatarType: profile.customization?.avatarType,
          theme: profile.customization?.theme,
          bio: profile.customization?.bio,
          status: profile.customization?.status
        }
      };

      if (profile.customization?.customAvatar) {
        lightProfile.customization.customAvatar = profile.customization.customAvatar;
      }
    }

    console.log('Joining room with profile:', lightProfile ? {
      username: lightProfile.username,
      avatarType: lightProfile.customization?.avatarType,
      theme: lightProfile.customization?.theme,
      hasCustomAvatar: !!lightProfile.customization?.customAvatar,
      customAvatarSize: lightProfile.customization?.customAvatar?.length || 0
    } : 'NO PROFILE PROVIDED');

    this.send('join_room', {
      roomId,
      ...(lightProfile && { profile: lightProfile })
    });
  }

  leaveRoom(options = {}) {
    const payload = {};
    const roomId = options.roomId || this.activeRoomId || null;

    if (roomId) payload.roomId = roomId;
    if (options.force === true) payload.force = true;
    if (options.source) payload.source = options.source;

    this.send('leave_room', payload);

    this.activeRoomId = null;
    this.messageHandler.currentRoom = null;
  }

  getRooms() {
    this.send('get_rooms', {});
  }

  updatePresence(status, gameData = null) {
    this.send('update_presence', { status, gameData });
  }

  loadFriends(friendIds) {
    this.send('load_friends', { friendIds });
  }

  inviteFriend(friendId, gameType = 'multiplayer', message = null) {
    this.send('invite_friend', { friendId, gameType, message });
  }

  getLocalPlayer() {
    return this.gameStateManager.getLocalPlayer();
  }

  getOtherPlayers() {
    return this.gameStateManager.getOtherPlayers();
  }

  getGameState() {
    return this.gameStateManager.getGameState();
  }

  updateLocalPlayerPosition(position) {
    const localPlayer = this.gameStateManager.getLocalPlayer();
    if (localPlayer) {

      localPlayer.position = {
        x: position.x,
        y: position.y,
        z: position.z
      };
    }
  }

  updateLocalPlayerRotation(rotation) {
    const localPlayer = this.gameStateManager.getLocalPlayer();
    if (localPlayer) {

      localPlayer.rotation = {
        x: rotation.x,
        y: rotation.y,
        z: rotation.z
      };
    }
  }

  updateBullets(deltaTime) {
    if (window.MULTIPLAYER_TEST_MODE) {
      this.testMode.updateBullets(deltaTime);
    }
  }

  resetForNewGame() {
    console.log('UnifiedWebSocket: Resetting for new game...');
    this.activeRoomId = null;
    this.messageHandler.currentRoom = null;

    this.gameStateManager.gameState = {
      players: {},
      bullets: [],
      status: 'waiting',
      lastUpdate: Date.now()
    };

    this.gameStateManager.pendingInputs = [];
    this.gameStateManager.inputSequence = 0;
    this.gameStateManager.lastServerUpdate = 0;

    this.gameStateManager.lastDesyncWarning = 0;

    if (this.performanceMonitor) {
      this.performanceMonitor.reset();
    }

    if (this.pendingRoundTripMeasures) {
      this.pendingRoundTripMeasures.clear();
    }

    console.log('WebSocket state reset complete');
  }

  disconnect() {

    if (this.performanceMonitor) {
      this.performanceMonitor.destroy();
    }

    this.connection.disconnect();
  }

  get ws() {
    return this.connection.ws;
  }

  get isConnected() {
    return this.connection.isConnected();
  }

  getWebSocketURL() {
    const envUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_URL)
      ? import.meta.env.VITE_WS_URL
      : null;
    const globalOverride = (typeof window !== 'undefined' && window.WS_URL) ? window.WS_URL : null;

    if (envUrl) return envUrl;
    if (globalOverride) return globalOverride;

    if (typeof window !== 'undefined' && window.location) {
      const host = window.location.host;
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      return `${protocol}://${host}/ws/game`;
    }

    return 'ws://localhost:3001/ws/game';
  }

}

export const getWebSocketInstance = () => {
  if (!globalScope[UWS_INSTANCE_KEY]) {
    globalScope[UWS_INSTANCE_KEY] = new UnifiedWebSocket();
  }
  return globalScope[UWS_INSTANCE_KEY];
};
