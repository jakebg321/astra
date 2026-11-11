export class TestModeSimulator {
  constructor(gameStateManager, eventEmitter) {
    this.gameStateManager = gameStateManager;
    this.eventEmitter = eventEmitter;
    this.enabled = false;
  }

  enable(playerName) {
    this.enabled = true;
    const playerId = `${playerName}_test_${Date.now()}`;
    
    this.gameStateManager.setPlayerId(playerId, playerName);

    this.gameStateManager.gameState = {
      players: {
        [playerId]: {
          id: playerId,
          name: playerName,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          health: 1.0,
          boost: 1.0
        },
        'debug_bot': {
          id: 'debug_bot',
          name: 'DEBUG TARGET',
          position: { x: 0, y: 0, z: -8 },
          rotation: { x: 0, y: Math.PI, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          health: 1.0,
          boost: 1.0,
          isTarget: true
        }
      },
      bullets: [],
      status: 'playing'
    };
    
    this.eventEmitter.emit('connected');
    this.eventEmitter.emit('gameStart', this.gameStateManager.getGameState());
  }

  createBullet(position, velocity) {
    if (!this.enabled) return null;
    
    const bulletId = `test_bullet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const bullet = {
      id: bulletId,
      owner: this.gameStateManager.playerId,
      position: { ...position },
      velocity: { ...velocity },
      created: Date.now()
    };
    
    this.gameStateManager.gameState.bullets.push(bullet);
    this.eventEmitter.emit('bulletFired', bullet);

    setTimeout(() => {
      this.gameStateManager.gameState.bullets = 
        this.gameStateManager.gameState.bullets.filter(b => b.id !== bulletId);
    }, 3000);
    
    return bullet;
  }

  updateBullets(deltaTime) {
    if (!this.enabled) return;
    
    const now = Date.now();
    
    this.gameStateManager.gameState.bullets = this.gameStateManager.gameState.bullets.filter(bullet => {
      if (now - bullet.created > 3000) return false;

      bullet.position.x += bullet.velocity.x * deltaTime;
      bullet.position.y += bullet.velocity.y * deltaTime;
      bullet.position.z += bullet.velocity.z * deltaTime;

      this.checkBulletHit(bullet);
      
      return true;
    });
  }

  checkBulletHit(bullet) {
    const others = this.gameStateManager.getOtherPlayers();
    
    Object.entries(others).forEach(([targetId, target]) => {
      if (!target.position) return;
      
      const distance = Math.sqrt(
        Math.pow(bullet.position.x - target.position.x, 2) +
        Math.pow(bullet.position.y - target.position.y, 2) +
        Math.pow(bullet.position.z - target.position.z, 2)
      );
      
      if (distance < 8) {
        const damage = 0.1;
        target.health = Math.max(0, target.health - damage);
        
        this.eventEmitter.emit('playerHit', {
          targetId: targetId,
          damage: damage,
          newHealth: target.health,
          position: target.position
        });

        const index = this.gameStateManager.gameState.bullets.indexOf(bullet);
        if (index !== -1) {
          this.gameStateManager.gameState.bullets.splice(index, 1);
        }
      }
    });
  }
} 