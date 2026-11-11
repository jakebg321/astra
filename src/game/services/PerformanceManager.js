class PerformanceManager {
  constructor() {
    this.settings = this.loadSettings();
    this.applied = false;

    if (!localStorage.getItem('astra_performance_settings')) {
      this.autoDetectGPUPerformance();
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('astra_performance_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        console.log('Loaded performance settings:', settings);
        return settings;
      }
    } catch (error) {
      console.warn('Failed to load performance settings:', error);
    }

    return {
      trails: true,
      effects: true,
      shadows: true,
      quality: 'High',
      adaptiveThrottling: false,
      optimizedFor: 'Maximum'
    };
  }

  saveSettings() {
    try {
      localStorage.setItem('astra_performance_settings', JSON.stringify(this.settings));
      console.log('Performance settings saved');
    } catch (error) {
      console.warn('Failed to save performance settings:', error);
    }
  }

  applySettings() {
    if (this.applied) return;

    console.log('APPLYING PERFORMANCE SETTINGS:', this.settings);

    window.gamePerformanceSettings = this.settings;

    window.PERFORMANCE_TRAILS_ENABLED = this.settings.trails;
    window.PERFORMANCE_EFFECTS_ENABLED = this.settings.effects;
    window.PERFORMANCE_SHADOWS_ENABLED = this.settings.shadows;
    window.PERFORMANCE_QUALITY_LEVEL = this.settings.quality;
    window.PERFORMANCE_ADAPTIVE_THROTTLING = this.settings.adaptiveThrottling;

    document.documentElement.style.setProperty('--perf-quality-scale',
      this.settings.quality === 'Low' ? '0.7' :
      this.settings.quality === 'Medium' ? '0.85' : '1.0'
    );

    if (window.gameRenderer) {
      const renderer = window.gameRenderer;

      if (this.settings.quality === 'Low') {
        renderer.setPixelRatio(Math.min(1, window.devicePixelRatio * 0.7));
        renderer.shadowMap.enabled = false;
      } else if (this.settings.quality === 'Medium') {
        renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio * 0.85));
        renderer.shadowMap.enabled = this.settings.shadows;
      } else {
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = this.settings.shadows;
      }

      console.log('Applied renderer settings:', {
        pixelRatio: renderer.getPixelRatio(),
        shadows: renderer.shadowMap.enabled,
        quality: this.settings.quality
      });




    }

    this.applied = true;

    window.dispatchEvent(new CustomEvent('performanceSettingsApplied', {
      detail: this.settings
    }));
  }

  getSettings() {
    return this.settings;
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('astra_performance_settings', JSON.stringify(this.settings));
    this.applied = false;
    this.applySettings();
  }

  shouldEnableFeature(feature) {
    switch (feature) {
      case 'trails':
        return this.settings.trails;
      case 'effects':
        return this.settings.effects;
      case 'shadows':
        return this.settings.shadows;
      case 'adaptiveThrottling':
        return this.settings.adaptiveThrottling;
      default:
        return true;
    }
  }

  getQualityMultiplier() {
    switch (this.settings.quality) {
      case 'Low':
        return 0.7;
      case 'Medium':
        return 0.85;
      case 'High':
      default:
        return 1.0;
    }
  }

  autoDetectGPUPerformance() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

      if (!gl) {
        console.warn('WebGL not supported, using Medium quality');
        this.applyGPUProfile('medium');
        return;
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      let renderer = 'Unknown';

      if (debugInfo) {
        try {
          renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_GL);
          console.log('Detected GPU:', renderer);
        } catch (error) {
          console.warn('GPU detection blocked by browser security');
        }
      }

      if (renderer && renderer !== 'Unknown' && this.isHighEndGPU(renderer)) {
        console.log('High-end GPU detected - using High quality');
        this.applyGPUProfile('high');
      } else if (renderer && renderer !== 'Unknown' && this.isMidRangeGPU(renderer)) {
        console.log('Mid-range GPU detected - using Medium quality');
        this.applyGPUProfile('medium');
      } else if (renderer === 'Unknown' || renderer === null) {
        console.log('GPU detection failed - using Medium quality (safe default)');
        this.applyGPUProfile('medium');
      } else {
        console.log('Entry-level GPU detected - using Low quality');
        this.applyGPUProfile('low');
      }

    } catch (error) {
      console.warn('GPU detection failed:', error);
      this.applyGPUProfile('medium');
    }
  }

  isHighEndGPU(renderer) {
    const highEndPatterns = [
      /RTX\s*(40[7-9]0|50[0-9]0)/i,
      /GTX\s*1080/i,
      /RX\s*(6800|6900|7800|7900)/i,
      /Quadro/i,
      /Tesla/i
    ];
    return highEndPatterns.some(pattern => pattern.test(renderer));
  }

  isMidRangeGPU(renderer) {
    const midRangePatterns = [
      /RTX\s*(3060|3070|4060)/i,
      /GTX\s*(1060|1070)/i,
      /RX\s*(5600|5700|6600|6700)/i,
      /Intel.*Iris/i
    ];
    return midRangePatterns.some(pattern => pattern.test(renderer));
  }

  applyGPUProfile(tier) {
    const profiles = {
      high: {
        trails: true,
        effects: true,
        shadows: true,
        quality: 'High',
        adaptiveThrottling: false,
        optimizedFor: 'Quality',
        pixelRatio: 1.0,
        shadowQuality: 'High'
      },
      medium: {
        trails: true,
        effects: true,
        shadows: true,
        quality: 'Medium',
        adaptiveThrottling: false,
        optimizedFor: 'Balanced',
        pixelRatio: 0.85,
        shadowQuality: 'Medium'
      },
      low: {
        trails: false,
        effects: false,
        shadows: false,
        quality: 'Low',
        adaptiveThrottling: true,
        optimizedFor: 'Performance',
        pixelRatio: 0.7,
        shadowQuality: 'Off'
      }
    };

    this.settings = { ...this.settings, ...profiles[tier] };
    this.saveSettings();
    console.log(`Applied ${tier} performance profile:`, this.settings);
  }

  forceGPUDetection() {
    console.log('Forcing GPU re-detection...');
    localStorage.removeItem('astra_performance_settings');
    this.autoDetectGPUPerformance();
  }
}

const performanceManager = new PerformanceManager();

if (typeof window !== 'undefined') {
  window.performanceManager = performanceManager;

  window.forceGPUDetection = () => performanceManager.forceGPUDetection();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      performanceManager.applySettings();
    });
  } else {

    setTimeout(() => performanceManager.applySettings(), 100);
  }
}

export default performanceManager;
