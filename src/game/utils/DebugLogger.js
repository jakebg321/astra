

export class DebugLogger {
  constructor() {
    this.enabled = process.env.NODE_ENV === 'development' || 
                   (typeof window !== 'undefined' && window.DEBUG_MODE);
    this.timers = new Map();
    this.counters = new Map();
    this.sessions = new Map();

    this.colors = {
      network: '#4CAF50',
      physics: '#2196F3',
      error: '#F44336',
      performance: '#9C27B0',
      planet: '#795548'
    };
  }

  logNetwork(event, data = {}) {
    if (!this.enabled) return;
    
    console.log(
      `%cNETWORK [${event}]`,
      `color: ${this.colors.network}; font-weight: bold;`,
      data
    );
  }

  logPhysics(event, data = {}) {
    if (!this.enabled) return;
    
    console.log(
      `%cPHYSICS [${event}]`,
      `color: ${this.colors.physics}; font-weight: bold;`,
      data
    );
  }

  logPlanet(event, data = {}) {
    if (!this.enabled) return;
    
    console.log(
      `%cPLANET [${event}]`,
      `color: ${this.colors.planet}; font-weight: bold;`,
      data
    );
  }

  startTimer(label) {
    if (!this.enabled) return;
    this.timers.set(label, performance.now());
  }

  endTimer(label) {
    if (!this.enabled) return;
    
    const startTime = this.timers.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.timers.delete(label);
      return duration;
    }
  }

  count(label) {
    if (!this.enabled) return;
    
    const current = this.counters.get(label) || 0;
    this.counters.set(label, current + 1);
  }

  logError(error, context = {}) {
    console.error(
      `%cERROR`,
      `color: ${this.colors.error}; font-weight: bold;`,
      error,
      context
    );

    if (!this.sessions.has('errors')) {
      this.sessions.set('errors', []);
    }
    
    this.sessions.get('errors').push({
      timestamp: Date.now(),
      error: error.toString(),
      stack: error.stack,
      context
    });
  }

  getSessionData() {
    return {
      counters: Object.fromEntries(this.counters),
      sessions: Object.fromEntries(this.sessions),
      activeTimers: Array.from(this.timers.keys())
    };
  }

  clearSession() {
    this.counters.clear();
    this.sessions.clear();
    this.timers.clear();
    console.log('Debug session data cleared');
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      sessionData: this.getSessionData(),
      browserInfo: typeof navigator !== 'undefined' ? {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      } : 'Server environment',
      performance: typeof performance !== 'undefined' && performance.memory ? {
        memory: {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        }
      } : 'Not available'
    };
    
    console.log('Debug Report Generated:', report);
    return report;
  }

  logGameState(gameState, label = 'GAME_STATE') {
    if (!this.enabled) return;
    
    const snapshot = {
      timestamp: Date.now(),
      playerCount: Object.keys(gameState.players || {}).length,
      bulletCount: (gameState.bullets || []).length,
      gameStatus: gameState.status || 'unknown',
      room: gameState.room || 'none'
    };
    
    console.log(
      `%c${label}`,
      'color: #607D8B; font-weight: bold;',
      snapshot
    );
  }

  testPlanetCollision(fromPos, toPos, expectedBlocked = null) {
    if (!this.enabled) return;
    
    this.logPlanet('COLLISION_TEST', {
      from: fromPos,
      to: toPos,
      expected: expectedBlocked ? 'BLOCKED' : 'CLEAR'
    });
    
  }

  monitorWebSocket(ws) {
    if (!this.enabled || !ws) return;
    
    const startTime = Date.now();
    
    ws.addEventListener('open', () => {
      const connectTime = Date.now() - startTime;
      this.logNetwork('WS_CONNECTED', { connectTime: `${connectTime}ms` });
    });
    
    ws.addEventListener('close', (event) => {
      this.logNetwork('WS_DISCONNECTED', { 
        code: event.code, 
        reason: event.reason,
        wasClean: event.wasClean 
      });
    });
    
    ws.addEventListener('error', (error) => {
      this.logError(error, { component: 'WebSocket' });
    });
    
    let messageCount = 0;
    ws.addEventListener('message', () => {
      messageCount++;
      if (messageCount % 50 === 0) {
        this.logNetwork('WS_MESSAGES', { count: messageCount });
      }
    });
  }
}

export const debugLogger = new DebugLogger();

if (typeof window !== 'undefined') {
  window.debugAstra = {
    logger: debugLogger,
    report: () => debugLogger.generateReport(),
    clear: () => debugLogger.clearSession(),
    enable: () => { debugLogger.enabled = true; },
    disable: () => { debugLogger.enabled = false; }
  };

  if (window.location.search.includes('debug=true')) {
    debugLogger.enabled = true;
    console.log('Debug mode enabled via URL parameter');
  }
}