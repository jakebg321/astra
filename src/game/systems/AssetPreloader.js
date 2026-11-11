
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

const globalTextureLoader = new THREE.TextureLoader();

class AssetPreloader {
  constructor() {
    this.assets = {
      models: {},
      textures: {},
      geometries: {},
      materials: {},
      shaders: {},
      lookupTables: {},
      video: null
    };

    this.pools = {
      bullets: [],
      hitMarkers: [],
      particles: []
    };

    this.caches = {
      rotationVectors: new Map(),
      distanceGrid: null,
      boundaryFlags: new Map(),
      commonVectors: new Map()
    };

    this.loadingProgress = 0;
    this.isPreloading = false;
    this.preloadComplete = false;

    this.sharedMaterials = {
      bullet: null,
      ship: null,
      planet: null,
      hitMarker: null,
      boost: null
    };

    if (typeof window !== 'undefined') {
      if (window.globalAssetsReady || window.gameAssetsReady) {
        this.useGlobalAssets();
      } else if (window.globalAssetsPreloading) {
        this.waitForGlobalPreload();
      } else {
        this.startPreload();
      }
    }
  }

  waitForGlobalPreload() {
    if (window.globalAssetsReady || window.gameAssetsReady) {
      this.useGlobalAssets();
      return;
    }

    let completed = false;

    const cleanup = () => {
      window.removeEventListener('globalAssetsReady', handleReady);
      if (pollId) clearInterval(pollId);
      if (timeoutId) clearTimeout(timeoutId);
    };

    const finishWithGlobal = () => {
      if (completed) return;
      completed = true;
      cleanup();
      this.useGlobalAssets();
    };

    const fallbackToLocal = () => {
      if (completed) return;
      completed = true;
      cleanup();
      console.warn('AssetPreloader: Global preload wait timed out, starting local fallback preload');
      this.startPreload();
    };

    const handleReady = () => {
      finishWithGlobal();
    };

    const pollId = setInterval(() => {
      if (window.globalAssetsReady || window.gameAssetsReady) {
        finishWithGlobal();
      }
    }, 250);

    const FALLBACK_TIMEOUT_MS = 60000;
    const timeoutId = setTimeout(() => {
      if (window.globalAssetsReady || window.gameAssetsReady) {
        finishWithGlobal();
      } else if (window.globalAssetsPreloading) {

        console.warn('AssetPreloader: Global preload still active after timeout, continuing to wait');
      } else {
        fallbackToLocal();
      }
    }, FALLBACK_TIMEOUT_MS);

    window.addEventListener('globalAssetsReady', handleReady);
  }

  async startPreload() {
    if (this.isPreloading || this.preloadComplete) return;

    if (window.globalAssetsReady) {
      this.useGlobalAssets();
      return;
    }

    this.isPreloading = true;

    try {

      await Promise.all([
        this.loadThreeJS(),
        this.loadShipModel(),
        this.loadEssentialTextures(),
        this.loadTransitionVideo()
      ]);

      const phase2Tasks = [
        this.createGeometryPools(),
        this.warmupShaders(),
        this.generatePlanetPaths()
      ];
      const quality = window.performanceManager?.getSettings?.().quality || 'High';
      if (quality === 'High') {
        phase2Tasks.unshift(this.generateRotationLUTs());
      }

      await Promise.all(phase2Tasks);

      await Promise.all([
        this.loadPlanetTextures(),
        this.createVectorCaches(),
        this.generateDistanceGrid()
      ]);

      this.preloadComplete = true;
      this.isPreloading = false;

      window.gameAssetsReady = true;
      window.gameAssetCaches = this.caches;
      window.gameAssetPools = this.pools;

      window.gameAssets = {
        preloader: this,
        loaded: true,
        shipModel: this.assets.models.ship,
        hullTexture: this.assets.textures.hull,

        boostTextures: {}
      };

      window.spaceshipModel = this.assets.models.ship;

    } catch (error) {
      console.error('Preload failed:', error);
      this.isPreloading = false;
      throw error;
    }
  }

  useGlobalAssets() {

    if (window.hyperVideoElement) {
      this.assets.transitionVideo = window.hyperVideoElement;
      window.gameTransitionVideo = window.hyperVideoElement;
    }

    if (window.spaceshipModel) {
      this.assets.models.ship = window.spaceshipModel;
    }

    this.preloadComplete = true;
    this.isPreloading = false;

    window.gameAssetsReady = true;
    window.gameAssetCaches = this.caches;
    window.gameAssetPools = this.pools;

      window.gameAssets = {
        preloader: this,
        loaded: true,
        shipModel: this.assets.models.ship || window.spaceshipModel,
        hullTexture: this.assets.textures.hull || window.gameAssets?.hullTexture,
        boostTextures: window.gameAssets?.boostTextures || {}
      };

  }

  async loadThreeJS() {

    this.updateProgress(10);
    return Promise.resolve();
  }

  async loadShipModel() {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
    loader.setDRACOLoader(dracoLoader);

    return new Promise((resolve, reject) => {
      loader.load(
        '/Space Fighter Jet.glb',
        (gltf) => {
          this.assets.models.ship = gltf;
          this.updateProgress(30);
          resolve(gltf);
        },
        (progress) => {
          if (progress.total > 0) {
            const percent = 10 + (progress.loaded / progress.total) * 20;
            this.updateProgress(percent);
          }
        },
        reject
      );
    });
  }

  async loadEssentialTextures() {

    const textures = [
      { name: 'hull', path: '/files/assets/228743307/1/hull_baseColor.png' }
    ];

    const promises = textures.map(({ name, path }) =>
      new Promise((resolve) => {
        globalTextureLoader.load(
          path,
          (texture) => {

            if (texture?.image) {
              const { width, height } = texture.image;
              if (width > 2048 || height > 2048) {
                console.warn(`Oversized texture detected (${width}x${height}): ${name} → ${path}`);
              }
            }
            this.assets.textures[name] = texture;
            resolve(texture);
          },
          undefined,
          () => {
            console.warn(`Failed to load ${name} texture`);
            resolve(null);
          }
        );
      })
    );

    await Promise.all(promises);
    this.updateProgress(40);
  }

  async generateRotationLUTs() {
    const startTime = performance.now();

    for (let yawDeg = 0; yawDeg < 360; yawDeg++) {
      for (let pitchDeg = -90; pitchDeg <= 90; pitchDeg++) {
        const key = `${pitchDeg},${yawDeg}`;
        const pitch = pitchDeg * Math.PI / 180;
        const yaw = yawDeg * Math.PI / 180;

        const sinYaw = Math.sin(yaw);
        const cosYaw = Math.cos(yaw);
        const sinPitch = Math.sin(pitch);
        const cosPitch = Math.cos(pitch);

        this.caches.rotationVectors.set(key, {
          forward: new THREE.Vector3(
            -sinYaw * cosPitch,
            sinPitch,
            -cosYaw * cosPitch
          ),
          right: new THREE.Vector3(
            -Math.sin(yaw - Math.PI / 2),
            0,
            -Math.cos(yaw - Math.PI / 2)
          ),
          up: new THREE.Vector3(0, 1, 0),

          sin: { yaw: sinYaw, pitch: sinPitch },
          cos: { yaw: cosYaw, pitch: cosPitch }
        });
      }
    }

    const elapsed = performance.now() - startTime;
    this.updateProgress(60);
  }

  async createGeometryPools() {

    const bulletGeometry = new THREE.CylinderGeometry(0.08, 0.08, 4, 8);
    const bulletMaterial = this.sharedMaterials.bullet || new THREE.MeshBasicMaterial({
      color: '#ff4444',
      transparent: true,
      opacity: 0.9
    });

    for (let i = 0; i < 300; i++) {
      const mesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
      mesh.visible = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.matrixAutoUpdate = false;
      this.pools.bullets.push(mesh);
    }

    const hitMarkerGeometry = new THREE.BoxGeometry(1, 1, 1);
    const hitMarkerMaterial = this.sharedMaterials.hitMarker || new THREE.MeshBasicMaterial({
      color: 'red',
      transparent: true
    });

    for (let i = 0; i < 20; i++) {
      const mesh = new THREE.Mesh(hitMarkerGeometry, hitMarkerMaterial.clone());
      mesh.visible = false;
      this.pools.hitMarkers.push(mesh);
    }

    this.pools.playerShips = [];

    for (let i = 0; i < 20; i++) {
      const shipGroup = new THREE.Group();
      shipGroup.visible = false;
      shipGroup.userData = {
        inUse: false,
        playerId: null
      };

      const shipGeometry = new THREE.ConeGeometry(1, 3, 8);
      const shipMaterial = this.sharedMaterials.ship || new THREE.MeshBasicMaterial({
        color: '#888888'
      });

      const shipMesh = new THREE.Mesh(shipGeometry, shipMaterial);
      shipMesh.rotation.x = Math.PI / 2;
      shipGroup.add(shipMesh);

      this.pools.playerShips.push(shipGroup);
    }

    this.updateProgress(70);
  }

  async warmupShaders() {

    try {

      if (!this.sharedMaterials.bullet) {
        this.sharedMaterials.bullet = new THREE.MeshBasicMaterial({
          color: '#ff4444',
          transparent: true,
          opacity: 0.9
        });

        this.sharedMaterials.ship = new THREE.MeshBasicMaterial({
          color: '#888888'
        });

        this.sharedMaterials.planet = new THREE.MeshBasicMaterial({
          color: '#8a2be2'
        });

        this.sharedMaterials.hitMarker = new THREE.MeshBasicMaterial({
          color: '#ff0000',
          transparent: true,
          opacity: 0.8
        });

        this.sharedMaterials.boost = new THREE.MeshBasicMaterial({
          color: '#ff6600',
          transparent: true,
          opacity: 0.8
        });
      }

      this.assets.materials.bullet = this.sharedMaterials.bullet;
      this.assets.materials.ship = this.sharedMaterials.ship;
      this.assets.materials.planet = this.sharedMaterials.planet;
      this.assets.materials.hitMarker = this.sharedMaterials.hitMarker;
      this.assets.materials.boost = this.sharedMaterials.boost;

    } catch (error) {
      console.warn('Material creation failed:', error);
    }

    this.updateProgress(80);
  }

  async generatePlanetPaths() {

    const planets = [
      { name: 'Mercury', distance: 150, speed: 0.00048 },
      { name: 'Venus', distance: 200, speed: 0.00035 },
      { name: 'Earth', distance: 280, speed: 0.00024 },
      { name: 'Mars', distance: 380, speed: 0.00018 },
      { name: 'Jupiter', distance: 650, speed: 0.00013 },
      { name: 'Saturn', distance: 700, speed: 0.000078 },
      { name: 'Uranus', distance: 600, speed: 0.000054 }
    ];

    this.assets.planetPaths = {};

    planets.forEach(planet => {
      const positions = [];
      const steps = 3600;

      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        positions.push({
          x: Math.cos(angle) * planet.distance,
          z: Math.sin(angle) * planet.distance
        });
      }

      this.assets.planetPaths[planet.name] = {
        positions: positions,
        speed: planet.speed,
        steps: steps
      };
    });

    this.updateProgress(85);
  }

  async loadPlanetTextures() {

    const planetTextures = [
      'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus'
    ];

    const promises = planetTextures.map(planet =>
      new Promise((resolve) => {
        globalTextureLoader.load(
          `/textures/planets/${planet}_baseColor.jpeg`,
          (texture) => {
            if (texture?.image) {
              const { width, height } = texture.image;
              if (width > 2048 || height > 2048) {
                console.warn(`Oversized planet texture (${width}x${height}): ${planet}`);
              }
            }
            this.assets.textures[planet] = texture;
            resolve(texture);
          },
          undefined,
          () => resolve(null)
        );
      })
    );

    await Promise.all(promises);
    this.updateProgress(90);
  }

  async createVectorCaches() {

    const commonDirections = [
      { name: 'forward', vec: new THREE.Vector3(0, 0, -1) },
      { name: 'back', vec: new THREE.Vector3(0, 0, 1) },
      { name: 'left', vec: new THREE.Vector3(-1, 0, 0) },
      { name: 'right', vec: new THREE.Vector3(1, 0, 0) },
      { name: 'up', vec: new THREE.Vector3(0, 1, 0) },
      { name: 'down', vec: new THREE.Vector3(0, -1, 0) }
    ];

    this.caches.commonVectors = new Map();
    commonDirections.forEach(({ name, vec }) => {
      this.caches.commonVectors.set(name, vec);
    });

    this.updateProgress(95);
  }

  async generateDistanceGrid() {

    const gridSize = 50;
    const worldSize = { x: 1800, y: 1200, z: 1800 };
    this.caches.distanceGrid = new Float32Array(gridSize * gridSize * gridSize);

    this.updateProgress(100);
  }

  async loadTransitionVideo() {

    try {
      if (window.hyperVideoElement?.readyState >= 3) {
        this.assets.transitionVideo = window.hyperVideoElement;
        window.gameTransitionVideo = window.hyperVideoElement;
        this.updateProgress(85);
        return;
      }

      const video = document.createElement('video');
      const preferredSrc = window.hyperVideoBlobUrl || '/hyper.mp4';
      video.src = preferredSrc;
      video.preload = 'auto';
      video.muted = true;
      video.crossOrigin = 'anonymous';

      const videoLoaded = new Promise((resolve, reject) => {

        const timeout = setTimeout(() => {
          console.warn('Video loading timeout - continuing without video');
          resolve(null);
        }, 10000);

        video.addEventListener('canplaythrough', () => {
          clearTimeout(timeout);
          resolve(video);
        }, { once: true });

        video.addEventListener('error', (e) => {
          clearTimeout(timeout);
          console.warn('Transition video failed to load, continuing without it:', e);
          resolve(null);
        }, { once: true });

        video.addEventListener('progress', () => {
          if (video.buffered.length > 0) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            const duration = video.duration;
            if (duration > 0) {
              const percent = (bufferedEnd / duration) * 100;
            }
          }
        });
      });

      video.load();

      const loadedVideo = await videoLoaded;

      if (loadedVideo) {
        this.assets.transitionVideo = loadedVideo;
        window.gameTransitionVideo = this.assets.transitionVideo;
        window.hyperVideoElement = this.assets.transitionVideo;
      } else {
        console.warn('No video available - transitions will work without video');
        window.gameTransitionVideo = null;
        window.hyperVideoElement = null;
      }

      this.updateProgress(85);

    } catch (error) {
      console.warn('Transition video loading failed, continuing without it:', error);

      window.gameTransitionVideo = null;
      window.hyperVideoElement = null;
    }
  }

  getPlayerShipFromPool() {
    const ship = this.pools.playerShips.find(s => !s.userData.inUse);
    if (ship) {
      ship.userData.inUse = true;
      ship.visible = true;
      return ship;
    }
    return null;
  }

  returnPlayerShipToPool(ship) {
    if (ship && this.pools.playerShips.includes(ship)) {
      ship.visible = false;
      ship.position.set(0, 0, 0);
      ship.rotation.set(0, 0, 0);
      ship.userData.inUse = false;
      ship.userData.playerId = null;
    }
  }

  updateProgress(percent) {
    this.loadingProgress = percent;

    window.dispatchEvent(new CustomEvent('assetLoadProgress', {
      detail: { progress: percent }
    }));
  }

  getRotationVectors(pitchRad, yawRad) {
    const pitchDeg = Math.round(pitchRad * 180 / Math.PI);
    const yawDeg = Math.round(yawRad * 180 / Math.PI) % 360;
    const key = `${pitchDeg},${yawDeg}`;

    return this.caches.rotationVectors.get(key) || this.computeRotationVectors(pitchRad, yawRad);
  }

  computeRotationVectors(pitch, yaw) {

    return {
      forward: new THREE.Vector3(
        -Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch)
      ),
      right: new THREE.Vector3(
        -Math.sin(yaw - Math.PI / 2),
        0,
        -Math.cos(yaw - Math.PI / 2)
      ),
      up: new THREE.Vector3(0, 1, 0)
    };
  }

  getBulletFromPool() {
    return this.pools.bullets.find(b => !b.visible) || null;
  }

  returnBulletToPool(bullet) {
    bullet.visible = false;
    bullet.position.set(0, 0, 0);
    bullet.rotation.set(0, 0, 0);
  }

  getSharedMaterial(type) {
    return this.sharedMaterials[type] || this.assets.materials[type];
  }

  dispose() {

    Object.values(this.assets.textures).forEach(texture => {
      if (texture && texture.dispose) texture.dispose();
    });

    Object.values(this.sharedMaterials).forEach(material => {
      if (material && material.dispose) material.dispose();
    });

    Object.values(this.assets.geometries).forEach(geometry => {
      if (geometry && geometry.dispose) geometry.dispose();
    });

  }
}

const assetPreloader = new AssetPreloader();

export { assetPreloader, AssetPreloader };
export default assetPreloader;
