import * as THREE from 'three';
import WebSocket from 'ws';
import { Physics } from './Physics.js';
import { GAME_CONFIG } from '../config/GameConfig.js';
import { matchHistoryService } from '../services/MatchHistoryService.js';

const DEBUG_SOCKET_BATCHING = process.env.DEBUG_SOCKET_BATCHING === '1';

export class GameRoom {
  constructor(id, name, hostId, maxPlayers = 2, options = {}) {
    this.id = id;
    this.name = name;
    this.hostId = hostId;
    this.players = [];
    this.maxPlayers = maxPlayers;
    this.db = options.db || null;
    this.status = 'waiting';
    this.createdAt = Date.now();
    this.type = 'free';

    this.cleanupTimer = null;
    this.onRoomEmpty = null;

    this.pendingDisconnect = null;

    this.disconnectedPlayers = new Map();
    this.gracePeriodSeconds = 45;

    this.seriesConfig = options.seriesConfig || null;
    this.seriesScore = {};
    this.seriesRound = 1;
    this.roundTransitioning = false;

    this.gameStartTime = null;
    this.gameStats = {
      totalShots: 0,
      totalHits: 0,
      playerStats: new Map()
    };

    this.gameState = {
      players: {},
      bullets: [],
      destroyedAsteroids: [],
      status: 'waiting'
    };

    this.lastProcessedInput = 0;
    this.lastBulletTime = new Map();
    this.playerHeat = new Map();
    this.playerOverheated = new Map();
    this.activeShooters = new Set();
    this.lastStateString = null;
    this.physicsCache = new Map();
    this.sockets = new Map();

    this.performanceMetrics = {
      frameCount: 0,
      physicsTime: 0,
      updateTime: 0,
      lastPerfReport: Date.now()
    };

    this.playerMap = new Map();

    this.playerReadyStates = new Map();
    this.readyTimeout = null;

    this.playerLoadingStates = new Map();
    this.gamePhase = 'waiting';
    this.loadingTimeout = null;
    this.loadingStartTime = null;

    this.broadcastCounter = 0;
    this.lastBroadcastTime = 0;

    this.replayRequests = new Set();
    const configuredCombatLiveDelayMs = Number(process.env.COMBAT_LIVE_DELAY_MS ?? 1000);
    this.combatLiveDelayMs = Number.isFinite(configuredCombatLiveDelayMs)
      ? Math.max(0, configuredCombatLiveDelayMs)
      : 1000;
    this.combatLiveAt = 0;
    this.combatLiveTimer = null;

    this.physics = new Physics(this);
  }

  addPlayer(player, ws) {
    if (this.players.length < this.maxPlayers && this.status === 'waiting') {

      const existingPlayer = this.players.find(p => p.id === player.id);
      if (existingPlayer) {
        const existingWs = this.sockets.get(player.id);
        const existingConnectionState = existingWs ? existingWs.readyState : 'UNKNOWN';

        if (existingWs && (existingWs.readyState === WebSocket.CLOSED || existingWs.readyState === WebSocket.CLOSING)) {
          this.sockets.set(player.id, ws);
          return true;
        }

        return false;
      }

      const sameNamePlayer = this.players.find(p => p.name.toLowerCase() === player.name.toLowerCase() && p.id !== player.id);
      if (sameNamePlayer) {
        return false;
      }

      this.players.push(player);
      this.sockets.set(player.id, ws);
      this.playerMap.set(player.id, player);

      if (this.seriesConfig && !this.seriesScore[player.id]) {
        this.seriesScore[player.id] = 0;
      }

      const isPlayer1 = this.players.length === 1;
      const spawnConfig = isPlayer1 ? GAME_CONFIG.world.spawn.player1 : GAME_CONFIG.world.spawn.player2;

      this.gameState.players[player.id] = {
        name: player.name,
        position: { x: spawnConfig.x, y: spawnConfig.y, z: spawnConfig.z },
        rotation: { x: 0, y: isPlayer1 ? Math.PI : 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        angularVelocity: { x: 0, y: 0, z: 0 },
        health: 1.0,
        boost: 1.0,
        isBoosting: false,
        inHyperspace: false,
        isPortalTraveling: false,
        isDashing: false,
        crystalWall: null,
        visualTilt: 0,
        lastInputSequence: 0,
        needsSpawn: true,
        spawnSentCount: 0
      };

      this.playerReadyStates.set(player.id, false);

      this.playerLoadingStates.set(player.id, {
        progress: 0,
        status: 'waiting',
        step: 'Waiting for game to start...',
        startTime: null
      });

      return true;
    }
    return false;
  }

  removePlayer(playerId) {

    if (this.status === 'in_game' && this.players.length === 2) {
      const remainingPlayer = this.players.find(p => p.id !== playerId);

      if (this.disconnectedPlayers.size > 0) {

        const firstDisconnect = this.disconnectedPlayers.values().next().value;
        const timeSinceFirst = Date.now() - firstDisconnect.timestamp;
        if (timeSinceFirst < 5000) {

          for (const [, dc] of this.disconnectedPlayers) {
            clearTimeout(dc.graceTimer);
          }
          this.disconnectedPlayers.clear();
          this.endGame(null, 'dual_disconnect');

        }
      } else if (remainingPlayer) {

        const elapsed = Date.now() - (this.gameStartTime || Date.now());
        const dHealth = this.gameState.players[playerId]?.health ?? 1.0;
        const rHealth = this.gameState.players[remainingPlayer.id]?.health ?? 1.0;
        const anyDamage = dHealth < 1.0 || rHealth < 1.0;

        const disconnectContext = { playerId, remainingPlayer, elapsed, dHealth, rHealth, anyDamage };

        const gameStateSnapshot = this.gameState.players[playerId]
          ? JSON.parse(JSON.stringify(this.gameState.players[playerId]))
          : null;

        const playerData = this.playerMap.get(playerId);

        const graceTimer = setTimeout(() => {

          this.disconnectedPlayers.delete(playerId);
          this.resolveDisconnect(disconnectContext);
        }, this.gracePeriodSeconds * 1000);

        this.disconnectedPlayers.set(playerId, {
          timestamp: Date.now(),
          graceTimer,
          context: disconnectContext,
          playerData: playerData ? { ...playerData } : null,
          gameStateSnapshot
        });

        this.broadcast('playerDisconnected', {
          playerId,
          playerName: playerData?.name || playerId,
          gracePeriodSeconds: this.gracePeriodSeconds,
          timestamp: Date.now()
        });

        this.sockets.delete(playerId);
        return 'disconnected_grace';
      }
    }

    this.players = this.players.filter(p => p.id !== playerId);
    this.sockets.delete(playerId);
    this.playerMap.delete(playerId);
    this.playerReadyStates.delete(playerId);

    this.playerLoadingStates.delete(playerId);

    delete this.gameState.players[playerId];

    if (this.readyTimeout) {
      clearTimeout(this.readyTimeout);
      this.readyTimeout = null;
    }

    if (this.gamePhase === 'loading' && this.checkAllPlayersLoaded()) {
      this.startReadyPhase();
    }

    if (this.players.length === 0) {
      this.checkAndScheduleCleanup();
      return 'empty';
    }
    if (this.hostId === playerId && this.players.length > 0) {
      this.hostId = this.players[0].id;
    }
    return 'updated';
  }

  resolveDisconnect({ playerId, remainingPlayer, elapsed, dHealth, rHealth, anyDamage }) {

    if (this.seriesConfig) {

      this.seriesScore[remainingPlayer.id] = 2;

      this.endGame(remainingPlayer.id, 'disconnect');
      return;
    }

    if (elapsed < 15000 && (!anyDamage || dHealth >= 0.85)) {
      this.endGame(null, 'draw');
    } else {

      this.endGame(remainingPlayer.id, 'disconnect');
    }
  }

  reconnectPlayer(newPlayerId, ws) {

    const oldPlayerId = this._getGracePeriodPlayerId(newPlayerId);
    if (!oldPlayerId) return false;

    const dcInfo = this.disconnectedPlayers.get(oldPlayerId);
    if (!dcInfo) return false;

    clearTimeout(dcInfo.graceTimer);
    this.disconnectedPlayers.delete(oldPlayerId);

    const ctx = dcInfo.context;
    if (this.seriesConfig) {
      console.log(`Reconnect DENIED (series forfeit): ${oldPlayerId} disconnected during BO3 — series forfeit`);
      this.resolveDisconnect(ctx);
      return 'forfeit';
    }

    if (ctx && ctx.elapsed >= 15000 && ctx.anyDamage && ctx.dHealth < 0.85) {
      console.log(`Reconnect DENIED (forfeit): ${oldPlayerId} disconnected at ${Math.round(ctx.elapsed/1000)}s with health=${ctx.dHealth.toFixed(2)} — too much damage taken`);
      this.resolveDisconnect(ctx);
      return 'forfeit';
    }

    if (oldPlayerId !== newPlayerId) {

      const playerEntry = this.players.find(p => p.id === oldPlayerId);
      if (playerEntry) playerEntry.id = newPlayerId;

      const playerData = this.playerMap.get(oldPlayerId);
      if (playerData) {
        playerData.id = newPlayerId;
        this.playerMap.delete(oldPlayerId);
        this.playerMap.set(newPlayerId, playerData);
      }

      if (this.gameState.players[oldPlayerId]) {
        this.gameState.players[newPlayerId] = this.gameState.players[oldPlayerId];
        delete this.gameState.players[oldPlayerId];
      }

      if (this.playerLoadingStates.has(oldPlayerId)) {
        this.playerLoadingStates.set(newPlayerId, this.playerLoadingStates.get(oldPlayerId));
        this.playerLoadingStates.delete(oldPlayerId);
      }

      if (this.seriesScore && this.seriesScore[oldPlayerId] !== undefined) {
        this.seriesScore[newPlayerId] = this.seriesScore[oldPlayerId];
        delete this.seriesScore[oldPlayerId];
      }

      if (this.hostId === oldPlayerId) {
        this.hostId = newPlayerId;
      }
    }

    this.sockets.delete(oldPlayerId);
    this.sockets.set(newPlayerId, ws);

    this.broadcast('playerReconnected', {
      playerId: newPlayerId,
      oldPlayerId: oldPlayerId !== newPlayerId ? oldPlayerId : null,
      playerName: dcInfo.playerData?.name || newPlayerId,
      timestamp: Date.now()
    });

    this.resetRoomForNewGame();

    return true;
  }

  claimVictory(claimingPlayerId) {
    if (this.status !== 'in_game') return false;
    if (this.disconnectedPlayers.size === 0) return false;

    const isConnected = this.sockets.has(claimingPlayerId) &&
      this.sockets.get(claimingPlayerId)?.readyState === 1;
    if (!isConnected) return false;

    const [disconnectedId, dcInfo] = this.disconnectedPlayers.entries().next().value;
    clearTimeout(dcInfo.graceTimer);
    this.disconnectedPlayers.delete(disconnectedId);

    this.resolveDisconnect(dcInfo.context);
    return true;
  }

  isPlayerInGracePeriod(playerId) {
    if (this.disconnectedPlayers.has(playerId)) return true;

    const username = this._extractUsername(playerId);
    if (!username) return false;
    for (const [dcId] of this.disconnectedPlayers) {
      if (this._extractUsername(dcId) === username) return true;
    }
    return false;
  }

  _getGracePeriodPlayerId(newPlayerId) {
    if (this.disconnectedPlayers.has(newPlayerId)) return newPlayerId;
    const username = this._extractUsername(newPlayerId);
    if (!username) return null;
    for (const [dcId] of this.disconnectedPlayers) {
      if (this._extractUsername(dcId) === username) return dcId;
    }
    return null;
  }

  _extractUsername(playerId) {
    if (!playerId || typeof playerId !== 'string') return null;
    const match = playerId.match(/^(.*)_\d{10,}_[a-z0-9]+$/i);
    if (match && match[1]) return match[1].toLowerCase();
    const first = playerId.split('_')[0];
    return first ? first.toLowerCase() : null;
  }

  isEmpty() {
    return this.players.length === 0;
  }

  cleanup() {
    this.clearCombatLiveWindow();

    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.readyTimeout) {
      clearTimeout(this.readyTimeout);
      this.readyTimeout = null;
    }

    for (const [, dc] of this.disconnectedPlayers) {
      clearTimeout(dc.graceTimer);
    }
    this.disconnectedPlayers.clear();

    this.players = [];
    this.sockets.clear();
    this.playerMap.clear();
    this.playerReadyStates.clear();

    this.playerLoadingStates.clear();
    this.gamePhase = 'waiting';
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }

    this.gameState = {
      players: {},
      bullets: [],
      destroyedAsteroids: [],
      status: 'waiting'
    };

    this.gameStats = {
      totalShots: 0,
      totalHits: 0,
      playerStats: new Map()
    };

    this.playerHeat.clear();
    this.playerOverheated.clear();
    this.activeShooters.clear();
    this.lastBulletTime.clear();

    if (this.physics) {
      this.physics.reset?.();
      this.physics.resetAsteroids();
    }

    if (this.onRoomEmpty && typeof this.onRoomEmpty === 'function') {
      this.onRoomEmpty(this.id);
    }

  }

  checkAndScheduleCleanup() {
    if (this.players.length === 0 && this.status !== 'cleaning') {
      this.status = 'cleaning';
      this.scheduleCleanup();
    }
  }

  hasPlayer(playerId) {
    return this.players.some(p => p.id === playerId);
  }

  getPlayer(playerId) {
    return this.players.find(p => p.id === playerId) || null;
  }

  createBullet(playerId, bulletData) {
    return this.physics.createBullet(playerId, bulletData);
  }

  updatePhysics(deltaTime = 1 / GAME_CONFIG.server.tickRate) {
    const now = Date.now();
    const frameStart = performance.now();
    this.performanceMetrics.frameCount++;

    this.updateWeaponHeat(deltaTime);

    if (this.physics) {
      const physicsStart = performance.now();
      this.physics.update(deltaTime);
      this.performanceMetrics.physicsTime = performance.now() - physicsStart;
    }

    const frameTime = performance.now() - frameStart;
    if (frameTime > 50) {
      console.warn(`Slow frame detected: ${frameTime.toFixed(1)}ms (target: <16ms)`);
    }

    const bulletCount = this.gameState.bullets.length;
    if (bulletCount > 50) {
      console.warn(`High bullet count: ${bulletCount} (performance may suffer)`);
    }

    if (now - this.performanceMetrics.lastPerfReport > 30000) {
      const avgPhysicsTime = this.performanceMetrics.physicsTime;
      const avgUpdateTime = this.performanceMetrics.updateTime;
      this.performanceMetrics.lastPerfReport = now;
    }
  }

  handlePlayerInput(playerId, input) {
    const player = this.gameState.players[playerId];
    if (!player || !input) return;

    if (input.seq && input.seq <= player.lastInputSequence) {
      return;
    }
    player.lastInputSequence = input.seq || 0;

    if (input.position) {
      const pos = input.position;
      if (!isNaN(pos.x) && !isNaN(pos.y) && !isNaN(pos.z)) {
        player.position.x = pos.x;
        player.position.y = pos.y;
        player.position.z = pos.z;

        if (player.needsSpawn) {
          player.needsSpawn = false;
          player.spawnSentCount = 0;
        }
      }
    }

    if (input.rotation) {
      player.rotation.x = input.rotation.x;
      player.rotation.y = input.rotation.y;
      player.rotation.z = input.rotation.z;
    }

    player.isBoosting = input.boost && player.boost >= GAME_CONFIG.boost.activationThreshold;
  }

  setPortalTravelState(playerId, isEntering) {
    const player = this.gameState.players[playerId];
    if (!player) return false;
    const flag = !!isEntering;
    player.isPortalTraveling = flag;
    player.inHyperspace = flag;
    return true;
  }

  setBeaconState(playerId, position) {
    const player = this.gameState.players[playerId];
    if (!player) return false;
    player.portalBeacon = { position, placedAt: Date.now() };
    return true;
  }

  clearBeaconState(playerId) {
    const player = this.gameState.players[playerId];
    if (!player) return false;
    player.portalBeacon = null;
    return true;
  }

  deployCrystalWall(playerId, position, rotation) {
    const player = this.gameState.players[playerId];
    if (!player) return;

    this.destroyCrystalWall(playerId, 'replaced');

    const wallConfig = GAME_CONFIG.crystalWall || {};
    const wall = {
      id: `wall_${playerId}_${Date.now()}`,
      ownerId: playerId,
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: rotation?.x || 0, y: rotation?.y || 0, z: rotation?.z || 0 },
      health: wallConfig.health || 0.5,
      maxHealth: wallConfig.health || 0.5,
      createdAt: Date.now(),
    };

    player.crystalWall = wall;

    player._wallTimeout = setTimeout(() => {
      if (player.crystalWall && player.crystalWall.id === wall.id) {
        this.destroyCrystalWall(playerId, 'expired');
        this.broadcast('wallExpired', { playerId, wallId: wall.id });
      }
    }, wallConfig.lifetime || 15000);

    this.broadcast('wallDeployed', {
      playerId,
      wall: { ...wall },
    });

  }

  damageCrystalWall(playerId, damage, hitPoint) {
    const player = this.gameState.players[playerId];
    if (!player?.crystalWall) return;

    player.crystalWall.health -= damage;

    this.broadcast('wallDamaged', {
      playerId,
      wallId: player.crystalWall.id,
      health: player.crystalWall.health,
      maxHealth: player.crystalWall.maxHealth,
      hitPoint,
    });

    if (player.crystalWall.health <= 0) {
      const wallId = player.crystalWall.id;
      this.destroyCrystalWall(playerId, 'destroyed');
      this.broadcast('wallDestroyed', { playerId, wallId });
    }
  }

  destroyCrystalWall(playerId, reason) {
    const player = this.gameState.players[playerId];
    if (!player?.crystalWall) return;

    if (player._wallTimeout) {
      clearTimeout(player._wallTimeout);
      player._wallTimeout = null;
    }
    player.crystalWall = null;
  }

  setDashState(playerId, isDashing) {
    const player = this.gameState.players[playerId];
    if (!player) return false;
    player.isDashing = !!isDashing;

    if (player.isDashing) {
      if (player._dashTimeout) clearTimeout(player._dashTimeout);
      player._dashTimeout = setTimeout(() => {
        player.isDashing = false;
        player._dashTimeout = null;
      }, 500);
    } else {
      if (player._dashTimeout) {
        clearTimeout(player._dashTimeout);
        player._dashTimeout = null;
      }
    }
    return true;
  }

  updateWeaponHeat(deltaTime) {

    const coolPlayers = [];

    for (const playerId of this.activeShooters) {
      const currentHeat = this.playerHeat.get(playerId) || 0;
      if (currentHeat <= 0) {
        coolPlayers.push(playerId);
        continue;
      }

      if (!this.playerOverheated.get(playerId)) {
        const newHeat = Math.max(0, currentHeat - (GAME_CONFIG.combat.heatDecayRate * deltaTime));
        this.playerHeat.set(playerId, newHeat);

        if (Math.floor(currentHeat) !== Math.floor(newHeat)) {
          this.broadcast('weaponHeat', {
            playerId: playerId,
            heat: Math.floor(newHeat),
            maxHeat: GAME_CONFIG.combat.overheatThreshold
          });
        }
      }
    }

    coolPlayers.forEach(playerId => {
      this.activeShooters.delete(playerId);
    });
  }

  handleFire(playerId, bulletData) {
    const player = this.gameState.players[playerId];
    if (!player) return null;
    if (this.status !== 'in_game' || this.gamePhase !== 'playing') return null;
    if (this.combatLiveAt && Date.now() < this.combatLiveAt) return null;

    const now = Date.now();
    const lastFire = this.lastBulletTime.get(playerId) || 0;

    if (!this.playerHeat.has(playerId)) {
      this.playerHeat.set(playerId, 0);
      this.playerOverheated.set(playerId, false);
    }

    if (this.playerOverheated.get(playerId)) {
      const overheatStart = this.lastBulletTime.get(playerId) || 0;
      if (now - overheatStart < GAME_CONFIG.combat.overheatCooldown) {
        return null;
      } else {

        this.playerOverheated.set(playerId, false);
        this.playerHeat.set(playerId, 0);
      }
    }

    if (now - lastFire < GAME_CONFIG.combat.weaponCooldown * 1000) {
      return null;
    }

    const currentHeat = this.playerHeat.get(playerId);
    this.playerHeat.set(playerId, currentHeat + 1);
    this.activeShooters.add(playerId);

    if (currentHeat >= GAME_CONFIG.combat.overheatThreshold) {
      this.playerOverheated.set(playerId, true);
      this.lastBulletTime.set(playerId, now + GAME_CONFIG.combat.overheatPenalty);

      this.broadcast('weaponOverheat', {
        playerId: playerId,
        cooldownTime: GAME_CONFIG.combat.overheatCooldown
      });

      return null;
    }

    this.lastBulletTime.set(playerId, now);

    const bullets = this.physics.createBullet(playerId, bulletData);

    if (bullets && bullets.length > 0) {
      bullets.forEach(bullet => {
        this.broadcast('bulletFired', bullet);
      });

      this.broadcast('weaponHeat', {
        playerId: playerId,
        heat: this.playerHeat.get(playerId),
        maxHeat: GAME_CONFIG.combat.overheatThreshold
      });
    }

    return bullets;
  }

  endGame(winnerId, reason = 'normal') {
    if (this.status === 'finished' || this.roundTransitioning) return;

    const isDraw = winnerId === null;
    this.clearCombatLiveWindow();

    if (this.pendingDisconnect) {
      clearTimeout(this.pendingDisconnect.timer);
      this.pendingDisconnect = null;
    }

    for (const [, dc] of this.disconnectedPlayers) {
      clearTimeout(dc.graceTimer);
    }
    this.disconnectedPlayers.clear();

    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.gameEndTime = Date.now();
    this.gameEndReason = reason;

    const winner = isDraw ? null : this.playerMap.get(winnerId);
    const loser = isDraw ? null : this.players.find(p => p.id !== winnerId);

    const inSeries = this.seriesConfig?.type === 'bo3';
    if (inSeries && !isDraw) {

      if (!this.seriesScore[winnerId]) this.seriesScore[winnerId] = 0;
      this.seriesScore[winnerId]++;

      const winnerWins = this.seriesScore[winnerId] || 0;

      if (winnerWins >= 2) {

        this.recordMatchHistory(winnerId, winner, loser).catch(err => {
          console.error('Match recording failed:', err.message);
        });

        this.status = 'finished';

        this._statsSnapshot = {
          totalShots: this.gameStats.totalShots,
          totalHits: this.gameStats.totalHits,
          playerStats: new Map(this.gameStats.playerStats),
          playerHealth: {}
        };
        for (const [pid, pState] of Object.entries(this.gameState.players || {})) {
          this._statsSnapshot.playerHealth[pid] = pState.health;
        }

        const combatStats = {};
        const snap = this._statsSnapshot || {};
        const statsMap = snap.playerStats || this.gameStats?.playerStats || new Map();
        const healthMap = snap.playerHealth || {};
        for (const [pid, s] of statsMap) {
          combatStats[pid] = {
            shots: s.shots || 0,
            hits: s.hits || 0,
            damage: Math.round((s.damage || 0) * 100),
            hp: Math.round((healthMap[pid] ?? this.gameState?.players?.[pid]?.health ?? 0) * 100)
          };
        }
        const duration = this.gameStartTime ? Math.round((Date.now() - this.gameStartTime) / 1000) : 0;

        this.broadcast('seriesEnd', {
          winnerId: winner.id,
          winnerName: winner.name,
          loserId: loser?.id || null,
          loserName: loser?.name || null,
          seriesScore: this.seriesScore,
          roundsPlayed: this.seriesRound,
          combatStats,
          duration
        });

        this.replayRequests.clear();
        this.scheduleCleanup(120000);
        return;
      }

      this.roundTransitioning = true;

      this.broadcast('roundEnd', {
        winnerId: winner.id,
        winnerName: winner.name,
        loserId: loser?.id || null,
        loserName: loser?.name || null,
        round: this.seriesRound,
        seriesScore: this.seriesScore,
        nextRound: this.seriesRound + 1
      });

      this.seriesRound++;

      setTimeout(() => {
        this.roundTransitioning = false;
        if (this.status === 'finished') return;
        this.resetRoomForNewGame();
        this.status = 'in_game';
        this.gamePhase = 'playing';
        const startTime = Date.now();
        this.scheduleCombatLiveWindow(startTime);

        this.players.forEach(player => {
          this.gameStats.playerStats.set(player.id, {
            shots: 0, hits: 0, damage: 0, distance: 0,
            startPosition: this.gameState.players[player.id]?.position || { x: 0, y: 0, z: 0 }
          });
        });

        this.broadcast('seriesNextRound', {
          gameState: this.getState(),
          startTime: this.gameStartTime,
          combatLiveAt: this.combatLiveAt,
          round: this.seriesRound,
          seriesScore: this.seriesScore
        });
      }, 4000);

      return;
    }

    if (inSeries && isDraw) {
      this.roundTransitioning = true;

      this.broadcast('roundDraw', {
        round: this.seriesRound,
        seriesScore: this.seriesScore
      });

      setTimeout(() => {
        this.roundTransitioning = false;
        if (this.status === 'finished') return;
        this.resetRoomForNewGame();
        this.status = 'in_game';
        this.gamePhase = 'playing';
        const startTime = Date.now();
        this.scheduleCombatLiveWindow(startTime);

        this.players.forEach(player => {
          this.gameStats.playerStats.set(player.id, {
            shots: 0, hits: 0, damage: 0, distance: 0,
            startPosition: this.gameState.players[player.id]?.position || { x: 0, y: 0, z: 0 }
          });
        });

        this.broadcast('seriesNextRound', {
          gameState: this.getState(),
          startTime: this.gameStartTime,
          combatLiveAt: this.combatLiveAt,
          round: this.seriesRound,
          seriesScore: this.seriesScore
        });
      }, 3000);

      return;
    }

    this.recordMatchHistory(winnerId, winner, loser).catch(err => {
      console.error('Match recording failed:', err.message);
    });

    this.status = 'finished';

    this._statsSnapshot = {
      totalShots: this.gameStats.totalShots,
      totalHits: this.gameStats.totalHits,
      playerStats: new Map(this.gameStats.playerStats),
      playerHealth: {}
    };
    for (const [pid, pState] of Object.entries(this.gameState.players || {})) {
      this._statsSnapshot.playerHealth[pid] = pState.health;
    }

    const combatStats = {};
    const snap = this._statsSnapshot || {};
    const statsMap = snap.playerStats || this.gameStats?.playerStats || new Map();
    const healthMap = snap.playerHealth || {};
    for (const [pid, s] of statsMap) {
      combatStats[pid] = {
        shots: s.shots || 0,
        hits: s.hits || 0,
        damage: Math.round((s.damage || 0) * 100),
        hp: Math.round((healthMap[pid] ?? this.gameState?.players?.[pid]?.health ?? 0) * 100)
      };
    }
    const duration = this.gameStartTime ? Math.round((Date.now() - this.gameStartTime) / 1000) : 0;

    this.broadcast('gameEnd', {
      winnerId: winner ? winner.id : null,
      winnerName: winner ? winner.name : null,
      loserId: loser ? loser.id : null,
      loserName: loser ? loser.name : null,
      reason,
      isDraw,
      combatStats,
      duration
    });

    this.replayRequests.clear();

    this.scheduleCleanup(120000);
  }

  scheduleCleanup(delayMs = 30000) {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
    }

    this.cleanupTimer = setTimeout(() => {

      if (this.messageRouter) {
        this.messageRouter.deleteRoom(this.id);
      } else {

        this.cleanup();
      }
    }, delayMs);
  }

  async recordMatchHistory(winnerId, winner, loser) {
    try {
      const now = Date.now();
      const gameDuration = this.gameStartTime ? now - this.gameStartTime : 0;

      const accuracy = this.gameStats.totalShots > 0 ?
        (this.gameStats.totalHits / this.gameStats.totalShots) * 100 : 0;

      const playerData = this.players.map(player => {
        const stats = this.gameStats.playerStats.get(player.id);
        return {
          id: player.id,
          name: player.name,
          stats: stats || { shots: 0, hits: 0, damage: 0, distance: 0 }
        };
      });

      const killTime = gameDuration > 0 ? gameDuration / 1000 : null;

      const inSeries = this.seriesConfig?.type === 'bo3';
      const effectiveMatchType = inSeries
        ? 'bo3'
        : (this.type || 'duel');

      const matchData = {
        type: effectiveMatchType,
        duration: gameDuration,
        players: playerData,
        winner: winnerId,
        loser: loser?.id || null,

        stats: {
          shotsTotal: this.gameStats.totalShots,
          shotsHit: this.gameStats.totalHits,
          accuracy: accuracy,
          damageDealt: Array.from(this.gameStats.playerStats.values())
            .reduce((sum, stats) => sum + stats.damage, 0),
          distanceTraveled: Array.from(this.gameStats.playerStats.values())
            .reduce((sum, stats) => sum + stats.distance, 0),
          killTime: killTime
        },

        serverVersion: '1.0.0',
        region: 'local',
        ping: 0
      };

      const matchId = matchHistoryService.recordMatch(matchData);

      this.winner = winnerId;

      const isDraw = winnerId === null;

      if (this.db) {
        try {

          const allPlayers = this.players.length > 0 ? this.players : playerData;
          const playerUsernames = allPlayers.map(p => this._extractUsername(p.id) ?? p.name?.toLowerCase());

          const dbRows = await Promise.all(
            playerUsernames.map(u => u ? this.db.pool.query('SELECT id FROM users WHERE LOWER(username) = $1', [u]) : { rows: [] })
          );
          const dbIds = dbRows.map(r => r.rows[0]?.id || null);

          if (isDraw) {

            if (dbIds[0] && dbIds[1]) {
              await this.db.createMatch({
                player1_id: dbIds[0],
                player2_id: dbIds[1],
                winner_id: null,
                match_type: effectiveMatchType,
                duration: Math.round(gameDuration / 1000)
              });
            }
          } else {

            const winnerDbId = dbIds[allPlayers.findIndex(p => p.id === winnerId)];
            const loserDbId = dbIds[allPlayers.findIndex(p => p.id === loser?.id)];

            if (winnerDbId && loserDbId) {
              const player1Id = this.players[0]?.id;
              const p1DbId = player1Id === winnerId ? winnerDbId : loserDbId;
              const p2DbId = player1Id === winnerId ? loserDbId : winnerDbId;

              await this.db.createMatch({
                player1_id: p1DbId,
                player2_id: p2DbId,
                winner_id: winnerDbId,
                match_type: effectiveMatchType,
                duration: Math.round(gameDuration / 1000)
              });

              const winnerStats = await this.db.pool.query('SELECT wins, current_win_streak FROM users WHERE id = $1', [winnerDbId]);
              const loserStats = await this.db.pool.query('SELECT losses FROM users WHERE id = $1', [loserDbId]);

              await this.db.updateUserStats(winnerDbId, {
                wins: (winnerStats.rows[0]?.wins || 0) + 1,
                losses: null,
                currentWinStreak: (winnerStats.rows[0]?.current_win_streak || 0) + 1
              });

              await this.db.updateUserStats(loserDbId, {
                wins: null,
                losses: (loserStats.rows[0]?.losses || 0) + 1,
                currentWinStreak: 0
              });

            } else {
              console.warn(`Could not resolve DB IDs: winner=${winnerId}(${winnerDbId}), loser=${loser?.id}(${loserDbId})`);
            }
          }
        } catch (dbError) {
          console.error('Failed to persist match to database:', dbError);

        }
      }

    } catch (error) {
      console.error('Failed to record match history:', error);
    }
  }

  toJSON() {

    const frontendPlayers = this.players.map(player => {

      return {

        id: player.id,
        name: player.name,
        ready: player.ready,

        customization: {
          avatar: player.avatar,
          avatarType: player.avatar_type ||
            (player.avatar === 'custom' || player.custom_avatar ? 'custom' : 'preset'),

          customAvatar: player.custom_avatar,
          customBanner: player.custom_banner || player.personal_banner,
          bio: player.bio,
          status: player.status_message,
          theme: player.theme || 'cosmic'
        }
      };
    });

    return {
      id: this.id,
      name: this.name,
      hostId: this.hostId,
      players: frontendPlayers,
      maxPlayers: this.maxPlayers,
      status: this.status,
      gamePhase: this.gamePhase,
      createdAt: this.createdAt,
      type: this.type,
      seriesConfig: this.seriesConfig || null,
      seriesScore: this.seriesConfig ? this.seriesScore : undefined,
      seriesRound: this.seriesConfig ? this.seriesRound : undefined
    };
  }

  broadcastAsteroidDestroyed(asteroidIndex, hitPoint) {
    this.gameState.destroyedAsteroids.push(asteroidIndex);
    this.broadcast('asteroidDestroyed', { asteroidIndex, hitPoint });
  }

  broadcast(type, payload) {
    const message = JSON.stringify({
      type,
      payload,
      timestamp: Date.now()
    });

    this.players.forEach(player => {
      const ws = this.sockets.get(player.id);
      if (ws && ws.readyState === 1) {
        ws.send(message);
      }
    });
  }

  broadcastState() {
    const now = Date.now();

    if (this.players.length === 0) return;

    const lastBroadcast = this.lastActualBroadcast ?? now;
    this.lastActualBroadcast = now;

    const REGEN_DELAY_MS = 5000;
    const REGEN_PER_SECOND = 0.08;

    Object.values(this.gameState.players).forEach((pState) => {
      if (pState.health >= 1.0 || pState.health <= 0) return;
      const regenStartsAt = (pState.lastDamagedAt || 0) + REGEN_DELAY_MS;
      const regenSeconds = Math.max(0, now - Math.max(lastBroadcast, regenStartsAt)) / 1000;
      pState.health = Math.min(1.0, pState.health + REGEN_PER_SECOND * regenSeconds);
    });

    this.players.forEach((player) => {
      const socket = this.sockets.get(player.id);
      if (!socket) return;

      if (this.gameState.players[player.id]?.needsSpawn && this.gameState.players[player.id]?.spawnSentCount !== undefined) {
        this.gameState.players[player.id].spawnSentCount++;
      }

      const update = {
        seq: now,
        serverTime: now,
        yourState: {

          ...(this.gameState.players[player.id]?.needsSpawn || this.gameState.players[player.id]?.spawnSentCount < 5 ? {
            position: this.gameState.players[player.id]?.position,
            rotation: this.gameState.players[player.id]?.rotation,
            isSpawn: true
          } : {}),
          health: this.gameState.players[player.id]?.health,
          boost: this.gameState.players[player.id]?.boost,
          score: this.gameState.players[player.id]?.score
        },
        others: {},
        bullets: this.gameState.bullets,
        lastProcessedInput: this.gameState.players[player.id]?.lastProcessedInput || 0
      };

      Object.entries(this.gameState.players).forEach(([id, state]) => {
        if (id !== player.id) {
          update.others[id] = {
            id: id,
            name: state.name || 'Unknown',
            position: {
              x: Math.round(state.position.x * 100) / 100,
              y: Math.round(state.position.y * 100) / 100,
              z: Math.round(state.position.z * 100) / 100
            },
            rotation: {
              x: Math.round(state.rotation.x * 100) / 100,
              y: Math.round(state.rotation.y * 100) / 100,
              z: Math.round(state.rotation.z * 100) / 100
            },
            health: Math.round(state.health * 100) / 100,
            isDashing: state.isDashing || false,
            crystalWall: state.crystalWall || null,

          };
        }
      });

      const message = JSON.stringify({
        type: 'stateUpdate',
        payload: update,
        timestamp: now
      });

      if (!this.lastSocketSendTime) this.lastSocketSendTime = {};
      if (!this.socketSendCount) this.socketSendCount = {};

      const playerId = player.id;
      const lastSend = this.lastSocketSendTime[playerId] || 0;
      const sendInterval = now - lastSend;
      this.socketSendCount[playerId] = (this.socketSendCount[playerId] || 0) + 1;

      if (DEBUG_SOCKET_BATCHING && sendInterval > 40 && sendInterval < 60 && this.socketSendCount[playerId] > 5) {
        console.warn(`SUSPICIOUS SEND PATTERN: Player ${playerId}, interval: ${sendInterval.toFixed(1)}ms (expected: ~16.67ms)`);
      }

      const socketSendStart = performance.now();
      socket.send(message);
      const socketSendDuration = performance.now() - socketSendStart;

      this.lastSocketSendTime[playerId] = now;

      if (socket._lastSendTime) {
        const socketInterval = now - socket._lastSendTime;
        socket._sendCount = (socket._sendCount || 0) + 1;

        if (DEBUG_SOCKET_BATCHING && socketInterval > 45 && socketInterval < 55 && socket._sendCount > 5) {
          console.warn(`SOCKET-LEVEL BATCHING: Player ${playerId}, interval: ${socketInterval.toFixed(1)}ms, send duration: ${socketSendDuration.toFixed(2)}ms`);
        }
      }
      socket._lastSendTime = now;
    });
  }

  setPlayerReady(playerId) {
    if (this.status === 'in_game') {
      return false;
    }

    if (!this.playerReadyStates.has(playerId)) {
      console.log(`Player ${playerId} not in room, cannot set ready`);
      return false;
    }

    if (this.playerReadyStates.get(playerId) === true) {
      return false;
    }

    const player = this.getPlayer(playerId);
    if (player) {
      player.ready = true;
    }
    this.playerReadyStates.set(playerId, true);

    if (this.gamePhase === 'ready' && this.checkAllPlayersReady()) {
      this.startGameWithReadyPlayers();
    }

    return true;
  }

  checkAllPlayersReady() {

    if (this.players.length < this.maxPlayers) {
      return false;
    }

    for (const player of this.players) {
      if (!this.playerReadyStates.get(player.id)) {
        return false;
      }
    }

    return true;
  }

  checkAllPlayersLoaded() {

    if (this.players.length < this.maxPlayers) {
      return false;
    }

    for (const player of this.players) {
      const loadingState = this.playerLoadingStates.get(player.id);
      if (!loadingState || loadingState.status !== 'complete') {
        return false;
      }
    }

    return true;
  }

  updatePlayerLoadingProgress(playerId, progress, step) {
    if (this.status === 'in_game' || this.gamePhase !== 'loading') {
      return false;
    }

    if (!this.playerLoadingStates.has(playerId)) {
      console.warn(`Cannot update loading progress for unknown player ${playerId}`);
      return false;
    }

    const currentState = this.playerLoadingStates.get(playerId);
    const updatedState = {
      ...currentState,
      progress: Math.min(Math.max(progress, 0), 100),
      step: step || currentState.step,
      lastUpdate: Date.now()
    };

    if (updatedState.progress >= 100) {
      updatedState.status = 'complete';
    } else if (currentState.status === 'waiting') {
      updatedState.status = 'loading';
      updatedState.startTime = Date.now();
    }

    this.playerLoadingStates.set(playerId, updatedState);

    this.broadcast('loading_progress_update', {
      playerId: playerId,
      progress: updatedState.progress,
      step: updatedState.step,
      loadingStates: Array.from(this.playerLoadingStates.entries()).map(([id, state]) => ({
        playerId: id,
        playerName: this.playerMap.get(id)?.name || 'Unknown',
        progress: state.progress,
        step: state.step,
        status: state.status
      }))
    });

    if (this.checkAllPlayersLoaded()) {
      this.startReadyPhase();
    }

    return true;
  }

  startReadyPhase() {
    if (this.status === 'in_game') {
      return;
    }

    if (this.gamePhase !== 'loading') {
      console.warn(`Cannot start ready phase from gamePhase: ${this.gamePhase}`);
      return;
    }

    if (!this.checkAllPlayersLoaded()) {
      console.warn('startReadyPhase blocked: not all players are fully loaded');
      return;
    }

    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }

    this.gamePhase = 'ready';

    this.broadcast('all_players_loaded', {
      totalLoadingTime: this.loadingStartTime ? Date.now() - this.loadingStartTime : 0,
      loadingStates: Array.from(this.playerLoadingStates.entries()).map(([id, state]) => ({
        playerId: id,
        playerName: this.playerMap.get(id)?.name || 'Unknown',
        loadingTime: state.startTime ? Date.now() - state.startTime : 0,
        status: state.status
      }))
    });

    this.broadcast('waiting_for_ready', {
      playersReady: Array.from(this.playerReadyStates.entries())
    });

    if (this.readyTimeout) {
      clearTimeout(this.readyTimeout);
      this.readyTimeout = null;
    }
  }

  handleLoadingTimeout() {
    if (this.status === 'in_game') {
      return;
    }

    console.warn('Loading timeout reached! Some players failed to load in time');

    const slowPlayers = [];
    for (const player of this.players) {
      const loadingState = this.playerLoadingStates.get(player.id);
      if (loadingState && loadingState.status !== 'complete') {
        slowPlayers.push({
          playerId: player.id,
          playerName: player.name,
          progress: loadingState.progress,
          step: loadingState.step
        });
      }
    }

    slowPlayers.forEach(({ playerId }) => {
      const currentState = this.playerLoadingStates.get(playerId);
      this.playerLoadingStates.set(playerId, {
        ...currentState,
        status: 'timed_out',
        progress: Math.min(currentState?.progress || 0, 99),
        step: 'Loading timed out - waiting for client to recover'
      });
    });

    this.broadcast('loading_timeout', {
      timeoutPlayers: slowPlayers,
      message: 'Some players are still loading. Match will not enter ready-up until all players report complete.'
    });

    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
    }
    this.loadingTimeout = setTimeout(() => {
      this.handleLoadingTimeout();
    }, 30000);
  }

  startGameWithReadyPlayers() {
    if (this.status === 'in_game') {
      return;
    }

    if (this.readyTimeout) {
      clearTimeout(this.readyTimeout);
      this.readyTimeout = null;
    }

    this.status = 'in_game';
    this.gamePhase = 'playing';
    const startTime = Date.now();
    this.scheduleCombatLiveWindow(startTime);

    this.players.forEach(player => {
      this.gameStats.playerStats.set(player.id, {
        shots: 0, hits: 0, damage: 0, distance: 0,
        startPosition: this.gameState.players[player.id]?.position || { x: 0, y: 0, z: 0 }
      });
    });

    this.broadcast('game_started', {
      gameState: this.getState(),
      startTime: this.gameStartTime,
      combatLiveAt: this.combatLiveAt
    });

  }

  getState() {
    return {
      players: this.gameState.players,
      bullets: this.gameState.bullets,
      destroyedAsteroids: this.gameState.destroyedAsteroids || [],
      status: this.status
    };
  }

  handleReplayRequest(playerId) {
    if (this.status !== 'finished' && this.status !== 'waiting') return;

    this.replayRequests.add(playerId);

    const playerName = this.gameState.players[playerId]?.name || playerId;
    this.players.forEach(player => {
      if (player.id === playerId) return;
      const ws = this.sockets.get(player.id);
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({
          type: 'opponentWantsReplay',
          payload: { playerId, playerName },
          timestamp: Date.now()
        }));
      }
    });

    if (this.replayRequests.size >= this.players.length) {

      this.resetRoomForNewGame();

      this.status = 'in_game';
      this.gamePhase = 'playing';
      const replayStartTime = Date.now();
      this.scheduleCombatLiveWindow(replayStartTime);

      this.players.forEach(player => {
        this.gameStats.playerStats.set(player.id, {
          shots: 0, hits: 0, damage: 0, distance: 0,
          startPosition: this.gameState.players[player.id]?.position || { x: 0, y: 0, z: 0 }
        });
      });

      this.broadcast('replayGameStarted', {
        gameState: this.getState(),
        startTime: this.gameStartTime,
        combatLiveAt: this.combatLiveAt
      });
    }
  }

  resetRoomForNewGame() {
    this.clearCombatLiveWindow();

    for (const playerId in this.gameState.players) {
      this.destroyCrystalWall(playerId, 'reset');
    }

    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.replayRequests.clear();
    this.roundTransitioning = false;

    this.status = 'waiting';
    this.gameStartTime = null;
    this.winner = null;

    const preservedPlayers = {};
    Object.keys(this.gameState.players).forEach(playerId => {
      if (this.playerMap.has(playerId)) {
        const player = this.playerMap.get(playerId);
        const isPlayer1 = this.players.findIndex(p => p.id === playerId) === 0;
        const spawnConfig = isPlayer1 ? GAME_CONFIG.world.spawn.player1 : GAME_CONFIG.world.spawn.player2;

        preservedPlayers[playerId] = {
          name: player.name,
          position: { x: spawnConfig.x, y: spawnConfig.y, z: spawnConfig.z },
          rotation: { x: 0, y: isPlayer1 ? Math.PI : 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          angularVelocity: { x: 0, y: 0, z: 0 },
          health: 1.0,
          boost: 1.0,
          isBoosting: false,
          visualTilt: 0,
          lastInputSequence: 0,
          needsSpawn: true,
          spawnSentCount: 0
        };
      }
    });

    this.gameState = {
      players: preservedPlayers,
      bullets: [],
      destroyedAsteroids: [],
      status: 'waiting'
    };

    if (this.physics) {
      this.physics.resetAsteroids();
    }

    this.playerHeat.clear();
    this.playerOverheated.clear();
    this.activeShooters.clear();
    this.lastBulletTime.clear();

    this.playerReadyStates.clear();
    this.players.forEach(player => {
      this.playerReadyStates.set(player.id, false);
    });

    this.playerLoadingStates.clear();
    this.gamePhase = 'waiting';
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }
    this.players.forEach(player => {
      this.playerLoadingStates.set(player.id, {
        progress: 0,
        status: 'waiting',
        step: 'Waiting for next game...',
        startTime: null
      });
    });

    if (this.physics) {
      this.physics.reset?.();
    }

    this.gameStats = {
      totalShots: 0,
      totalHits: 0,
      playerStats: new Map()
    };

    this.players.forEach(player => {
      this.gameStats.playerStats.set(player.id, {
        shots: 0,
        hits: 0,
        damage: 0,
        distance: 0,
        startPosition: preservedPlayers[player.id]?.position || { x: 0, y: 0, z: 0 }
      });
    });

  }

  clearCombatLiveWindow() {
    if (this.combatLiveTimer) {
      clearTimeout(this.combatLiveTimer);
      this.combatLiveTimer = null;
    }
    this.combatLiveAt = 0;
  }

  scheduleCombatLiveWindow(startTime) {
    this.clearCombatLiveWindow();

    this.gameStartTime = startTime;
    this.combatLiveAt = startTime + this.combatLiveDelayMs;

    if (this.combatLiveDelayMs === 0) {
      this.broadcast('combat_live', {
        startTime: this.gameStartTime,
        combatLiveAt: this.combatLiveAt
      });
      return;
    }

    this.combatLiveTimer = setTimeout(() => {
      this.combatLiveTimer = null;
      if (this.status !== 'in_game' || this.gameStartTime !== startTime) {
        return;
      }

      this.broadcast('combat_live', {
        startTime: this.gameStartTime,
        combatLiveAt: this.combatLiveAt
      });
    }, this.combatLiveDelayMs);
  }
} 
