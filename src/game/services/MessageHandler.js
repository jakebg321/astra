export class MessageHandler {
  constructor(gameStateManager, eventEmitter) {
    this.gameStateManager = gameStateManager;
    this.eventEmitter = eventEmitter;
    this.currentRoom = null;
  }

  handleMessage(type, payload) {
    this.eventEmitter.emit(type, payload);
    
    switch (type) {
      case 'rooms_list':
        this.eventEmitter.emit('rooms_updated', payload.rooms || []);
        break;
      case 'rooms_update':
        this.eventEmitter.emit('rooms_updated', payload.rooms || []);
        break;
        
      case 'room_created':
      case 'room_joined':
        if (payload && payload.room) {
          this.currentRoom = payload.room;

          if (payload.room.testModeConfig && window.testMode) {
            window.testMode.config = { ...payload.room.testModeConfig };
            window.testMode.saveConfig();

            window.dispatchEvent(new CustomEvent('test-mode-sync', {
              detail: { 
                config: payload.room.testModeConfig,
                source: 'room'
              }
            }));
          }
        }
        break;
        
      case 'initial_state':
        this.handleInitialState(payload);
        break;
        
      case 'game_started':
        this.handleGameStart(payload);
        break;
        
      case 'stateUpdate':
        this.gameStateManager.handleStateUpdate(payload);
        this.eventEmitter.emit('gameStateUpdate', this.gameStateManager.getGameState());
        break;
        
      case 'positionCorrection':
        this.handlePositionCorrection(payload);
        break;
        
      case 'boundaryProximity':
        this.handleBoundaryProximity(payload);
        break;
        
      case 'playerHit':
        this.handlePlayerHit(payload);
        break;
        
      case 'bulletFired':
        this.handleBulletFired(payload);
        break;
        
      case 'gameEnd':
        this.handleGameEnd(payload);
        break;
        
      case 'error':
        this.handleError(payload);
        break;
        
      case 'boundaryHit':
      case 'boundaryWarning':
        window.dispatchEvent(new CustomEvent('boundary-warning', {
          detail: { 
            proximity: payload.intensity || 1,
            message: payload.message
          }
        }));
        break;
        
      case 'portal_entry':

        window.dispatchEvent(new CustomEvent('portal-travel-start', {
          detail: {
            playerId: payload.playerId,
            playerName: payload.playerName,
            from: payload.fromPortal,
            to: payload.toPortal
          }
        }));
        break;
        
      case 'portal_exit':

        window.dispatchEvent(new CustomEvent('portal-travel-end', {
          detail: {
            playerId: payload.playerId,
            playerName: payload.playerName,
            portal: payload.portal,
            position: payload.position
          }
        }));
        break;

      case 'portal_beacon_placed':
        window.dispatchEvent(new CustomEvent('enemy-beacon-placed', {
          detail: { playerId: payload.playerId, position: payload.position }
        }));
        break;

      case 'portal_beacon_removed':
        window.dispatchEvent(new CustomEvent('enemy-beacon-removed', {
          detail: { playerId: payload.playerId, reason: payload.reason }
        }));
        break;

      case 'playerDisconnected':
        this.eventEmitter.emit('playerDisconnected', payload);
        break;

      case 'playerReconnected':
        this.eventEmitter.emit('playerReconnected', payload);
        break;
    }
  }

  handleInitialState(payload) {

    if (payload && payload.gameState) {
      if (payload.gameState.players) {
        this.gameStateManager.gameState.players = payload.gameState.players;
      }
      if (payload.gameState.bullets) {
        this.gameStateManager.gameState.bullets = payload.gameState.bullets;
      }
    }

    this.eventEmitter.emit('initialState', payload);
  }

  handleGameStart(payload) {
    
    this.gameStateManager.gameState.status = 'playing';
    
    if (payload && payload.gameState) {
      if (payload.gameState.players) {
        this.gameStateManager.gameState.players = payload.gameState.players;
      }
      if (payload.gameState.bullets) {
        this.gameStateManager.gameState.bullets = payload.gameState.bullets;
      }
    }
    
    this.eventEmitter.emit('gameStart', this.gameStateManager.getGameState());
  }

  handlePlayerHit(data) {

    this.eventEmitter.emit('playerHit', data);
  }

  handleBulletFired(bullet) {

    this.eventEmitter.emit('bulletFired', bullet);
  }

  handlePositionCorrection(data) {
    console.log('Ignoring server position correction; movement is client-authoritative');

    return;
  }

  calculateBoundaryDirection(position) {

    const { size } = { size: { x: 600, y: 400, z: 600 } };
    const halfSize = { x: size.x / 2, y: size.y / 2, z: size.z / 2 };
    
    const direction = { x: 0, y: 0, z: 0 };
    
    if (Math.abs(position.x) > halfSize.x * 0.9) {
      direction.x = Math.sign(position.x);
    }
    if (Math.abs(position.y) > halfSize.y * 0.9) {
      direction.y = Math.sign(position.y);
    }
    if (Math.abs(position.z) > halfSize.z * 0.9) {
      direction.z = Math.sign(position.z);
    }
    
    return direction;
  }

  handleBoundaryProximity(data) {
    console.log('Boundary proximity update:', data);

    window.dispatchEvent(new CustomEvent('boundary-warning', {
      detail: {
        proximity: data.proximity,
        direction: data.direction,
        severity: data.severity,
        source: 'proximity_warning'
      }
    }));
  }

  handleGameEnd(data) {
    this.gameStateManager.gameState.status = 'finished';
    this.eventEmitter.emit('gameEnd', data);
  }

  handleError(payload) {
    console.error('Server error:', payload);

    if (payload.code === 'SERVER_FULL') {
      console.log('Server full, auto-scaling in progress. Will retry connection...');
      this.eventEmitter.emit('server_full', payload);
      return;
    }

    this.eventEmitter.emit('error', payload);
  }
} 
