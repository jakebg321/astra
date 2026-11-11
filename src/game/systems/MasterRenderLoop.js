

export class MasterRenderLoop {
  constructor() {
    this.systems = new Map();
    this.isRunning = false;
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.deltaTime = 0;

    this.performanceStats = {
      frameTime: 0,
      systemTimes: new Map(),
      totalTime: 0
    };
  }

  registerSystem(name, system, priority = 0) {
    this.systems.set(name, {
      system,
      priority,
      enabled: true,
      lastCallTime: 0,
      avgTime: 0,
      callCount: 0
    });

    this.systems = new Map([...this.systems.entries()].sort((a, b) => b[1].priority - a[1].priority));
  }

  unregisterSystem(name) {
    if (this.systems.has(name)) {
      this.systems.delete(name);
    }
  }

  enableSystem(name, enabled = true) {
    if (this.systems.has(name)) {
      this.systems.get(name).enabled = enabled;
    }
  }

  update(state, delta) {
    if (!this.isRunning) return;

    const frameStart = performance.now();
    this.frameCount++;
    this.deltaTime = delta;

    if (process.env.NODE_ENV !== 'production') {
      window.debugPerf?.startTimer('masterLoop');
    }

    for (const [name, systemData] of this.systems) {
      if (!systemData.enabled) continue;

      const systemStart = process.env.NODE_ENV !== 'production' ? performance.now() : 0;
      
      try {

        if (typeof systemData.system === 'function') {
          systemData.system(state, delta, this.frameCount);
        } else if (systemData.system.update) {
          systemData.system.update(state, delta, this.frameCount);
        }

        if (process.env.NODE_ENV !== 'production') {
          const systemTime = performance.now() - systemStart;
          systemData.lastCallTime = systemTime;
          systemData.callCount++;
          systemData.avgTime = (systemData.avgTime * (systemData.callCount - 1) + systemTime) / systemData.callCount;
          this.performanceStats.systemTimes.set(name, systemTime);
        }
        
      } catch (error) {
        console.error(`MasterRenderLoop: Error in system '${name}':`, error);

        systemData.enabled = false;
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      this.performanceStats.frameTime = performance.now() - frameStart;
      this.performanceStats.totalTime += this.performanceStats.frameTime;
      this.lastFrameTime = frameStart;
      
      window.debugPerf?.endTimer('masterLoop');

      if (this.frameCount % 300 === 0) {
        this.logPerformanceStats();
      }
    }
  }

  start() {
    this.isRunning = true;
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
  }

  stop() {
    this.isRunning = false;
  }

  logPerformanceStats() {
    console.log('MasterRenderLoop Performance Stats:');
    console.log(`Frame Time: ${this.performanceStats.frameTime.toFixed(2)}ms`);
    console.log(`Average Frame Time: ${(this.performanceStats.totalTime / this.frameCount).toFixed(2)}ms`);

    for (const [name, systemData] of this.systems) {
      if (systemData.enabled && systemData.callCount > 0) {
        console.log(`  ${name}: ${systemData.avgTime.toFixed(2)}ms avg (${systemData.callCount} calls)`);
      }
    }
  }

  getSystemStats() {
    const stats = {
      totalSystems: this.systems.size,
      enabledSystems: 0,
      frameCount: this.frameCount,
      averageFrameTime: this.frameCount > 0 ? this.performanceStats.totalTime / this.frameCount : 0,
      systems: {}
    };

    for (const [name, systemData] of this.systems) {
      if (systemData.enabled) stats.enabledSystems++;
      
      stats.systems[name] = {
        enabled: systemData.enabled,
        priority: systemData.priority,
        avgTime: systemData.avgTime,
        callCount: systemData.callCount,
        lastCallTime: systemData.lastCallTime
      };
    }

    return stats;
  }
}

window.masterRenderLoop = new MasterRenderLoop();

export const getMasterRenderLoop = () => {
  return window.masterRenderLoop;
};

export const createRenderSystem = (name, updateFunction, priority = 0) => {
  return {
    name,
    update: updateFunction,
    priority,
    register: () => {
      getMasterRenderLoop().registerSystem(name, updateFunction, priority);
    },
    unregister: () => {
      getMasterRenderLoop().unregisterSystem(name);
    }
  };
};

