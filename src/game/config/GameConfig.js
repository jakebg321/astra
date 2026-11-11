export const GAME_CONFIG = {
  physics: {
    forwardSpeed: 105,
    turnSpeed: 5.04,
    dampening: 0.98,             
    angularDampening: 0.95,      
    normalMaxSpeed: 75.6,
    boostMaxSpeed: 147,
    boostForce: 2940,
    forwardMultiplier: 1,
    lateralMultiplier: 1.05,
    verticalMultiplier: 0.63,
    backwardMultiplier: 0.42,
    velocityDampening: 0.99,
    maxSpeed: 75.6,
    turnSpeedMultiplier: 1.05,

    brakeMultiplier: 0.88,
    brakePower: 0.95
  },
  
  combat: {
    bulletSpeed: 2940,
    bulletLifetime: 12,
    weaponCooldown: 0.027,
    weaponSpread: 0.25,
    damagePerHit: 0.1,
    damageFalloff: {
      startRange: 200,
      endRange: 800,
      minMultiplier: 0.51
    },
    soundPitchVar: 0.25,
    maxHealth: 6.0,
    maxAmmo: 100,
    reloadTime: 2000,
    hitRadius: 14.0,
    wingOffset: 0.75,
    wingForwardOffset: 0.02,
    centerPlanetCollisionRadius: 140,
    crosshairDistance: 85,
    crosshairScale: 1.0,
    crosshairOpacity: 0.8,
    crosshairColor: '#00ffff',
    crosshairAccent: '#ff0000',

    overheatThreshold: 15,
    overheatCooldown: 3000,
    heatDecayRate: 2.0,
    overheatPenalty: 1000,
    
    showBulletTrails: true,
    bulletGlowIntensity: 0.8
  },
  
  input: {
    mouseSensitivity: 0.002,
    mouseDeadzone: 0,
    rollSensitivity: 1.0,
    mouseRollAssist: 0,
    mouseThrottle: 8
  },
  
  network: {
    inputThrottle: 100,
    inputSendRate: 10,
    positionTolerance: 12.0,
    reconciliationLerp: 0.3,
    correctionThreshold: 20
  },
  
  visuals: {
    shipTiltMax: 50,
    shipTiltSpeed: 10,
    hitMarkerDistance: 100,
    radarRadius: 50,
    radarScale: 0.2
  },
  
  boost: {
    fillRate: 15,
    drainRate: 12,
    activationThreshold: 0.1
  },
  
  ui: {
    healthBarWidth: 690,
    messageTimeout: 2000,
    maxNameLength: 5,
    maxRoomIdLength: 13
  },
  
  multiplayer: {
    maxPlayersPerRoom: 2,
    syncRate: 60,
    inputSendRate: 20
  },

  world: {
    size: { x: 2025, y: 540, z: 2025 },
    boundary: {
      type: 'box',
      pushbackDistance: 150,
      pushbackForce: 0.5,
      damageOnContact: false,
      damagePerSecond: 0.1,
      warningDistance: 300,
      visual: {
        color: '#00ffff',
        opacity: 0.15,
        pulseSpeed: 0.5,
        showWireframe: true
      }
    },
    spawn: {
      player1: { x: -600, y: 50, z: -600 },
      player2: { x: 600, y: 50, z: 600 },
      respawnHeight: 50,
      safeZoneRadius: 450
    }
  },

  environment: {
    asteroids: {
      hitRadiusMultiplier: 1.0,
      data: [
        { pos: [220, 80, -180], scale: 8, rotY: 0.3 },
        { pos: [-230, -60, 200], scale: 6, rotY: 1.7 },
        { pos: [300, 100, 280], scale: 10, rotY: 0.8 },
        { pos: [-280, -90, -310], scale: 7, rotY: 2.1 },
        { pos: [310, -70, -260], scale: 5, rotY: 4.2 },
        { pos: [420, 120, 380], scale: 12, rotY: 1.2 },
        { pos: [-460, -80, 400], scale: 9, rotY: 3.5 },
        { pos: [480, 50, -430], scale: 11, rotY: 5.1 },
        { pos: [-400, -130, -470], scale: 8, rotY: 0.6 },
        { pos: [450, 140, -380], scale: 6, rotY: 2.8 },
        { pos: [590, -100, 570], scale: 10, rotY: 1.9 },
        { pos: [-610, 90, -580], scale: 8, rotY: 4.4 },
        { pos: [780, 60, 750], scale: 14, rotY: 0.4 },
        { pos: [-800, -110, 700], scale: 11, rotY: 2.6 },
        { pos: [850, 130, -760], scale: 13, rotY: 3.8 },
        { pos: [-750, -50, -820], scale: 9, rotY: 5.5 },
        { pos: [700, 100, -850], scale: 7, rotY: 1.1 },
        { pos: [-880, 70, 600], scale: 10, rotY: 4.0 },
      ]
    },

    skybox: {
      enabled: true,
      paths: [
        '/skybox/px.png',
        '/skybox/nx.png', 
        '/skybox/py.png',
        '/skybox/ny.png',
        '/skybox/pz.png',
        '/skybox/nz.png'
      ]
    },
    
    grid: {
      enabled: true,
      size: 200,
      divisions: 20,
      color: '#004466',
      centerColor: '#002233',
      position: { x: 0, y: -30, z: 0 }
    }
  },

  lod: {
    enabled: false,
    updateInterval: 16,
    
    asteroids: {
      high: {
        distance: 300,
        segments: 2
      },
      medium: {
        distance: 800,
        segments: 1
      },
      low: {
        distance: 2000,
        segments: 0
      },
      culling: {
        distance: 3000,
        enabled: false
      }
    },
    
    ships: {
      high: {
        distance: 400,
        showDetails: true,
      },
      medium: {
        distance: 1000,
        showDetails: false
      },
      low: {
        distance: 2000,
        useSimpleGeometry: false
      }
    },
    
    effects: {
      particles: {
        maxDistance: 1000,
        reduceCountDistance: 500,
        minParticleCount: 10
      },
      trails: {
        maxDistance: 1500,
        fadeStartDistance: 1000
      }
    }
  },

  performance: {
    maxParticles: 500,
    maxBullets: 200,
    shadowsEnabled: true,
    shadowMapSize: 2048,
    antialias: true,
    pixelRatio: 1.5,

    optimizations: {
      masterRenderLoop: false,
      objectPooling: false,
      simplifiedCamera: false,
      componentCleanup: true,
      memoryOptimization: false,
      instantRollback: true
    }
  },
  
  flight: {

    stallSpeed: 15,
    maxGForce: 9,
    turnBleedSpeed: 0.1,

    autoRoll: true,
    coordinatedTurns: true,
    dampedControls: true,
  },

  server: {
    tickRate: 20,
    broadcastRate: 30
  },
  
  crystalWall: {
    health: 0.5,
    cooldown: 8000,
    lifetime: 15000,
    deployDistance: 200,
    behindDistance: 80,
    width: 40,
    height: 30,
    depth: 4,
    minDistance: 50,
    maxDistance: 500,
    damageBoost: 0.3,
  },

  game: {
    maxPlayers: 2,
    warmupTime: 5,
    roundTime: 300,
    respawnTime: 3,
    respawnInvulnerability: 3,
    minPlayers: 2,
    killScore: 100
  }
};
