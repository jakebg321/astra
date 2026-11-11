

class UniversalAssetTracker {
  constructor() {
    this.isEnabled = false;
    this.sessionId = null;
    this.assets = {
      videos: [],
      models: [],
      textures: [],
      audio: [],
      images: [],
      fonts: [],
      apiData: [],
      generated: []
    };
    this.duplicates = [];
    this.assetHashes = new Map();
    this.loadTimes = new Map();
    this.originalMethods = new Map();
    this.interceptors = [];
    
    console.log('Universal Asset Tracker initialized');
  }

  enable(sessionId) {
    if (this.isEnabled) return;
    
    this.isEnabled = true;
    this.sessionId = sessionId;
    console.log(`Universal Asset Tracker ENABLED for session: ${sessionId}`);
    
    this.setupInterceptors();
  }

  disable() {
    if (!this.isEnabled) return;
    
    this.isEnabled = false;
    this.restoreOriginalMethods();
    console.log('Universal Asset Tracker DISABLED');
  }

  setupInterceptors() {

    this.interceptVideoLoading();

    this.interceptImageLoading();

    this.interceptAudioLoading();

    this.interceptFetchAPI();
  }

  interceptVideoLoading() {
    if (typeof window === 'undefined' || !window.HTMLMediaElement) return;
    
    const originalLoad = window.HTMLMediaElement.prototype.load;
    this.originalMethods.set('HTMLMediaElement.prototype.load', originalLoad);
    
    window.HTMLMediaElement.prototype.load = function(...args) {
      const video = this;
      const src = video.src || video.currentSrc;
      
      if (src && window.universalAssetTracker?.isEnabled) {
        window.universalAssetTracker.trackAssetLoad('video', src, {
          element: 'HTMLMediaElement',
          method: 'load()',
          size: video.videoWidth * video.videoHeight * 4 || 0
        });
      }
      
      return originalLoad.apply(this, args);
    };
    
    this.interceptors.push('HTMLMediaElement.prototype.load');
  }

  interceptImageLoading() {
    if (typeof window === 'undefined' || !window.Image) return;
    
    const originalImageSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    this.originalMethods.set('HTMLImageElement.src', originalImageSrc);
    
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      get() {
        return originalImageSrc.get.call(this);
      },
      set(value) {
        if (value && window.universalAssetTracker?.isEnabled) {
          window.universalAssetTracker.trackAssetLoad('image', value, {
            element: 'HTMLImageElement',
            method: 'src setter',
            size: 0
          });
        }
        return originalImageSrc.set.call(this, value);
      }
    });
    
    this.interceptors.push('HTMLImageElement.src');
  }

  interceptAudioLoading() {
    if (typeof window === 'undefined' || !window.Audio) return;

    this.originalAudioOwnDescriptor = Object.getOwnPropertyDescriptor(HTMLAudioElement.prototype, 'src');
    const originalAudioSrc = this.originalAudioOwnDescriptor
      || Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
    if (!originalAudioSrc) return;
    this.originalMethods.set('HTMLAudioElement.src', originalAudioSrc);
    
    Object.defineProperty(HTMLAudioElement.prototype, 'src', {
      configurable: true,
      enumerable: originalAudioSrc.enumerable,
      get() {
        return originalAudioSrc.get.call(this);
      },
      set(value) {
        if (value && window.universalAssetTracker?.isEnabled) {
          window.universalAssetTracker.trackAssetLoad('audio', value, {
            element: 'HTMLAudioElement',
            method: 'src setter',
            size: 0
          });
        }
        return originalAudioSrc.set.call(this, value);
      }
    });
    
    this.interceptors.push('HTMLAudioElement.src');
  }

  interceptFetchAPI() {
    if (typeof window === 'undefined' || !window.fetch) return;
    
    const originalFetch = window.fetch;
    this.originalMethods.set('window.fetch', originalFetch);
    
    window.fetch = async function(url, options = {}) {
      const startTime = performance.now();

      if (url && window.universalAssetTracker?.isEnabled) {

        if (typeof url === 'string' && 
            (url.includes('/api/') || url.includes('/user/') || url.includes('/stats/'))) {
          window.universalAssetTracker.trackAssetLoad('apiData', url, {
            element: 'fetch',
            method: options.method || 'GET',
            size: 0
          });
        }
      }
      
      try {
        const response = await originalFetch.call(this, url, options);
        const loadTime = performance.now() - startTime;
        
        if (url && window.universalAssetTracker?.isEnabled) {
          if (typeof url === 'string' && 
              (url.includes('/api/') || url.includes('/user/') || url.includes('/stats/'))) {
            window.universalAssetTracker.updateAssetLoadTime('apiData', url, loadTime);

            const clonedResponse = response.clone();
            try {
              const text = await clonedResponse.text();
              window.universalAssetTracker.updateAssetSize('apiData', url, text.length);
            } catch (e) {

            }
          }
        }
        
        return response;
      } catch (error) {
        if (url && window.universalAssetTracker?.isEnabled) {
          window.universalAssetTracker.markAssetLoadFailed('apiData', url, error);
        }
        throw error;
      }
    };
    
    this.interceptors.push('window.fetch');
  }

  trackAssetLoad(type, path, metadata = {}) {
    if (!this.isEnabled) return;
    
    const startTime = performance.now();
    const assetKey = `${type}:${path}`;

    if (!this.assets[type]) {
      this.assets[type] = [];
      console.warn(`Unknown asset type '${type}' initialized automatically`);
    }

    const existingAsset = this.findAsset(type, path);
    const isDuplicate = !!existingAsset;

    const asset = {
      path,
      type,
      startTime,
      loadTime: 0,
      size: metadata.size || 0,
      duplicate: isDuplicate,
      loadCount: isDuplicate ? existingAsset.loadCount + 1 : 1,
      metadata: {
        ...metadata,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString()
      },
      status: 'loading'
    };
    
    if (isDuplicate) {

      existingAsset.loadCount += 1;
      existingAsset.duplicate = true;

      this.duplicates.push({
        asset: path,
        type,
        loadCount: existingAsset.loadCount,
        wastedMemory: existingAsset.size,
        sources: [existingAsset.metadata.element, metadata.element],
        timestamp: startTime
      });
      
      console.warn(`DUPLICATE ASSET DETECTED: ${path} (load #${existingAsset.loadCount})`);
    } else {

      this.assets[type].push(asset);
      this.loadTimes.set(assetKey, startTime);
      
      console.log(`Asset loading started: ${type} - ${path}`);
    }
  }

  updateAssetLoadTime(type, path, loadTime) {
    if (!this.isEnabled) return;
    
    const asset = this.findAsset(type, path);
    if (asset) {
      asset.loadTime = loadTime;
      asset.status = 'loaded';
      
    }
  }

  updateAssetSize(type, path, size) {
    if (!this.isEnabled) return;
    
    const asset = this.findAsset(type, path);
    if (asset) {
      asset.size = size;
      
    }
  }

  markAssetLoadFailed(type, path, error) {
    if (!this.isEnabled) return;
    
    const asset = this.findAsset(type, path);
    if (asset) {
      asset.status = 'failed';
      asset.error = error.message;
      
      console.error(`Asset load failed: ${type} - ${path} - ${error.message}`);
    }
  }

  findAsset(type, path) {

    if (!this.assets[type]) {
      return null;
    }
    
    const assets = this.assets[type] || [];
    return assets.find(asset => asset.path === path);
  }

  restoreOriginalMethods() {

    for (const [methodName, originalMethod] of this.originalMethods) {
      try {
        if (methodName === 'HTMLImageElement.src') {
          Object.defineProperty(HTMLImageElement.prototype, 'src', originalMethod);
        } else if (methodName === 'HTMLAudioElement.src') {
          if (this.originalAudioOwnDescriptor) Object.defineProperty(HTMLAudioElement.prototype, 'src', originalMethod);
          else delete HTMLAudioElement.prototype.src;
        } else if (methodName === 'window.fetch') {
          window.fetch = originalMethod;
        } else if (methodName.includes('.')) {
          const parts = methodName.split('.');
          const propName = parts.pop();
          const obj = this.getGlobalObject(parts.join('.'));
          if (obj && originalMethod) {
            obj[propName] = originalMethod;
          }
        }
      } catch (error) {
        console.warn(`Failed to restore ${methodName}:`, error);
      }
    }
    
    this.originalMethods.clear();
    this.interceptors = [];
  }

  getGlobalObject(path) {
    return path.split('.').reduce((obj, prop) => obj?.[prop], window);
  }

  getSessionData() {
    if (!this.isEnabled) return null;
    
    const totalAssets = Object.values(this.assets).reduce((sum, assets) => sum + assets.length, 0);
    const totalDuplicates = this.duplicates.length;
    const wastedMemory = this.duplicates.reduce((sum, dup) => sum + dup.wastedMemory, 0);
    
    return {
      sessionId: this.sessionId,
      assets: this.assets,
      duplicates: this.duplicates,
      summary: {
        totalAssets,
        totalDuplicates,
        totalDuplicateLoads: this.duplicates.reduce((sum, dup) => sum + dup.loadCount, 0),
        wastedMemoryFromDuplicates: wastedMemory
      }
    };
  }

  clearSessionData() {
    this.assets = {
      videos: [],
      models: [],
      textures: [],
      audio: [],
      images: [],
      fonts: [],
      apiData: [],
      generated: []
    };
    this.duplicates = [];
    this.assetHashes.clear();
    this.loadTimes.clear();
    console.log('Session data cleared');
  }
}

const universalAssetTracker = new UniversalAssetTracker();

if (typeof window !== 'undefined') {
  window.universalAssetTracker = universalAssetTracker;
}

export default universalAssetTracker;
