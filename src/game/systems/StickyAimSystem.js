import * as THREE from 'three';
import { GAME_CONFIG } from '../config/GameConfig.js';

class StickyAimSystem {
  constructor() {
    this.enabled = true;
    this.debugMode = false;

    this.settings = {
      magnetismRadius: 150,
      magnetismStrength: 0.4,
      smoothingStrength: 0.15,
      maxSnapDistance: 300,
      minSnapDistance: 50,

      closeRangeMultiplier: 1.5,
      farRangeMultiplier: 0.6,

      updateInterval: 16,
      maxTargetsToCheck: 3,

      requiresMovement: false,
      disableWhenOverheated: true,
      assistType: 'adaptive'
    };

    this.lastUpdate = 0;
    this.currentTarget = null;
    this.assistVector = new THREE.Vector3();
    this.originalAimDirection = new THREE.Vector3();
    this.smoothedAimDirection = new THREE.Vector3();

    this.framesSinceLastTargetCheck = 0;
    this.targetCheckInterval = 3;

    this.tempVector1 = new THREE.Vector3();
    this.tempVector2 = new THREE.Vector3();
    this.tempVector3 = new THREE.Vector3();
    
    this.initializeSettings();
  }
  
  initializeSettings() {

    const savedSettings = localStorage.getItem('astra_sticky_aim_settings');
    if (savedSettings) {
      try {
        const userSettings = JSON.parse(savedSettings);
        this.settings = { ...this.settings, ...userSettings };
      } catch (error) {
        console.warn('Failed to load sticky aim settings:', error);
      }
    }

    this.applyDifficultyPreset(this.settings.assistType);
  }
  
  applyDifficultyPreset(preset) {
    const presets = {
      'strong': {
        magnetismRadius: 200,
        magnetismStrength: 0.6,
        smoothingStrength: 0.25,
        closeRangeMultiplier: 2.0
      },
      'subtle': {
        magnetismRadius: 100,
        magnetismStrength: 0.25,
        smoothingStrength: 0.1,
        closeRangeMultiplier: 1.2
      },
      'adaptive': {
        magnetismRadius: 150,
        magnetismStrength: 0.4,
        smoothingStrength: 0.15,
        closeRangeMultiplier: 1.5
      }
    };
    
    if (presets[preset]) {
      Object.assign(this.settings, presets[preset]);
    }
  }

  update({
    shipPosition,
    shipRotation,
    originalAimDirection,
    enemyPositions = [],
    camera,
    inputState = {}
  }) {
    if (!this.enabled || !shipPosition || !originalAimDirection) {
      return originalAimDirection.clone();
    }
    
    const now = Date.now();

    if (now - this.lastUpdate < this.settings.updateInterval) {
      return this.smoothedAimDirection.clone();
    }
    
    this.lastUpdate = now;
    this.originalAimDirection.copy(originalAimDirection);

    if (!this.shouldProvideAssist(inputState)) {
      this.currentTarget = null;
      this.smoothedAimDirection.copy(originalAimDirection);
      return this.smoothedAimDirection.clone();
    }

    this.framesSinceLastTargetCheck++;
    if (this.framesSinceLastTargetCheck >= this.targetCheckInterval) {
      this.currentTarget = this.findBestTarget(
        shipPosition,
        originalAimDirection,
        enemyPositions,
        camera
      );
      this.framesSinceLastTargetCheck = 0;
    }

    const assistedDirection = this.applyAimAssistance(
      shipPosition,
      originalAimDirection,
      this.currentTarget
    );

    this.smoothedAimDirection.lerp(assistedDirection, this.settings.smoothingStrength);
    
    return this.smoothedAimDirection.clone();
  }

  shouldProvideAssist(inputState) {

    if (this.settings.disableWhenOverheated && inputState.weaponOverheated) {
      return false;
    }

    if (this.settings.requiresMovement) {
      const isMoving = inputState.isMoving || 
        (inputState.keys && (inputState.keys.w || inputState.keys.a || inputState.keys.s || inputState.keys.d));
      if (!isMoving) return false;
    }
    
    return true;
  }

  findBestTarget(shipPosition, aimDirection, enemyPositions, camera) {
    if (!enemyPositions || enemyPositions.length === 0) {
      return null;
    }
    
    let bestTarget = null;
    let bestScore = Infinity;

    const sortedEnemies = enemyPositions
      .map(enemy => ({
        ...enemy,
        distance: shipPosition.distanceTo(enemy.position)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, this.settings.maxTargetsToCheck);
    
    for (const enemy of sortedEnemies) {
      const score = this.calculateTargetScore(
        shipPosition,
        aimDirection,
        enemy,
        camera
      );
      
      if (score < bestScore && score < this.settings.magnetismRadius) {
        bestScore = score;
        bestTarget = enemy;
      }
    }
    
    return bestTarget;
  }

  calculateTargetScore(shipPosition, aimDirection, enemy, camera) {
    const enemyPos = enemy.position;
    const distance = enemy.distance || shipPosition.distanceTo(enemyPos);

    if (distance > this.settings.maxSnapDistance || distance < this.settings.minSnapDistance) {
      return Infinity;
    }

    this.tempVector1.copy(enemyPos);
    this.tempVector1.project(camera);

    const screenX = (this.tempVector1.x * 0.5 + 0.5) * window.innerWidth;
    const screenY = (-this.tempVector1.y * 0.5 + 0.5) * window.innerHeight;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const screenDistance = Math.sqrt(
      Math.pow(screenX - centerX, 2) + Math.pow(screenY - centerY, 2)
    );

    this.tempVector2.copy(enemyPos).sub(shipPosition).normalize();
    const angularDistance = this.tempVector2.angleTo(aimDirection);

    return screenDistance + (angularDistance * 100);
  }

  applyAimAssistance(shipPosition, originalDirection, target) {
    if (!target) {
      return originalDirection.clone();
    }

    this.tempVector1.copy(target.position).sub(shipPosition).normalize();

    const distance = shipPosition.distanceTo(target.position);
    const distanceRatio = THREE.MathUtils.clamp(
      (this.settings.maxSnapDistance - distance) / this.settings.maxSnapDistance,
      0,
      1
    );

    let assistMultiplier = 1.0;
    if (distance < 100) {
      assistMultiplier = this.settings.closeRangeMultiplier;
    } else if (distance > 200) {
      assistMultiplier = this.settings.farRangeMultiplier;
    }
    
    const finalAssistStrength = this.settings.magnetismStrength * distanceRatio * assistMultiplier;

    this.tempVector2.copy(originalDirection);
    this.tempVector2.lerp(this.tempVector1, finalAssistStrength);
    this.tempVector2.normalize();
    
    return this.tempVector2;
  }

  getStatus() {
    return {
      enabled: this.enabled,
      hasTarget: !!this.currentTarget,
      targetDistance: this.currentTarget ? 
        this.currentTarget.distance : null,
      assistStrength: this.settings.magnetismStrength,
      settings: { ...this.settings }
    };
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('astra_sticky_aim_settings', JSON.stringify(this.settings));
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  resetToDefaults() {
    this.settings = {
      magnetismRadius: 150,
      magnetismStrength: 0.4,
      smoothingStrength: 0.15,
      maxSnapDistance: 300,
      minSnapDistance: 50,
      closeRangeMultiplier: 1.5,
      farRangeMultiplier: 0.6,
      updateInterval: 16,
      maxTargetsToCheck: 3,
      requiresMovement: false,
      disableWhenOverheated: true,
      assistType: 'adaptive'
    };
    localStorage.removeItem('astra_sticky_aim_settings');
  }
}

const stickyAimSystem = new StickyAimSystem();

export default stickyAimSystem;