

import sessionLogger from './SessionLogger';

class PerformanceMonitor {
  constructor() {
    this.isEnabled = false;
    this.currentSession = null;
    this.frameHistory = [];
    this.maxFrameHistory = 120;
    this.webglStats = {
      history: [],
      peak: {
        drawCalls: 0,
        triangles: 0,
        textures: 0,
        geometries: 0,
        programs: 0
      }
    };
    this.phases = {
      hyperTransition: { startMs: null, endMs: null, events: [] },
      assetLoading: { startMs: null, endMs: null, assets: [] },
      gameplay: { startMs: null, endMs: null, spikes: [] }
    };
    this.networkStats = {
      messagesIn: 0,
      messagesOut: 0,
      bytesIn: 0,
      bytesOut: 0,
      lastReset: performance.now()
    };
    this.memoryStats = {
      heapAtStart: 0,
      heapAtEnd: 0,
      heapGrowth: 0,
      samples: []
    };
    this.componentLog = [];
    this.rafId = null;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.spikeCapture = { 
      enabled: true, 
      thresholdMs: 100,
      preMs: 500,
      postMs: 500,
      exportOnSevere: true, 
      maxSnapshots: 5,
      exportThresholdMs: 150,
      minExportIntervalMs: 5000,
      lastExportTime: 0,
      exportedCount: 0,
      maxAutoExports: 10
    };
    this.gameEvents = [];
    this.maxEventHistory = 200;
    this.networkHistory = [];
    
    console.log('Performance Monitor initialized');
  }

  enable() {
    if (this.isEnabled) return;
    
    this.isEnabled = true;
    this.startNewSession();
    this.startFrameLoop();
    this.startMemoryMonitoring();

    if (window.universalAssetTracker) {
      window.universalAssetTracker.enable(this.currentSession.sessionId);
    }
    
    console.log(`Performance Monitor ENABLED - Session: ${this.currentSession.sessionId}`);
  }

  disable() {
    if (!this.isEnabled) return;
    
    this.isEnabled = false;
    this.stopFrameLoop();
    this.stopMemoryMonitoring();

    if (window.universalAssetTracker) {
      window.universalAssetTracker.disable();
    }

    this.exportSession();
    
    console.log('Performance Monitor DISABLED');
  }

  startNewSession() {
    const sessionId = this.generateSessionId();
    const timestamp = new Date().toISOString();
    
    this.currentSession = {
      sessionId,
      timestamp,
      startTime: performance.now(),
      endTime: null,
      duration: 0
    };

    this.phases = {
      hyperTransition: { startMs: null, endMs: null, events: [] },
      assetLoading: { startMs: null, endMs: null, assets: [] },
      gameplay: { startMs: null, endMs: null, spikes: [] }
    };

    this.frameHistory = [];
    this.frameCount = 0;
    this.lastFrameTime = performance.now();

    this.gameEvents = [];
    this.networkHistory = [];

    this.networkStats = {
      messagesIn: 0,
      messagesOut: 0,
      bytesIn: 0,
      bytesOut: 0,
      lastReset: performance.now()
    };

    this.recordMemorySample('session_start');
    
    console.log(`New session started: ${sessionId}`);
  }

  generateSessionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `ASTRA_${timestamp}_${random}`;
  }

  startFrameLoop() {
    const tick = () => {
      if (!this.isEnabled) return;
      
      const now = performance.now();
      const frameTime = now - this.lastFrameTime;
      this.lastFrameTime = now;

      this.recordFrame(frameTime);

      this.updateWebGLStats();
      this.networkHistory.push({
        timestamp: now,
        messagesIn: this.networkStats.messagesIn,
        messagesOut: this.networkStats.messagesOut,
        bytesIn: this.networkStats.bytesIn,
        bytesOut: this.networkStats.bytesOut
      });
      if (this.networkHistory.length > 600) {
        this.networkHistory.shift();
      }

      if (this.frameCount % 60 === 0) {
        this.recordMemorySample('periodic');
      }
      
      this.frameCount++;
      this.rafId = requestAnimationFrame(tick);
    };
    
    this.rafId = requestAnimationFrame(tick);
  }

  stopFrameLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  recordFrame(frameTime) {
    const frameData = {
      frameNumber: this.frameCount,
      frameTime,
      timestamp: performance.now(),
      fps: 1000 / frameTime,
      isSpike: frameTime > 33,
      isSevereSpike: frameTime > 50
    };
    
    this.frameHistory.push(frameData);

    if (this.frameHistory.length > this.maxFrameHistory) {
      this.frameHistory.shift();
    }

    if (frameData.isSevereSpike) {
      this.logFrameSpike(frameData);
    }
  }

  logFrameSpike(frameData) {
    const currentPhase = this.getCurrentPhase();
    const spike = {
      timeMs: frameData.timestamp - this.currentSession.startTime,
      frameTimeMs: frameData.frameTime,
      phase: currentPhase,
      cause: this.inferSpikeCause(frameData)
    };
    
    this.phases.gameplay.spikes.push(spike);
    
    console.warn(`FRAME SPIKE: ${frameData.frameTime.toFixed(2)}ms in phase ${currentPhase}`);
    
    if (this.spikeCapture && this.spikeCapture.enabled) {

      if (frameData.frameTime >= this.spikeCapture.thresholdMs) {
        const snapshot = this.captureSpikeWindow(frameData);
        if (snapshot) {

          sessionLogger.logSpikeSnapshot(snapshot, { 
            autoExport: false, 
            maxSnapshots: this.spikeCapture.maxSnapshots 
          });
          this.scheduleMemoryBurst();
        }
      }
    }
  }

  logGameEvent(type, detail = {}) {
    const event = {
      type,
      detail,
      timestamp: performance.now(),
      relativeTime: performance.now() - this.currentSession.startTime
    };
    this.gameEvents.push(event);
    if (this.gameEvents.length > this.maxEventHistory) {
      this.gameEvents.shift();
    }
  }

  captureSpikeWindow(frameData) {
    const spikeTs = frameData.timestamp;
    const pre = this.spikeCapture.preMs;
    const post = this.spikeCapture.postMs;
    const startTs = spikeTs - pre;
    const endTs = spikeTs + post;
    const frames = this.frameHistory.filter(f => f.timestamp >= startTs && f.timestamp <= endTs);
    const webgl = this.webglStats.history.filter(s => s.timestamp >= startTs && s.timestamp <= endTs);
    const memory = this.memoryStats.samples.filter(s => s.timestamp >= startTs && s.timestamp <= endTs);
    const events = this.gameEvents.filter(e => e.timestamp >= startTs && e.timestamp <= endTs);
    const startNetArr = this.networkHistory.filter(s => s.timestamp <= startTs);
    const endNetArr = this.networkHistory.filter(s => s.timestamp <= endTs);
    const startNet = startNetArr.length > 0 ? startNetArr[startNetArr.length - 1] : null;
    const endNet = endNetArr.length > 0 ? endNetArr[endNetArr.length - 1] : null;
    let network = { start: startNet, end: endNet, delta: null };
    if (startNet && endNet) {
      network = {
        start: startNet,
        end: endNet,
        delta: {
          messagesIn: endNet.messagesIn - startNet.messagesIn,
          messagesOut: endNet.messagesOut - startNet.messagesOut,
          bytesIn: endNet.bytesIn - startNet.bytesIn,
          bytesOut: endNet.bytesOut - startNet.bytesOut
        }
      };
    }
    const baseWall = Date.parse(this.currentSession.timestamp);
    const windowAbsStart = baseWall + (startTs - this.currentSession.startTime);
    const windowAbsEnd = baseWall + (endTs - this.currentSession.startTime);
    const trackerData = window.universalAssetTracker?.getSessionData ? window.universalAssetTracker.getSessionData() : null;
    const assets = {};
    if (trackerData && trackerData.assets) {
      for (const key of Object.keys(trackerData.assets)) {
        const arr = trackerData.assets[key] || [];
        assets[key] = arr.filter(a => {
          const t = Date.parse(a.metadata?.timestamp || '');
          return Number.isFinite(t) && t >= windowAbsStart && t <= windowAbsEnd;
        });
      }
    }
    return {
      sessionId: this.currentSession.sessionId,
      spike: {
        timeMs: frameData.timestamp - this.currentSession.startTime,
        frameTimeMs: frameData.frameTime,
        phase: this.getCurrentPhase(),
        cause: this.inferSpikeCause(frameData)
      },
      window: {
        startMs: startTs - this.currentSession.startTime,
        endMs: endTs - this.currentSession.startTime
      },
      frames,
      webgl,
      memory,
      network,
      assets,
      events
    };
  }

  scheduleMemoryBurst() {
    const times = [0, 16, 33, 66];
    times.forEach(t => setTimeout(() => this.recordMemorySample('post_spike'), t));
  }

  inferSpikeCause(frameData) {

    const currentPhase = this.getCurrentPhase();
    
    if (currentPhase === 'hyperTransition') {
      return 'video_playback';
    } else if (currentPhase === 'assetLoading') {
      return 'asset_loading';
    } else if (this.frameCount < 300) {
      return 'initial_render';
    } else {
      return 'gameplay_stress';
    }
  }

  getCurrentPhase() {
    if (this.phases.hyperTransition.startMs && !this.phases.hyperTransition.endMs) {
      return 'hyperTransition';
    } else if (this.phases.assetLoading.startMs && !this.phases.assetLoading.endMs) {
      return 'assetLoading';
    } else if (this.phases.gameplay.startMs) {
      return 'gameplay';
    }
    return 'unknown';
  }

  updateWebGLStats() {
    if (!window.gameRenderer) return;
    
    const renderer = window.gameRenderer;
    const info = renderer.info;
    
    const stats = {
      timestamp: performance.now(),
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      textures: info.memory.textures,
      geometries: info.memory.geometries,
      programs: info.programs?.length || 0,

      triangleSources: this.inferTriangleSources(info.render.triangles)
    };
    
    this.webglStats.history.push(stats);

    if (this.webglStats.history.length > 300) {
      this.webglStats.history.shift();
    }

    this.webglStats.peak.drawCalls = Math.max(this.webglStats.peak.drawCalls, stats.drawCalls);
    this.webglStats.peak.triangles = Math.max(this.webglStats.peak.triangles, stats.triangles);
    this.webglStats.peak.textures = Math.max(this.webglStats.peak.textures, stats.textures);
    this.webglStats.peak.geometries = Math.max(this.webglStats.peak.geometries, stats.geometries);
    this.webglStats.peak.programs = Math.max(this.webglStats.peak.programs, stats.programs);
  }

  inferTriangleSources(triangleCount) {

    const sources = [];
    
    if (triangleCount > 50000) {
      sources.push('environment_planets');
    }
    if (triangleCount > 20000) {
      sources.push('spaceship_models');
    }
    if (triangleCount > 10000) {
      sources.push('skybox_hdr');
    }
    if (triangleCount > 5000) {
      sources.push('weapon_effects');
    }
    if (triangleCount > 1000) {
      sources.push('ui_hud_elements');
    }

    if (window.gameRenderer?.info?.render?.triangles > 10000) {
      sources.push('bullet_beams');
    }
    
    return sources.length > 0 ? sources : ['unknown'];
  }

  recordMemorySample(label) {
    if (!performance.memory) return;
    
    const sample = {
      timestamp: performance.now(),
      label,
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    };
    
    this.memoryStats.samples.push(sample);

    if (this.memoryStats.samples.length > 100) {
      this.memoryStats.samples.shift();
    }
    
    if (label === 'session_start') {
      this.memoryStats.heapAtStart = sample.usedJSHeapSize;
    }
  }

  markPhaseStart(phaseName) {
    if (!this.phases[phaseName]) {
      console.warn(`Unknown phase: ${phaseName}`);
      return;
    }
    
    const now = performance.now();
    this.phases[phaseName].startMs = now - this.currentSession.startTime;
    
    console.log(`Phase started: ${phaseName} at ${this.phases[phaseName].startMs.toFixed(2)}ms`);
  }

  markPhaseEnd(phaseName) {
    if (!this.phases[phaseName]) {
      console.warn(`Unknown phase: ${phaseName}`);
      return;
    }
    
    const now = performance.now();
    this.phases[phaseName].endMs = now - this.currentSession.startTime;
    
    console.log(`Phase ended: ${phaseName} at ${this.phases[phaseName].endMs.toFixed(2)}ms`);
  }

  trackComponentMount(componentName, props = {}) {
    const event = {
      type: 'mount',
      componentName,
      timestamp: performance.now(),
      relativeTime: performance.now() - this.currentSession.startTime,
      props
    };
    
    this.componentLog.push(event);
    console.log(`Component mounted: ${componentName}`);
  }

  trackComponentUnmount(componentName) {
    const event = {
      type: 'unmount',
      componentName,
      timestamp: performance.now(),
      relativeTime: performance.now() - this.currentSession.startTime
    };
    
    this.componentLog.push(event);
    console.log(`Component unmounted: ${componentName}`);
  }

  trackNetworkMessage(direction, size) {
    if (direction === 'in') {
      this.networkStats.messagesIn++;
      this.networkStats.bytesIn += size;
    } else {
      this.networkStats.messagesOut++;
      this.networkStats.bytesOut += size;
    }
  }

  getCurrentFPS() {
    if (this.frameHistory.length === 0) return 0;
    const latest = this.frameHistory[this.frameHistory.length - 1];
    return latest.fps;
  }

  getAverageFPS(lastSeconds = 5) {
    if (this.frameHistory.length === 0) return 0;
    
    const cutoffTime = performance.now() - (lastSeconds * 1000);
    const recentFrames = this.frameHistory.filter(frame => frame.timestamp >= cutoffTime);
    
    if (recentFrames.length === 0) return 0;
    
    const avgFrameTime = recentFrames.reduce((sum, frame) => sum + frame.frameTime, 0) / recentFrames.length;
    return 1000 / avgFrameTime;
  }

  getMinFPS(lastSeconds = 5) {
    if (this.frameHistory.length === 0) return 0;
    
    const cutoffTime = performance.now() - (lastSeconds * 1000);
    const recentFrames = this.frameHistory.filter(frame => frame.timestamp >= cutoffTime);
    
    if (recentFrames.length === 0) return 0;
    
    return Math.min(...recentFrames.map(frame => frame.fps));
  }

  getMaxFPS(lastSeconds = 5) {
    if (this.frameHistory.length === 0) return 0;
    
    const cutoffTime = performance.now() - (lastSeconds * 1000);
    const recentFrames = this.frameHistory.filter(frame => frame.timestamp >= cutoffTime);
    
    if (recentFrames.length === 0) return 0;
    
    return Math.max(...recentFrames.map(frame => frame.fps));
  }

  getSessionData() {
    if (!this.currentSession) return null;
    
    const now = performance.now();
    this.currentSession.endTime = now;
    this.currentSession.duration = now - this.currentSession.startTime;

    this.recordMemorySample('session_end');
    this.memoryStats.heapAtEnd = this.memoryStats.samples[this.memoryStats.samples.length - 1]?.usedJSHeapSize || 0;
    this.memoryStats.heapGrowth = this.memoryStats.heapAtEnd - this.memoryStats.heapAtStart;

    const assetData = window.universalAssetTracker?.getSessionData() || {
      assets: { videos: [], models: [], textures: [], audio: [], images: [], fonts: [], apiData: [], generated: [] },
      duplicates: [],
      summary: { totalAssets: 0, totalDuplicates: 0, totalDuplicateLoads: 0, wastedMemoryFromDuplicates: 0 }
    };
    
    return {
      sessionId: this.currentSession.sessionId,
      timestamp: this.currentSession.timestamp,
      duration: this.currentSession.duration / 1000,
      phases: {
        hyperTransition: {
          startMs: this.phases.hyperTransition.startMs || 0,
          endMs: this.phases.hyperTransition.endMs || 0,
          avgFps: this.calculatePhaseFPS('hyperTransition'),
          minFps: this.calculatePhaseMinFPS('hyperTransition')
        },
        assetLoading: {
          startMs: this.phases.assetLoading.startMs || 0,
          endMs: this.phases.assetLoading.endMs || 0,
          assetsLoaded: assetData.assets,
          duplicates: assetData.duplicates
        },
        gameplay: {
          startMs: this.phases.gameplay.startMs || 0,
          avgFps: this.calculatePhaseFPS('gameplay'),
          minFps: this.calculatePhaseMinFPS('gameplay'),
          spikeCount: this.phases.gameplay.spikes.length
        }
      },
      webgl: {
        peakDrawCalls: this.webglStats.peak.drawCalls,
        peakTriangles: this.webglStats.peak.triangles,
        peakTextures: this.webglStats.peak.textures,
        geometryLeaks: this.webglStats.peak.geometries > 50
      },
      memory: {
        heapAtStart: this.memoryStats.heapAtStart,
        heapAtEnd: this.memoryStats.heapAtEnd,
        heapGrowth: this.memoryStats.heapGrowth
      },
      spikes: this.phases.gameplay.spikes,
      assets: assetData.assets,
      duplicates: assetData.duplicates,
      totalAssetsLoaded: assetData.summary.totalAssets,
      totalDuplicateLoads: assetData.summary.totalDuplicateLoads,
      wastedMemoryFromDuplicates: assetData.summary.wastedMemoryFromDuplicates,
      network: this.networkStats,
      components: this.componentLog
    };
  }

  calculatePhaseFPS(phaseName) {
    const phase = this.phases[phaseName];
    if (!phase.startMs) return 0;
    
    const endMs = phase.endMs || performance.now() - this.currentSession.startTime;
    const phaseFrames = this.frameHistory.filter(frame => {
      const frameTime = frame.timestamp - this.currentSession.startTime;
      return frameTime >= phase.startMs && frameTime <= endMs;
    });
    
    if (phaseFrames.length === 0) return 0;
    
    const avgFrameTime = phaseFrames.reduce((sum, frame) => sum + frame.frameTime, 0) / phaseFrames.length;
    return 1000 / avgFrameTime;
  }

  calculatePhaseMinFPS(phaseName) {
    const phase = this.phases[phaseName];
    if (!phase.startMs) return 0;
    
    const endMs = phase.endMs || performance.now() - this.currentSession.startTime;
    const phaseFrames = this.frameHistory.filter(frame => {
      const frameTime = frame.timestamp - this.currentSession.startTime;
      return frameTime >= phase.startMs && frameTime <= endMs;
    });
    
    if (phaseFrames.length === 0) return 0;
    
    return Math.min(...phaseFrames.map(frame => frame.fps));
  }

  exportSession() {
    const sessionData = this.getSessionData();
    if (!sessionData) return;

    sessionLogger.logSession(sessionData);
    
    console.log(`Session logged and exported: ${sessionData.sessionId}`);
  }

  getLiveSnapshot() {
    return {
      fps: {
        current: this.getCurrentFPS(),
        avg5s: this.getAverageFPS(5),
        min5s: this.getMinFPS(5),
        max5s: this.getMaxFPS(5)
      },
      frameTime: {
        current: this.frameHistory.length > 0 ? this.frameHistory[this.frameHistory.length - 1].frameTime : 0,
        sparkline: this.frameHistory.slice(-60).map(frame => frame.frameTime)
      },
      webgl: this.webglStats.peak,
      memory: {
        current: this.memoryStats.samples.length > 0 ? 
          this.memoryStats.samples[this.memoryStats.samples.length - 1].usedJSHeapSize : 0,
        growth: this.memoryStats.heapGrowth
      },
      phase: this.getCurrentPhase(),
      assets: window.universalAssetTracker?.getSessionData()?.summary || {
        totalAssets: 0, totalDuplicates: 0, totalDuplicateLoads: 0, wastedMemoryFromDuplicates: 0
      }
    };
  }

  startMemoryMonitoring() {
    if (this.memoryMonitorInterval) return;
    
    this.memoryMonitorInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 30000);
    
    console.log('Memory monitoring started');
  }

  stopMemoryMonitoring() {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
      console.log('Memory monitoring stopped');
    }
  }

  checkMemoryUsage() {
    if (typeof performance === 'undefined' || !performance.memory) {
      return;
    }

    const memory = performance.memory;
    const usedMB = memory.usedJSHeapSize / (1024 * 1024);
    const totalMB = memory.totalJSHeapSize / (1024 * 1024);
    const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);

    console.log(`Memory: ${usedMB.toFixed(1)}MB used / ${totalMB.toFixed(1)}MB total / ${limitMB.toFixed(1)}MB limit`);

    const memoryUsagePercent = (usedMB / limitMB) * 100;
    if (memoryUsagePercent > 80) {
      console.warn(`High memory usage: ${memoryUsagePercent.toFixed(1)}% — use window.disposeGlobalAssets() manually after leaving game`);
    }

    if (this.currentSession) {
      this.currentSession.memory = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        usagePercent: memoryUsagePercent
      };
    }
  }

  triggerMemoryCleanup() {
    console.log('Triggering automatic memory cleanup...');

    if (typeof window.disposeGlobalAssets === 'function') {
      window.disposeGlobalAssets();
    }

    if (typeof window.gc === 'function') {
      window.gc();
      console.log('Forced garbage collection');
    }

    if (window.getAudioManager) {
      const audioManager = window.getAudioManager();
      if (audioManager && typeof audioManager.dispose === 'function') {
        audioManager.dispose();
      }
    }
    
    console.log('Automatic memory cleanup completed');
  }
}

const performanceMonitor = new PerformanceMonitor();

if (typeof window !== 'undefined') {
  window.performanceMonitor = performanceMonitor;
}

export default performanceMonitor;
