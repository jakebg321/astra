export class GameStateManager {
  constructor() {
    this.playerId = null;
    this.playerName = null;
    this.gameState = {
      players: {},
      bullets: [],
      status: 'waiting',
      lastUpdate: Date.now()
    };
    this.pendingInputs = [];
    this.inputSequence = 0;
  }

  setPlayerId(id, name) {
    this.playerId = id;
    this.playerName = name;
  }

  setPlayerName(name) {
    this.playerName = name;
  }

  handleStateUpdate(update) {
    if (!update) return;
    
    this.gameState.lastUpdate = Date.now();

    if (update.yourState && this.playerId) {
      if (!this.gameState.players[this.playerId]) {
        this.gameState.players[this.playerId] = {};
      }
      
      const localPlayer = this.gameState.players[this.playerId];
      const serverState = update.yourState;

      if (localPlayer.position && serverState.position) {

        const clientPos = { ...localPlayer.position };
        const clientVel = localPlayer.velocity ? { ...localPlayer.velocity } : null;

        Object.assign(localPlayer, serverState);

        const dx = serverState.position.x - clientPos.x;
        const dy = serverState.position.y - clientPos.y;
        const dz = serverState.position.z - clientPos.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

        const portalLock = window.portalTeleportLock;
        const isPortalTeleport = portalLock && (
          portalLock.active || 
          (portalLock.timestamp && Date.now() - portalLock.timestamp < 1000)
        );

        const serverMatchesPortalDest = portalLock && portalLock.position && (
          Math.abs(serverState.position.x - portalLock.position.x) < 5 &&
          Math.abs(serverState.position.y - portalLock.position.y) < 5 &&
          Math.abs(serverState.position.z - portalLock.position.z) < 5
        );
        
        if (window.forceReplaySpawn && serverState.position) {

          console.log('REPLAY DEBUG: Force spawn override applied', {
            serverPos: serverState.position
          });
          localPlayer.position = { ...serverState.position };
          localPlayer.velocity = { x: 0, y: 0, z: 0 };
          if (window.gameMovementState?.position) {
            window.gameMovementState.position.set(
              serverState.position.x,
              serverState.position.y,
              serverState.position.z
            );
            window.gameMovementState.velocity?.set(0, 0, 0);
            window.gameMovementState.spawnReceived = true;
            window.gameMovementState.initialized = true;
          }
          window.forceReplaySpawn = false;
        } else if (window.forceReplaySpawn && !serverState.position) {
          console.warn('REPLAY DEBUG: Force spawn override skipped - missing server position');
        } else if (isPortalTeleport || serverMatchesPortalDest) {

          if (!this.lastPortalLogTime || Date.now() - this.lastPortalLogTime > 5000) {
            console.log('Portal teleport detected');
            this.lastPortalLogTime = Date.now();
          }
          localPlayer.position = { ...serverState.position };
          localPlayer.velocity = { x: 0, y: 0, z: 0 };

          if (portalLock && serverMatchesPortalDest) {
            window.portalTeleportLock = null;
          }
        } else if (distance > 500) {

          if (!this.replaySpawnLogCount) this.replaySpawnLogCount = 0;
          if (this.replaySpawnLogCount < 5) {
            console.log('REPLAY SPAWN DETECTED - Accepting server position override:', {
              serverPos: [serverState.position.x.toFixed(1), serverState.position.y.toFixed(1), serverState.position.z.toFixed(1)],
              clientPos: [clientPos.x.toFixed(1), clientPos.y.toFixed(1), clientPos.z.toFixed(1)],
              distance: distance.toFixed(1)
            });
            this.replaySpawnLogCount++;
          }

          localPlayer.position = { ...serverState.position };
          localPlayer.velocity = { x: 0, y: 0, z: 0 };
        } else {

          localPlayer.position = clientPos;
          if (clientVel) {
            localPlayer.velocity = clientVel;
          }
        }

        if (distance <= 500 && distance > 50.0) {
          if (!this.lastDesyncWarning || Date.now() - this.lastDesyncWarning > 5000) {
            console.log(`SERVER POSITION IGNORED (Client Authoritative): ${distance.toFixed(1)} units difference`, {
              clientPos: [clientPos.x.toFixed(1), clientPos.y.toFixed(1), clientPos.z.toFixed(1)],
              serverPos: [serverState.position.x.toFixed(1), serverState.position.y.toFixed(1), serverState.position.z.toFixed(1)],
              info: 'This is EXPECTED in cockpit mode - client owns position'
            });
            this.lastDesyncWarning = Date.now();
          }
        }
      } else {

        Object.assign(localPlayer, serverState);
      }
    }

    if (update.others && typeof update.others === 'object') {
      const serverPlayerIds = new Set(Object.keys(update.others));

      Object.entries(update.others).forEach(([playerId, playerData]) => {
        if (!playerData || playerId === this.playerId) return;

        if (playerData.position) {
          const pos = playerData.position;
          if (typeof pos.x !== 'number' || typeof pos.y !== 'number' || typeof pos.z !== 'number' ||
              isNaN(pos.x) || isNaN(pos.y) || isNaN(pos.z) ||
              Math.abs(pos.x) > 10000 || Math.abs(pos.y) > 10000 || Math.abs(pos.z) > 10000) {
            console.warn('INVALID POSITION DATA DETECTED, SKIPPING UPDATE:', playerId, pos);
            return;
          }
        }

        if (!this.gameState.players[playerId]) {
          this.gameState.players[playerId] = {
            id: playerId,
            name: playerData.name || 'Unknown',
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 }
          };
        }

        Object.assign(this.gameState.players[playerId], playerData);
      });

      for (const existingId of Object.keys(this.gameState.players)) {
        if (existingId !== this.playerId && !serverPlayerIds.has(existingId)) {
          delete this.gameState.players[existingId];
        }
      }
    }

    if (update.bullets && Array.isArray(update.bullets)) {
      this.gameState.bullets = update.bullets;
    }

    if (update.lastProcessedInput) {
      this.pendingInputs = this.pendingInputs.filter(
        input => input.seq > update.lastProcessedInput
      );
    }
  }

  getLocalPlayer() {
    if (!this.playerId || !this.gameState.players[this.playerId]) {
      return null;
    }

    return this.gameState.players[this.playerId];
  }

  getOtherPlayers() {
    if (!this.playerId) {
      console.warn('getOtherPlayers() called before playerId set');
      return {};
    }

    const others = {};
    Object.keys(this.gameState.players || {}).forEach(id => {
      if (id !== this.playerId && this.gameState.players[id]) {
        others[id] = this.gameState.players[id];
      }
    });

    return others;
  }

  getGameState() {
    return this.gameState;
  }

  getBullets() {
    return this.gameState.bullets || [];
  }

  createInputPacket(input) {
    const packet = {
      seq: this.inputSequence++,
      ...input,
      timestamp: Date.now()
    };
    this.pendingInputs.push(packet);
    
    if (this.pendingInputs.length > 60) {
      this.pendingInputs.shift();
    }
    
    return packet;
  }

  resetToInitialState() {
    console.log('GameStateManager: Resetting to initial state...');

    this.gameState = {
      players: {},
      bullets: [],
      status: 'waiting',
      lastUpdate: Date.now()
    };

    this.pendingInputs = [];
    this.inputSequence = 0;

    this.lastDesyncWarning = 0;
    
    console.log('GameStateManager reset complete');
  }
} 
