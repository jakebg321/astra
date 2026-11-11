

class GameSettingsService {
  constructor() {
    this.userId = null;
    this.syncEnabled = false;
  }

  init(userId = null) {
    this.userId = userId;
    this.syncEnabled = !!userId;
    
    if (this.syncEnabled) {

      console.log('Settings sync enabled for user:', userId);
    }
  }

  get(key, defaultValue = null) {
    const value = localStorage.getItem(key);
    if (value === null) {
      return defaultValue !== null ? defaultValue : this.getDefaultValue(key);
    }

    try {
      return JSON.parse(value);
    } catch {

      if (value === 'true') return true;
      if (value === 'false') return false;

      const num = Number(value);
      if (!isNaN(num) && value !== '') return num;
      return value;
    }
  }

  set(key, value) {
    if (typeof value === 'object') {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      localStorage.setItem(key, String(value));
    }
    
    if (this.syncEnabled) {
      this.queueSync(key, value);
    }
  }

  getMultiple(keys) {
    const settings = {};
    keys.forEach(key => {
      settings[key] = this.get(key);
    });
    return settings;
  }

  setMultiple(settings) {
    Object.entries(settings).forEach(([key, value]) => {
      this.set(key, value);
    });
  }

  getAllSettings() {
    const settingKeys = [

      'mouseSensitivity', 'invertY', 'noRollStrafe', 'visualRollOnly',

      'cameraMode', 'cameraDistance', 'cameraMomentum', 'cameraSmoothing',
      'boostCameraDistance', 'boostCameraSmoothing', 'speedBasedCamera',
      'cameraDistanceMin', 'cameraDistanceMax', 'cameraMinDistance', 'cameraMaxDistance',

      'astra_performance_settings', 'targetFPS',

      'bulletStyle', 'tempCockpitMode', 'globalCockpitMode',

      'showCockpitRadar', 'enemyIndicator', 'showFPS', 'showDevSettings', 'showDebug',

      'radarCalibrations', 'enemyIndicatorParams', 'cockpitTransform',

      'astra_test_config'
    ];
    
    return this.getMultiple(settingKeys);
  }

  getDefaultValue(key) {
    const defaults = {

      mouseSensitivity: 0.002,
      invertY: false,
      noRollStrafe: false,
      visualRollOnly: false,
      universalSpeedMultiplier: 1.0,

      cameraMode: 'simple',
      cameraDistance: 12,
      cameraMomentum: false,
      cameraSmoothing: 0.15,
      boostCameraDistance: 1.3,
      boostCameraSmoothing: 0.20,
      speedBasedCamera: false,
      cameraDistanceMin: 0.8,
      cameraDistanceMax: 1.3,
      cameraMinDistance: 15,
      cameraMaxDistance: 40,

      astra_performance_settings: {
        trails: true,
        effects: true,
        shadows: true,
        quality: 'High',
        adaptiveThrottling: false,
        optimizedFor: 'Balanced',
        pixelRatio: 1.0
      },
      targetFPS: 'unlimited',

      bulletStyle: 2,
      tempCockpitMode: false,
      globalCockpitMode: false,

      showCockpitRadar: true,
      enemyIndicator: true,
      showFPS: false,
      showDevSettings: false,
      showDebug: false,

      astra_test_config: {
        movement: true,
        rotation: true,
        momentum: true,
        crosshair: true,
        planets: true,
        skybox: true,
        grid: true,
        particles: true,
        bullets: true,
        collision: true,
        boundaries: true,
        boost: true,
        weaponHeat: true,
        hud: true,
        enemyIndicators: true,
        performanceMonitor: true,
        multiplayer: true,
        networking: true,
        interpolation: true,
        lodSystem: false,
        postProcessing: false,
        debugTimers: true,
        collisionVisuals: false,
        networkDebug: false
      }
    };
    
    return defaults[key];
  }

  queueSync(key, value) {

    console.log(`Queued sync for ${key}:`, value);
  }

  async syncToServer() {
    if (!this.syncEnabled || !this.userId) {
      console.warn('Cannot sync: no user ID');
      return false;
    }

    const settings = this.getAllSettings();
    console.log('Would sync settings to server:', settings);
    return true;
  }

  async loadFromServer() {
    if (!this.syncEnabled || !this.userId) {
      console.warn('Cannot load: no user ID');
      return false;
    }

    console.log('Would load settings from server for user:', this.userId);
    return true;
  }

  clearUserSettings() {

    const keysToRemove = [
      'tempCockpitMode', 'globalCockpitMode', 'bulletStyle',
      'radarCalibrations', 'enemyIndicatorParams', 'cockpitTransform'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    this.userId = null;
    this.syncEnabled = false;
  }

  exportSettings() {
    return this.getAllSettings();
  }

  importSettings(settings) {
    this.setMultiple(settings);
  }
}

const gameSettingsService = new GameSettingsService();

if (typeof window !== 'undefined') {
  window.gameSettingsService = gameSettingsService;
}

export default gameSettingsService;