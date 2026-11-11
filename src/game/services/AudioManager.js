

export class AudioManager {
  constructor() {
    this.sounds = new Map();
    this.backgroundMusic = null;
    this.engineSound = null;
    this.currentBoostSound = null;
    this.isMuted = false;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.engineEnabled = true;
    this.masterVolume = 0.7;
    this.musicVolume = 0.15;
    this.engineVolume = 0.4;
    this.sfxVolume = 1.6;
    this.initialized = false;

    this.loadSettings();

  }

  getCachedAudio(path) {
    if (typeof window === 'undefined') return null;
    const cache = window.gameAudioCache;
    if (!cache || typeof cache.get !== 'function') return null;

    const cached = cache.get(path);
    if (cached && typeof cached.play === 'function') {
      return cached;
    }

    return null;
  }

  async initialize() {
    if (this.initialized) return;

    try {

      await this.loadSound('laser', '/sound/lazers.mp4');

      await this.loadSound('boost', '/sound/boost.mp4');

      await this.loadSound('damage', '/sound/damage.mp4');

      await this.loadSound('portal', '/sound/portal.mp4');

      await this.loadEngineSound('/sound/engine.mp4');

      await this.loadBackgroundMusic('/sound/lobbyMusic.mp4');

      this.initialized = true;

      if (this.musicEnabled) {
        this.playBackgroundMusic();
      }

    } catch (error) {
      console.error('AudioManager initialization failed:', error);
    }
  }

  async loadSound(name, path) {

    if (this.sounds.has(name)) {
      return this.sounds.get(name);
    }

    return new Promise((resolve, reject) => {
      const cachedAudio = this.getCachedAudio(path);
      if (cachedAudio) {
        this.sounds.set(name, cachedAudio);

        if (window.universalAssetTracker?.isEnabled) {
          window.universalAssetTracker.trackAssetLoad('audio', path, {
            element: 'AudioManager',
            method: 'loadSound()',
            cached: true,
            soundName: name
          });
        }
        
        resolve(cachedAudio);
        return;
      }

      const audio = new Audio();
      audio.preload = 'auto';

      if (window.universalAssetTracker?.isEnabled) {
        window.universalAssetTracker.trackAssetLoad('audio', path, {
          element: 'AudioManager',
          method: 'loadSound()',
          soundName: name,
          cached: false
        });
      }

      audio.oncanplaythrough = () => {
        this.sounds.set(name, audio);
        resolve(audio);
      };

      audio.onerror = () => {
        console.error(`Failed to load sound: ${name} from ${path}`);

        if (window.universalAssetTracker?.isEnabled) {
          window.universalAssetTracker.markAssetLoadFailed('audio', path, new Error(`Failed to load ${name}`));
        }
        
        reject(new Error(`Failed to load ${name}`));
      };

      audio.src = path;
      audio.load();
    });
  }

  async loadEngineSound(path) {

    if (this.engineSound) {
      return this.engineSound;
    }

    return new Promise((resolve, reject) => {
      const cachedAudio = this.getCachedAudio(path);
      if (cachedAudio) {
        cachedAudio.loop = true;
        this.engineSound = cachedAudio;
        this.updateEngineVolume();
        resolve(cachedAudio);
        return;
      }

      const audio = new Audio();
      audio.preload = 'auto';
      audio.loop = true;

      audio.oncanplaythrough = () => {

        this.engineSound = audio;
        this.updateEngineVolume();
        resolve(audio);
      };

      audio.onerror = () => {
        console.error(`Failed to load engine sound from ${path}`);
        reject(new Error(`Failed to load engine sound`));
      };

      audio.src = path;
      audio.load();
    });
  }

  async loadBackgroundMusic(path) {

    if (this.backgroundMusic) {
      return this.backgroundMusic;
    }

    return new Promise((resolve, reject) => {
      const cachedAudio = this.getCachedAudio(path);
      if (cachedAudio) {
        cachedAudio.loop = true;
        this.backgroundMusic = cachedAudio;
        this.updateMusicVolume();
        resolve(cachedAudio);
        return;
      }

      const audio = new Audio();
      audio.preload = 'auto';
      audio.loop = true;

      audio.oncanplaythrough = () => {
        this.backgroundMusic = audio;
        this.updateMusicVolume();
        resolve(audio);
      };

      audio.onerror = () => {
        console.error(`Failed to load background music from ${path}`);
        reject(new Error(`Failed to load background music`));
      };

      audio.src = path;
      audio.load();
    });
  }

  getPooledAudio(name, targetVolume) {
    if (!this.audioPools) this.audioPools = new Map();
    let pool = this.audioPools.get(name);
    const original = this.sounds.get(name);
    if (!original) return null;

    if (!pool) {
      pool = [];
      this.audioPools.set(name, pool);
    }

    for (const channel of pool) {
      if (channel.paused || channel.ended) {
        channel.volume = targetVolume;
        channel.currentTime = 0;
        return channel;
      }
    }

    if (pool.length < 6) {
      const cloned = original.cloneNode();
      pool.push(cloned);
      cloned.volume = targetVolume;
      return cloned;
    }

    let oldest = pool[0];
    for (const channel of pool) {
      if (channel.currentTime > oldest.currentTime) oldest = channel;
    }
    oldest.volume = targetVolume;
    oldest.currentTime = 0;
    return oldest;
  }

  playLaser() {
    if (!this.sfxEnabled || this.isMuted || !this.initialized) return;

    try {
      const targetVolume = Math.min(1.0, this.sfxVolume * this.masterVolume * 1.5);
      const channel = this.getPooledAudio('laser', targetVolume);
      if (channel) {
        channel.play().catch(e => {
          console.warn('Could not play laser sound:', e);
        });
      } else {
        console.warn('Laser sound not loaded');
      }
    } catch (error) {
      console.warn('Laser sound playback failed:', error);
    }
  }

  playDamage() {
    if (!this.sfxEnabled || this.isMuted || !this.initialized) return;

    try {
      const targetVolume = Math.min(1.0, this.sfxVolume * this.masterVolume);
      const channel = this.getPooledAudio('damage', targetVolume);
      if (channel) {
        channel.play().catch(e => {
          console.warn('Could not play damage sound:', e);
        });
      } else {
        console.warn('Damage sound not loaded');
      }
    } catch (error) {
      console.warn('Damage sound playback failed:', error);
    }
  }

  playPortal() {
    if (!this.sfxEnabled || this.isMuted || !this.initialized) return;

    try {
      const targetVolume = Math.min(1.0, this.sfxVolume * this.masterVolume * 1.2);
      const channel = this.getPooledAudio('portal', targetVolume);
      if (channel) {
        channel.play().catch(e => {
          console.warn('Could not play portal sound:', e);
        });
      } else {
        console.warn('Portal sound not loaded');
      }
    } catch (error) {
      console.warn('Portal sound playback failed:', error);
    }
  }

  startBoost() {
    if (!this.sfxEnabled || this.isMuted || !this.initialized) return;

    const boost = this.sounds.get('boost');
    if (!boost) {
      console.warn('Boost sound not loaded');
      return;
    }

    try {

      this.stopBoost();

      this.currentBoostSound = boost.cloneNode();
      this.currentBoostSound.loop = true;
      this.currentBoostSound.volume = Math.min(1.0, this.sfxVolume * this.masterVolume);
      this.currentBoostSound.currentTime = 0;
      this.currentBoostSound.play().catch(e => {
        console.warn('Could not play boost sound:', e);
      });
    } catch (error) {
      console.warn('Boost sound playback failed:', error);
    }
  }

  stopBoost() {
    if (this.currentBoostSound) {

      const originalVolume = this.currentBoostSound.volume;
      const fadeSteps = 8;
      const fadeInterval = 30;
      let currentStep = 0;

      const soundRef = this.currentBoostSound;
      this.currentBoostSound = null;

      const fadeOut = setInterval(() => {
        currentStep++;
        const fadeProgress = currentStep / fadeSteps;

        if (!soundRef || currentStep >= fadeSteps) {
          clearInterval(fadeOut);
          if (soundRef) {
            soundRef.pause();
            soundRef.currentTime = 0;
          }
          return;
        }

        soundRef.volume = originalVolume * (1 - fadeProgress);
      }, fadeInterval);
    }
  }

  playBoost() {
    this.startBoost();
  }

  playEngineSound() {
    if (!this.engineEnabled || this.isMuted || !this.engineSound) return;

    try {
      this.engineSound.currentTime = 0;
      this.engineSound.play().catch(e => {
        console.warn('Could not play engine sound:', e);
      });

    } catch (error) {
      console.warn('Engine sound playback failed:', error);
    }
  }

  stopEngineSound() {
    if (this.engineSound) {
      this.engineSound.pause();
      this.engineSound.currentTime = 0;

    }
  }

  playBackgroundMusic() {
    if (!this.musicEnabled || this.isMuted || !this.backgroundMusic) return;

    try {
      this.backgroundMusic.currentTime = 0;
      this.backgroundMusic.play().catch(e => {
        console.warn('Could not play background music:', e);
      });
    } catch (error) {
      console.warn('Background music playback failed:', error);
    }
  }

  stopBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
    }
  }

  pauseBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
    }
  }

  resumeBackgroundMusic() {
    if (this.musicEnabled && !this.isMuted && this.backgroundMusic) {
      this.backgroundMusic.play().catch(e => {
        console.warn('Could not resume background music:', e);
      });
    }
  }

  pauseEngineSound() {
    if (this.engineSound) {
      this.engineSound.pause();
    }
  }

  resumeEngineSound() {
    if (this.engineEnabled && !this.isMuted && this.engineSound) {
      this.engineSound.play().catch(e => {
        console.warn('Could not resume engine sound:', e);
      });
    }
  }

  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateMusicVolume();
    this.saveSettings();
  }

  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateMusicVolume();
    this.saveSettings();
  }

  setEngineVolume(volume) {
    this.engineVolume = Math.max(0, Math.min(1, volume));
    this.updateEngineVolume();
    this.saveSettings();
  }

  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  updateMusicVolume() {
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.musicVolume * this.masterVolume;
    }
  }

  updateEngineVolume() {
    if (this.engineSound) {
      this.engineSound.volume = this.engineVolume * this.masterVolume;
    }
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;

    if (this.musicEnabled) {
      this.playBackgroundMusic();
    } else {
      this.stopBackgroundMusic();
    }

    this.saveSettings();
    return this.musicEnabled;
  }

  toggleSfx() {
    this.sfxEnabled = !this.sfxEnabled;
    this.saveSettings();
    return this.sfxEnabled;
  }

  toggleEngine() {
    this.engineEnabled = !this.engineEnabled;

    if (this.engineEnabled) {
      this.playEngineSound();
    } else {
      this.stopEngineSound();
    }

    this.saveSettings();
    return this.engineEnabled;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;

    if (this.isMuted) {
      this.pauseBackgroundMusic();
      this.pauseEngineSound();
    } else {
      if (this.musicEnabled) this.resumeBackgroundMusic();
      if (this.engineEnabled) this.resumeEngineSound();
    }

    this.saveSettings();
    return this.isMuted;
  }

  saveSettings() {
    const settings = {
      musicEnabled: this.musicEnabled,
      sfxEnabled: this.sfxEnabled,
      engineEnabled: this.engineEnabled,
      isMuted: this.isMuted,
      masterVolume: this.masterVolume,
      musicVolume: this.musicVolume,
      engineVolume: this.engineVolume,
      sfxVolume: this.sfxVolume
    };

    localStorage.setItem('astra_audio_settings', JSON.stringify(settings));
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('astra_audio_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.musicEnabled = settings.musicEnabled ?? true;
        this.sfxEnabled = settings.sfxEnabled ?? true;
        this.engineEnabled = settings.engineEnabled ?? true;
        this.isMuted = settings.isMuted ?? false;
        this.masterVolume = settings.masterVolume ?? 0.7;
        this.musicVolume = settings.musicVolume ?? 0.15;
        this.engineVolume = settings.engineVolume ?? 0.4;
        this.sfxVolume = settings.sfxVolume ?? 1.6;

      }
    } catch (error) {
      console.warn('Could not load audio settings:', error);
    }
  }

  getState() {
    return {
      musicEnabled: this.musicEnabled,
      sfxEnabled: this.sfxEnabled,
      engineEnabled: this.engineEnabled,
      isMuted: this.isMuted,
      masterVolume: this.masterVolume,
      musicVolume: this.musicVolume,
      engineVolume: this.engineVolume,
      sfxVolume: this.sfxVolume,
      initialized: this.initialized
    };
  }

  dispose() {
    this.stopBackgroundMusic();
    this.stopEngineSound();
    this.stopBoost();

    if (this.audioPools) {
      this.audioPools.forEach((pool) => {
        pool.forEach((channel) => {
          try {
            channel.pause();
            channel.currentTime = 0;
            channel.src = '';
            channel.load();
          } catch (e) {

          }
        });
      });
      this.audioPools.clear();
    }

    this.sounds.forEach((audio, name) => {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        audio.load();
      } catch (e) {
        console.warn(`Failed to dispose sound ${name}:`, e);
      }
    });
    this.sounds.clear();

    if (this.backgroundMusic) {
      try {
        this.backgroundMusic.pause();
        this.backgroundMusic.currentTime = 0;
        this.backgroundMusic.src = '';
        this.backgroundMusic.load();
      } catch (e) {
        console.warn('Failed to dispose background music:', e);
      }
      this.backgroundMusic = null;
    }

    if (this.engineSound) {
      try {
        this.engineSound.pause();
        this.engineSound.currentTime = 0;
        this.engineSound.src = '';
        this.engineSound.load();
      } catch (e) {
        console.warn('Failed to dispose engine sound:', e);
      }
      this.engineSound = null;
    }

    this.currentBoostSound = null;
    this.initialized = false;
    
  }
}

let audioManager = null;

export const getAudioManager = () => {
  if (!audioManager) {
    audioManager = new AudioManager();
  }
  return audioManager;
};

export const initializeAudioOnInteraction = async () => {
  const manager = getAudioManager();
  if (!manager.initialized) {
    try {
      await manager.initialize();
    } catch (error) {
      console.error('Audio initialization failed:', error);
    }
  }
};

export default getAudioManager;
