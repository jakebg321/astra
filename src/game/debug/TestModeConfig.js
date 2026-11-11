

export const DEFAULT_TEST_CONFIG = {

  movement: true,
  rotation: true,
  momentum: true,

  crosshair: true,
  planets: true,
  skybox: true,
  grid: true,
  particles: true,
  trails: true,

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
  shadows: true,
  postProcessing: false,

  debugTimers: true,
  collisionVisuals: false,
  networkDebug: false,
};

class TestModeManager {
  constructor() {
    this.config = { ...DEFAULT_TEST_CONFIG };
    this.performanceBaseline = null;
    this.componentImpact = {};

    this.loadConfig();

    window.testMode = this;
  }

  loadConfig() {
    try {
      const savedConfig = localStorage.getItem('astra_test_config');
      if (savedConfig) {
        this.config = { ...DEFAULT_TEST_CONFIG, ...JSON.parse(savedConfig) };
        console.log('Test config loaded:', this.config);
      }
    } catch (error) {
      console.warn('Failed to load test config:', error);
    }
  }

  saveConfig() {
    try {
      localStorage.setItem('astra_test_config', JSON.stringify(this.config));
      console.log('Test config saved');
    } catch (error) {
      console.warn('Failed to save test config:', error);
    }
  }

  toggle(componentName, value = null) {
    if (!(componentName in this.config)) {
      console.warn(`Unknown component: ${componentName}`);
      return false;
    }

    if (['movement', 'networking'].includes(componentName)) {
      console.warn(`Component ${componentName} cannot be disabled`);
      return false;
    }

    const oldValue = this.config[componentName];
    this.config[componentName] = value !== null ? value : !oldValue;
    
    console.log(`${componentName}: ${oldValue} → ${this.config[componentName]}`);

    this.saveConfig();

    if (window.gameIsRunning) {
      console.log('Configuration changed - reload game to apply changes');
    }

    return this.config[componentName];
  }

  isEnabled(componentName) {
    return this.config[componentName] === true;
  }

  getComponentImpact(componentName) {
    return this.componentImpact[componentName] || { fps: 0, frameTime: 0 };
  }

  startPerformanceMeasurement() {
    if (!window.testMode.isEnabled('debugTimers')) return;
    
    this.performanceBaseline = {
      fps: this.getCurrentFPS(),
      frameTime: this.getCurrentFrameTime(),
      timestamp: performance.now()
    };
    console.log('Performance baseline captured:', this.performanceBaseline);
  }

  measureComponentImpact(componentName, beforeFPS, afterFPS) {
    if (!this.performanceBaseline) return;

    const impact = {
      fps: afterFPS - beforeFPS,
      frameTime: (1000 / afterFPS) - (1000 / beforeFPS),
      percentage: ((afterFPS - beforeFPS) / beforeFPS) * 100
    };

    this.componentImpact[componentName] = impact;
    
    console.log(`${componentName} impact:`, {
      fps: `${impact.fps > 0 ? '+' : ''}${impact.fps.toFixed(1)}`,
      frameTime: `${impact.frameTime > 0 ? '+' : ''}${impact.frameTime.toFixed(2)}ms`,
      percentage: `${impact.percentage > 0 ? '+' : ''}${impact.percentage.toFixed(1)}%`
    });
  }

  getCurrentFPS() {
    try {
      const allDivs = Array.from(document.querySelectorAll('div'));
      const exactFpsDiv = allDivs.find(div => {
        return div.textContent && div.textContent.match(/^FPS\d{1,3}$/);
      });
      
      if (exactFpsDiv) {
        const fpsMatch = exactFpsDiv.textContent.match(/FPS(\d{1,3})/);
        if (fpsMatch) {
          return parseInt(fpsMatch[1]);
        }
      }
    } catch (error) {
      console.warn('Failed to get FPS:', error);
    }
    return 60;
  }

  getCurrentFrameTime() {
    const fps = this.getCurrentFPS();
    return fps > 0 ? (1000 / fps) : 16.67;
  }

  resetToDefaults() {
    this.config = { ...DEFAULT_TEST_CONFIG };
    this.saveConfig();
    console.log('Reset to default configuration');
  }

  getConfigSummary() {
    const enabled = Object.entries(this.config).filter(([_, value]) => value).length;
    const total = Object.keys(this.config).length;
    return {
      enabled,
      total,
      percentage: Math.round((enabled / total) * 100),
      config: { ...this.config }
    };
  }

  exportConfig() {
    const configStr = JSON.stringify(this.config, null, 2);
    console.log('Export configuration:');
    console.log(configStr);
    return configStr;
  }

  importConfig(configStr) {
    try {
      const newConfig = JSON.parse(configStr);
      this.config = { ...DEFAULT_TEST_CONFIG, ...newConfig };
      this.saveConfig();
      console.log('Configuration imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  }
}

export const testModeManager = new TestModeManager();

export const isTestModeEnabled = (component) => testModeManager.isEnabled(component);
export const toggleTestMode = (component, value) => testModeManager.toggle(component, value);

console.log('Test Mode Configuration System initialized');
console.log('Usage: window.testMode.toggle("crosshair") or testMode.isEnabled("planets")');

if (typeof window !== 'undefined') {

  window.isTestModeActive = window.isTestModeActive || false;
  
  window.enableTestMode = () => {
    window.isTestModeActive = true;
    console.log('Test mode ENABLED! Auto-test controls will appear on game over screen.');
    return 'Test mode active';
  };
  
  window.disableTestMode = () => {
    window.isTestModeActive = false;
    console.log('Test mode DISABLED. Normal game mode.');
    return 'Test mode disabled';
  };
  
  console.log('Quick commands: enableTestMode(), disableTestMode()');
  console.log('isTestModeActive initialized:', window.isTestModeActive);
}