

class SessionLogger {
  constructor() {
    this.sessions = new Map();
    this.autoExportEnabled = false;
    this.maxStoredSessions = 10;
    this.spikeSnapshots = [];
    this.maxSpikeSnapshots = 5;
    
    console.log('Session Logger initialized');
  }

  logSession(sessionData) {
    if (!sessionData || !sessionData.sessionId) {
      console.warn('Invalid session data provided to logger');
      return;
    }

    this.sessions.set(sessionData.sessionId, {
      ...sessionData,
      loggedAt: new Date().toISOString()
    });

    if (this.sessions.size > this.maxStoredSessions) {
      const oldestKey = this.sessions.keys().next().value;
      this.sessions.delete(oldestKey);
      console.log(`Removed oldest session: ${oldestKey}`);
    }

    console.log(`Session logged: ${sessionData.sessionId}`);

    if (this.autoExportEnabled) {
      this.exportSession(sessionData.sessionId);
    }
  }

  exportSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`Session not found: ${sessionId}`);
      return;
    }

    const report = this.createSessionReport(session);

    this.downloadSessionJSON(report, sessionId);

    this.storeSessionBackup(report, sessionId);
  }

  logSpikeSnapshot(snapshot, options = {}) {
    if (!snapshot || !snapshot.sessionId) return;
    const { autoExport = false, maxSnapshots = this.maxSpikeSnapshots } = options;
    this.spikeSnapshots.push({ ...snapshot, loggedAt: new Date().toISOString() });
    while (this.spikeSnapshots.length > maxSnapshots) {
      this.spikeSnapshots.shift();
    }

    if (autoExport === true) {
      this.exportSpikeSnapshot(snapshot);
    }

    this.exportSpikeSnapshotsToStorage();
  }

  exportSpikeSnapshot(snapshot) {
    try {
      const report = this.createSpikeReport(snapshot);
      this.downloadSpikeJSON(report, snapshot.sessionId);
    } catch (error) {
      console.error('Failed to export spike snapshot:', error);
    }
  }

  createSpikeReport(snapshot) {
    return {
      type: 'spike',
      sessionId: snapshot.sessionId,
      spike: snapshot.spike,
      window: snapshot.window,
      frames: snapshot.frames,
      webgl: snapshot.webgl,
      memory: snapshot.memory,
      network: snapshot.network,
      assets: snapshot.assets,
      events: snapshot.events,
      exportedAt: new Date().toISOString()
    };
  }

  downloadSpikeJSON(report, sessionId) {
    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const ts = Date.now();
    const filename = `perfSpike_${sessionId}_${ts}.json`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    console.log(`Spike snapshot exported: ${filename}`);
  }

  exportSpikeSnapshotsToStorage() {
    try {

      const now = Date.now();
      if (this._lastStorageSave && (now - this._lastStorageSave) < 10000) {
        return null;
      }
      this._lastStorageSave = now;
      
      const collection = {
        type: 'spike_collection',
        exportedAt: new Date().toISOString(),
        totalSnapshots: this.spikeSnapshots.length,
        snapshots: this.spikeSnapshots
      };
      const json = JSON.stringify(collection);
      const key = `perf_spike_collection_${Date.now()}`;
      localStorage.setItem(key, json);
      console.log(`Spike collection stored to localStorage: ${key} (${this.spikeSnapshots.length} snapshots)`);
      return key;
    } catch (error) {
      console.error('Failed to store spike collection to localStorage:', error);
      return null;
    }
  }

  getStoredSpikeCollections() {
    const collections = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('perf_spike_collection_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          collections.push({ key, data });
        } catch (error) {
          console.warn(`Failed to parse spike collection: ${key}`);
        }
      }
    }
    return collections.sort((a, b) => new Date(b.data.exportedAt) - new Date(a.data.exportedAt));
  }

  downloadStoredSpikeCollection(key) {
    try {
      const json = localStorage.getItem(key);
      if (!json) {
        console.warn(`Spike collection not found: ${key}`);
        return;
      }
      const collection = JSON.parse(json);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const filename = `perfSpikeCollection_${collection.exportedAt.replace(/[:.]/g, '-')}.json`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      console.log(`Stored spike collection exported: ${filename}`);
    } catch (error) {
      console.error(`Failed to export stored spike collection ${key}:`, error);
    }
  }

  addSpikeSnapshotToStorage(snapshot) {
    this.spikeSnapshots.push({ ...snapshot, loggedAt: new Date().toISOString() });
    while (this.spikeSnapshots.length > this.maxSpikeSnapshots) {
      this.spikeSnapshots.shift();
    }
  }

  createSessionReport(session) {
    return {
      sessionId: session.sessionId,
      timestamp: session.timestamp,
      duration: session.duration,
      summary: {
        totalAssetsLoaded: session.totalAssetsLoaded || 0,
        totalDuplicateLoads: session.totalDuplicateLoads || 0,
        wastedMemoryFromDuplicates: session.wastedMemoryFromDuplicates || 0,
        avgFPS: this.calculateAverageFPS(session),
        minFPS: this.calculateMinFPS(session),
        spikeCount: session.phases?.gameplay?.spikeCount || 0
      },
      phases: {
        hyperTransition: {
          startMs: session.phases?.hyperTransition?.startMs || 0,
          endMs: session.phases?.hyperTransition?.endMs || 0,
          duration: (session.phases?.hyperTransition?.endMs || 0) - (session.phases?.hyperTransition?.startMs || 0),
          avgFps: session.phases?.hyperTransition?.avgFps || 0,
          minFps: session.phases?.hyperTransition?.minFps || 0
        },
        assetLoading: {
          startMs: session.phases?.assetLoading?.startMs || 0,
          endMs: session.phases?.assetLoading?.endMs || 0,
          duration: (session.phases?.assetLoading?.endMs || 0) - (session.phases?.assetLoading?.startMs || 0),
          assetsLoaded: session.phases?.assetLoading?.assetsLoaded || {},
          duplicates: session.phases?.assetLoading?.duplicates || []
        },
        gameplay: {
          startMs: session.phases?.gameplay?.startMs || 0,
          avgFps: session.phases?.gameplay?.avgFps || 0,
          minFps: session.phases?.gameplay?.minFps || 0,
          spikeCount: session.phases?.gameplay?.spikeCount || 0,
          spikes: session.spikes || []
        }
      },
      webgl: {
        peakDrawCalls: session.webgl?.peakDrawCalls || 0,
        peakTriangles: session.webgl?.peakTriangles || 0,
        peakTextures: session.webgl?.peakTextures || 0,
        geometryLeaks: session.webgl?.geometryLeaks || false
      },
      memory: {
        heapAtStart: session.memory?.heapAtStart || 0,
        heapAtEnd: session.memory?.heapAtEnd || 0,
        heapGrowth: session.memory?.heapGrowth || 0
      },
      assets: {
        videos: this.categorizeAssets(session.assets?.videos || []),
        models: this.categorizeAssets(session.assets?.models || []),
        textures: this.categorizeAssets(session.assets?.textures || []),
        audio: this.categorizeAssets(session.assets?.audio || []),
        images: this.categorizeAssets(session.assets?.images || []),
        apiData: this.categorizeAssets(session.assets?.apiData || [])
      },
      duplicates: session.duplicates || [],
      network: session.network || {
        messagesIn: 0,
        messagesOut: 0,
        bytesIn: 0,
        bytesOut: 0
      },
      components: session.components || [],
      recommendations: this.generateRecommendations(session)
    };
  }

  categorizeAssets(assets) {
    return assets.map(asset => ({
      path: asset.path,
      size: asset.size,
      loadTime: asset.loadTime,
      duplicate: asset.duplicate || false,
      loadCount: asset.loadCount || 1,
      status: asset.status || 'unknown'
    }));
  }

  calculateAverageFPS(session) {

    const phases = ['hyperTransition', 'assetLoading', 'gameplay'];
    const fpsValues = phases.map(phase => session.phases?.[phase]?.avgFps).filter(fps => fps > 0);
    
    if (fpsValues.length === 0) return 0;
    return fpsValues.reduce((sum, fps) => sum + fps, 0) / fpsValues.length;
  }

  calculateMinFPS(session) {

    const phases = ['hyperTransition', 'assetLoading', 'gameplay'];
    const fpsValues = phases.map(phase => session.phases?.[phase]?.minFps).filter(fps => fps > 0);
    
    if (fpsValues.length === 0) return 0;
    return Math.min(...fpsValues);
  }

  generateRecommendations(session) {
    const recommendations = [];

    if (session.totalDuplicateLoads > 0) {
      recommendations.push({
        type: 'duplicate_assets',
        severity: 'high',
        message: `${session.totalDuplicateLoads} duplicate asset loads detected wasting ${this.formatBytes(session.wastedMemoryFromDuplicates)}`,
        suggestion: 'Implement proper asset caching to eliminate duplicate loads'
      });
    }

    if (session.memory?.heapGrowth > 50 * 1024 * 1024) {
      recommendations.push({
        type: 'memory_growth',
        severity: 'medium',
        message: `Memory grew by ${this.formatBytes(session.memory.heapGrowth)} during session`,
        suggestion: 'Check for memory leaks in components or asset disposal'
      });
    }

    const avgFPS = this.calculateAverageFPS(session);
    if (avgFPS < 30) {
      recommendations.push({
        type: 'low_fps',
        severity: 'high',
        message: `Average FPS is ${avgFPS.toFixed(1)} which is below 30fps`,
        suggestion: 'Consider reducing quality settings or optimizing rendering pipeline'
      });
    }

    if (session.spikes?.length > 0) {
      recommendations.push({
        type: 'frame_spikes',
        severity: 'medium',
        message: `${session.spikes.length} frame spikes detected during gameplay`,
        suggestion: 'Investigate spike causes: asset loading, garbage collection, or rendering bottlenecks'
      });
    }

    if (session.webgl?.peakTextures > 100) {
      recommendations.push({
        type: 'texture_overload',
        severity: 'medium',
        message: `Peak texture count is ${session.webgl.peakTextures} which may cause performance issues`,
        suggestion: 'Implement texture pooling or reduce texture resolution'
      });
    }

    return recommendations;
  }

  formatBytes(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  downloadSessionJSON(report, sessionId) {
    try {
      const json = JSON.stringify(report, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const filename = `perf_${sessionId}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      console.log(`Session exported: ${filename}`);
    } catch (error) {
      console.error('Failed to export session:', error);
    }
  }

  storeSessionBackup(report, sessionId) {
    try {
      const json = JSON.stringify(report);
      const key = `perf_session_${sessionId}`;
      localStorage.setItem(key, json);
      console.log(`Session backed up to localStorage: ${key}`);
    } catch (error) {
      console.warn('Failed to backup session to localStorage:', error);
    }
  }

  getAllStoredSessions() {
    return Array.from(this.sessions.values());
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  clearAllSessions() {
    this.sessions.clear();
    console.log('All sessions cleared');
  }

  enableAutoExport(enabled = true) {
    this.autoExportEnabled = enabled;
    console.log(`Auto-export ${enabled ? 'enabled' : 'disabled'}`);
  }

  getLocalStorageBackups() {
    const backups = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('perf_session_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          backups.push(data);
        } catch (error) {
          console.warn(`Failed to parse backup: ${key}`);
        }
      }
    }
    
    return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  downloadAllSessions() {
    const sessions = this.getAllStoredSessions();
    const backups = this.getLocalStorageBackups();
    const allSessions = [...sessions, ...backups];
    
    if (allSessions.length === 0) {
      console.warn('No sessions to export');
      return;
    }

    const collection = {
      exportedAt: new Date().toISOString(),
      totalSessions: allSessions.length,
      sessions: allSessions
    };

    try {
      const json = JSON.stringify(collection, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const filename = `perf_all_sessions_${Date.now()}.json`;
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      console.log(`All sessions exported: ${filename}`);
    } catch (error) {
      console.error('Failed to export all sessions:', error);
    }
  }
}

const sessionLogger = new SessionLogger();

if (typeof window !== 'undefined') {
  window.sessionLogger = sessionLogger;
}

export default sessionLogger;
