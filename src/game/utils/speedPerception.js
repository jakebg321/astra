import { GAME_CONFIG } from '../config/GameConfig.js';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function getConfiguredSpeedForState(isBoosting = false) {
  const normalMax = GAME_CONFIG?.physics?.normalMaxSpeed || 75.6;
  const boostMax = GAME_CONFIG?.physics?.boostMaxSpeed || 147;
  return isBoosting ? boostMax : normalMax;
}

export function getSpeedPerceptionFactor(speed, isBoosting = false, options = {}) {
  const safeSpeed = Number.isFinite(speed) ? Math.max(0, speed) : 0;
  const maxSpeed = options.maxSpeed || getConfiguredSpeedForState(isBoosting);
  const threshold = options.threshold ?? Math.max(6, (GAME_CONFIG?.physics?.normalMaxSpeed || 75.6) * 0.18);

  if (safeSpeed <= threshold) return 0;
  return clamp((safeSpeed - threshold) / Math.max(1, maxSpeed - threshold), 0, 1);
}

