import { useEffect, useState } from 'react';

const GlobalAssetPreloader = () => {
  const [preloadStatus, setPreloadStatus] = useState('idle');
  const [loadedAssets, setLoadedAssets] = useState(0);
  const [totalAssets, setTotalAssets] = useState(0);

  useEffect(() => {
    const startGlobalPreload = async () => {
      if (window.globalAssetsReady || window.gameAssetsReady) {
        setPreloadStatus('complete');
        return;
      }
      if (window.globalAssetsPreloading) {
        console.log('Global asset preload already in progress, skipping duplicate start');
        return;
      }

      window.__astraGlobalPreloadRuns = (window.__astraGlobalPreloadRuns || 0) + 1;
      if (window.__astraGlobalPreloadRuns > 1) {
        console.warn(`Global preload started ${window.__astraGlobalPreloadRuns} times in this session`);
      }
      
      window.globalAssetsPreloading = true;
      setPreloadStatus('loading');
      
      try {

        const criticalAssets = [
          { type: 'video', src: '/hyper.mp4', name: 'Hyper Transition Video' },
          
          { type: 'model', src: '/Space Fighter Jet.glb', name: 'Player Spaceship Model' },
          { type: 'model', src: '/povglb/astra_cockpit.glb', name: 'Cockpit Model' },
          
          { type: 'texture', src: '/files/assets/228743307/1/hull_baseColor.png', name: 'Ship Hull Texture' },
          { type: 'texture', src: '/textures/planets/astra.png', name: 'Astra Logo Texture' },
          
          { type: 'audio', src: '/sound/lazers.mp4', name: 'Laser Sound Effect' },
          { type: 'audio', src: '/sound/engine.mp4', name: 'Engine Sound Loop' },
          { type: 'audio', src: '/sound/lobbyMusic.mp4', name: 'Background Music' },
        ];
        
        setTotalAssets(criticalAssets.length);
        
        let completedAssets = 0;
        const markProgress = (assetName, failed = false) => {
          completedAssets += 1;
          setLoadedAssets(completedAssets);

          window.dispatchEvent(new CustomEvent('globalAssetsProgress', {
            detail: {
              loadedAssets: completedAssets,
              totalAssets: criticalAssets.length,
              currentAsset: failed ? `${assetName} (failed)` : assetName
            }
          }));
        };

        const preloadPromises = criticalAssets.map(async (asset) => {
          try {
            await preloadAsset(asset);
            markProgress(asset.name, false);
            return true;
          } catch (error) {
            console.warn(`Failed to load ${asset.name}:`, error);
            markProgress(asset.name, true);
            return false;
          }
        });
        
        await Promise.all(preloadPromises);

        console.log('Phase 2: Initializing game systems...');
        
        await initializeGameSystems();

        console.log('VERIFYING CRITICAL ASSETS ARE CACHED...');

        if (!window.gameAssets?.shipModel || !window.gameAssets?.loaded) {
          console.error('CRITICAL ERROR: Ship model not properly cached!');
          console.log('Asset cache state:', {
            gameAssets: !!window.gameAssets,
            shipModel: !!window.gameAssets?.shipModel,
            loaded: !!window.gameAssets?.loaded,
            hullTexture: !!window.gameAssets?.hullTexture
          });
          throw new Error('Ship model not properly cached');
        }
        
        if (!window.hyperVideoElement || window.hyperVideoElement.readyState < 3) {
          console.error('CRITICAL ERROR: Video not ready!');
          throw new Error('Video not ready');
        }
        
        console.log('GLOBAL ASSET PRELOAD COMPLETE - ALL CRITICAL ASSETS VERIFIED!');
        window.globalAssetsReady = true;
        window.gameAssetsReady = true;
        setPreloadStatus('complete');
        
        window.dispatchEvent(new CustomEvent('globalAssetsReady', {
          detail: { loadedAssets: completedAssets, totalAssets: criticalAssets.length }
        }));
        
      } catch (error) {
        console.error('Global asset preload failed:', error);
        setPreloadStatus('error');

        window.globalAssetsReady = true;
        window.gameAssetsReady = true;
      } finally {

        window.globalAssetsPreloading = false;
      }
    };

    const timer = setTimeout(startGlobalPreload, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const preloadAsset = async (asset) => {
    switch (asset.type) {
      case 'video':
        return preloadVideo(asset.src);
      case 'model':
        return preloadModel(asset.src);
      case 'texture':
        return preloadTexture(asset.src);
      case 'audio':
        return preloadAudio(asset.src);
      case 'hdr':
        return preloadHDR(asset.src);
      default:
        throw new Error(`Unknown asset type: ${asset.type}`);
    }
  };

  const preloadVideoElement = ({ src, timeoutMs = 15000, warmDecode = false }) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = src;
      video.preload = 'auto';
      video.muted = true;
      video.crossOrigin = 'anonymous';
      video.playsInline = true;

      const timeout = setTimeout(() => {
        reject(new Error(`Video load timeout for ${src}`));
      }, timeoutMs);

      const finalize = async () => {
        clearTimeout(timeout);

        if (warmDecode) {

          try {
            await video.play();
            await new Promise((resolveWarm) => setTimeout(resolveWarm, 80));
            video.pause();
            video.currentTime = 0;
          } catch (warmError) {
            console.warn('Hyper video warm decode failed (continuing):', warmError);
          }
        }

        resolve(video);
      };

      video.addEventListener('canplaythrough', finalize, { once: true });
      video.addEventListener('error', (e) => {
        clearTimeout(timeout);
        reject(e);
      }, { once: true });
      video.load();
    });
  };

  const preloadHyperVideo = async (src) => {
    if (window.hyperVideoElement && window.hyperVideoElement.readyState >= 3) {
      return window.hyperVideoElement;
    }

    let resolvedSrc = src;
    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 25000);

    try {

      const response = await fetch(src, {
        cache: 'force-cache',
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`Hyper video fetch failed: ${response.status}`);
      }

      const blob = await response.blob();
      if (window.hyperVideoBlobUrl && window.hyperVideoBlobUrl !== src) {
        URL.revokeObjectURL(window.hyperVideoBlobUrl);
      }
      window.hyperVideoBlobUrl = URL.createObjectURL(blob);
      window.hyperVideoBlobBytes = blob.size;
      resolvedSrc = window.hyperVideoBlobUrl;
      console.log(`Hyper video fully buffered: ${(blob.size / (1024 * 1024)).toFixed(1)} MB`);
    } catch (error) {
      console.warn('Hyper video full-buffer preload failed, using normal stream preload:', error);
    } finally {
      clearTimeout(fetchTimeout);
    }

    const video = await preloadVideoElement({
      src: resolvedSrc,
      timeoutMs: 25000,
      warmDecode: true
    });
    window.hyperVideoElement = video;
    window.gameTransitionVideo = video;
    return video;
  };

  const preloadVideo = async (src) => {
    if (src.includes('hyper.mp4')) {
      return preloadHyperVideo(src);
    }

    return preloadVideoElement({ src, timeoutMs: 15000, warmDecode: false });
  };

  const preloadTexture = async (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const timeout = setTimeout(() => {
        reject(new Error('Texture load timeout'));
      }, 10000);
      
      img.onload = async () => {
        clearTimeout(timeout);
        
        try {
          const THREE = await import('three');

          const texture = new THREE.Texture(img);
          texture.needsUpdate = true;
          
          if (!window.globalPreloadedTextures) window.globalPreloadedTextures = new Map();
          
          if (src.includes('hull_baseColor.png')) {
            texture.colorSpace = THREE.SRGBColorSpace;

            if (!window.gameAssets) window.gameAssets = {};
            window.gameAssets.hullTexture = texture;
          } else if (src.includes('/textures/') && src.includes('damage.png')) {
            texture.transparent = true;
            texture.alphaTest = 0.1;

            if (!window.globalCrackTextures) window.globalCrackTextures = [];
            
            const damageMatch = src.match(/(\d+)damage\.png/);
            if (damageMatch) {
              const damageLevel = parseInt(damageMatch[1]);
              const index = damageLevel - 1;
              if (index >= 0 && index < 5) {
                window.globalCrackTextures[index] = texture;
                console.log(`Cached damage level ${damageLevel} at index ${index}`);
              }
            }
          }

          window.globalPreloadedTextures.set(src, texture);
          
          console.log(`WebGL texture cached: ${src.split('/').pop()}`);
          
        } catch (error) {
          console.warn('Failed to create THREE.js texture:', error);
        }
        
        resolve(img);
      };
      
      img.onerror = (e) => {
        clearTimeout(timeout);
        reject(e);
      };
      
      img.src = src;
    });
  };

  const preloadModel = async (src) => {
    try {

      const THREE = await import('three');
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader');
      const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader');

      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
      
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error(`MODEL TIMEOUT: ${src}`);
          reject(new Error('Model load timeout'));
        }, 20000);
        
        loader.load(
          src,
          (gltf) => {
            clearTimeout(timeout);

            if (!window.gameAssets) window.gameAssets = {};

            if (src.includes('Space Fighter Jet.glb')) {
              window.spaceshipModel = gltf;
              window.gameAssets.shipModel = gltf;
              window.gameAssets.loaded = true;
            } else if (src.includes('astra_cockpit.glb')) {
              window.preloadedCockpitModel = gltf;
              console.log('Cockpit model cached for fast access');
            }

            resolve(gltf);
          },
          undefined,
          (error) => {
            console.error(`MODEL LOAD ERROR: ${src}`, error);
            clearTimeout(timeout);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error(`MODEL IMPORT ERROR: ${src}`, error);
      throw new Error(`Failed to load Three.js for model: ${error.message}`);
    }
  };

  const initializeGameSystems = async () => {
    try {

      const { assetPreloader } = await import('../game/systems/AssetPreloader.js');

      console.log('Game asset caches initialized');
      
      window.gameAssetCaches = assetPreloader.caches;
      window.gameAssetPools = assetPreloader.pools;

      if (!window.gameAssets) window.gameAssets = {};
      window.gameAssets.preloader = assetPreloader;

      let attempts = 0;
      while (!window.gameAssets.shipModel && attempts < 50) {
        console.log(`Waiting for ship model to be cached... (attempt ${attempts + 1})`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!window.gameAssets.shipModel) {
        throw new Error('Ship model failed to cache properly');
      }
      
      console.log('All game systems and assets verified');
      
    } catch (error) {
      console.warn('Game systems initialization failed:', error);
      throw error;
    }
  };

  const preloadAudio = (src) => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.src = src;
      audio.preload = 'auto';
      
      const timeout = setTimeout(() => {
        reject(new Error(`Audio load timeout: ${src}`));
      }, 15000);
      
      audio.oncanplaythrough = () => {
        clearTimeout(timeout);

        if (!window.gameAudioCache) window.gameAudioCache = new Map();
        window.gameAudioCache.set(src, audio);
        resolve(audio);
      };
      
      audio.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Failed to load audio: ${src}`));
      };
      
      audio.load();
    });
  };

  const preloadHDR = async (src) => {
    try {
      const { hdrPreloader } = await import('../game/components/HDRPreloader');

      await hdrPreloader.preloadHDR(src);
      
      return src;
    } catch (error) {
      throw new Error(`HDR preload failed: ${src} - ${error.message}`);
    }
  };
};

window.getPreloadedTexture = (src) => {
  const texture = window.globalPreloadedTextures?.get(src);
  if (texture) {
    console.log(`Using preloaded WebGL texture: ${src.split('/').pop()}`);
    return texture;
  } else {
    console.warn(`Texture not preloaded: ${src.split('/').pop()} - Will create new (slow)`);
    return null;
  }
};

window.disposeGlobalAssets = () => {
  console.log('Starting global asset disposal...');
  
  if (window.globalPreloadedTextures) {
    window.globalPreloadedTextures.forEach((texture, src) => {
      if (texture && texture.dispose) {
        texture.dispose();
        console.log(`Disposed texture: ${src.split('/').pop()}`);
      }
    });
    window.globalPreloadedTextures.clear();
  }
  
  if (window.gameAssets?.preloader?.dispose) {
    window.gameAssets.preloader.dispose();
  }
  
  if (window.gameAudioCache) {
    window.gameAudioCache.forEach((audio, src) => {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        audio.load();
      } catch (e) {
        console.warn(`Failed to dispose audio: ${src}`);
      }
    });
    window.gameAudioCache.clear();
  }
  
  if (window.spaceshipModel) {
    try {
      window.spaceshipModel.scene?.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    } catch (e) {
      console.warn('Failed to dispose spaceship model:', e);
    }
    window.spaceshipModel = null;
  }
  
  if (window.hyperVideoBlobUrl) {
    URL.revokeObjectURL(window.hyperVideoBlobUrl);
    window.hyperVideoBlobUrl = null;
  }
  
  window.globalAssetsReady = false;
  window.gameAssetsReady = false;
  
  console.log('Global asset disposal complete');
};

export default GlobalAssetPreloader;
