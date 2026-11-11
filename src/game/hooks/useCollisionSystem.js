import * as THREE from 'three';
import { GAME_CONFIG } from '../config/GameConfig.js';
import { isTestModeEnabled } from '../debug/TestModeConfig.js';

export const useCollisionSystem = (playerPosition, playerVelocity) => {
  
  const enforceBoundaries = () => {
    if (!isTestModeEnabled('boundaries') || !playerPosition || !playerVelocity) return;
    
    window.debugPerf?.startTimer('boundaries');
    
    const { size, boundary } = GAME_CONFIG.world;
    const halfSize = {
      x: size.x / 2,
      y: size.y / 2,
      z: size.z / 2
    };
    
    ['x', 'y', 'z'].forEach(axis => {
      const pos = playerPosition[axis];
      const limit = halfSize[axis];
      const buffer = boundary.pushbackDistance;
      const distFromBoundary = limit - Math.abs(pos);
      
      if (distFromBoundary < buffer) {
        const pushStrength = 1 - (distFromBoundary / buffer);
        const pushForce = pushStrength * boundary.pushbackForce * 0.5;
        
        if (pos > 0) {
          playerVelocity[axis] -= pushForce;
        } else {
          playerVelocity[axis] += pushForce;
        }
        
        if (distFromBoundary < 20) {

          if (!window.lastBoundaryWarning) window.lastBoundaryWarning = 0;
          const now = performance.now();
          if (now - window.lastBoundaryWarning > 1000) {
            window.lastBoundaryWarning = now;
            window.dispatchEvent(new CustomEvent('boundary-warning', {
              detail: { axis, distance: distFromBoundary }
            }));
          }
        }
        
        if (Math.abs(pos) > limit) {

          const targetPos = Math.sign(pos) * (limit - 5);
          
          playerPosition[axis] = THREE.MathUtils.lerp(playerPosition[axis], targetPos, 0.15);
          
          if (Math.sign(playerVelocity[axis]) === Math.sign(pos)) {
            playerVelocity[axis] *= 0.8;
          }

          if (!window.lastBounceWarning) window.lastBounceWarning = 0;
          const nowBounce = performance.now();
          if (nowBounce - window.lastBounceWarning > 1000) {
            window.lastBounceWarning = nowBounce;
            window.dispatchEvent(new CustomEvent('boundary-warning', {
              detail: { 
                proximity: 1.0, 
                source: 'bounce_collision',
                direction: { [axis]: Math.sign(pos) }
              }
            }));
          }
        }
      }
    });
    
    window.debugPerf?.endTimer('boundaries');
  };

  const enforcePlanetBoundaries = () => {
    if (!isTestModeEnabled('collision') || !playerPosition || !playerVelocity) return;
    
    window.debugPerf?.startTimer('collision');
    
    if (!window.planetPositions || window.planetPositions.size === 0) {
      return;
    }

    if (!window._planetCollisionLogged) {
      window._planetCollisionLogged = true;
      for (const [name, data] of window.planetPositions) {
        console.log(`Planet collision active: ${name} radius=${data.radius} pos=(${data.position.x.toFixed(0)},${data.position.y.toFixed(0)},${data.position.z.toFixed(0)})`);
      }
    }
    
    for (const [planetName, planetData] of window.planetPositions) {
      const planetPos = planetData.position;
      const planetRadius = planetData.radius + 8;
      
      const dx = playerPosition.x - planetPos.x;
      const dy = playerPosition.y - planetPos.y;
      const dz = playerPosition.z - planetPos.z;
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      if (distance < planetRadius) {

        const minSafeDistance = planetRadius + 3;

        if (distance < 0.1) {
          playerPosition.x = planetPos.x + minSafeDistance;
          playerPosition.y = planetPos.y;
          playerPosition.z = planetPos.z;
        } else {
          const normalX = dx / distance;
          const normalY = dy / distance;
          const normalZ = dz / distance;

          const targetX = planetPos.x + normalX * minSafeDistance;
          const targetY = planetPos.y + normalY * minSafeDistance;
          const targetZ = planetPos.z + normalZ * minSafeDistance;
          
          playerPosition.x = THREE.MathUtils.lerp(playerPosition.x, targetX, 0.15);
          playerPosition.y = THREE.MathUtils.lerp(playerPosition.y, targetY, 0.15);
          playerPosition.z = THREE.MathUtils.lerp(playerPosition.z, targetZ, 0.15);

          const velocityInward = 
            playerVelocity.x * normalX +
            playerVelocity.y * normalY +
            playerVelocity.z * normalZ;
            
          if (velocityInward < 0) {
            playerVelocity.x -= normalX * velocityInward;
            playerVelocity.y -= normalY * velocityInward;
            playerVelocity.z -= normalZ * velocityInward;
          }
        }
      }
    }
    
    window.debugPerf?.endTimer('collision');
  };

  const enforceAsteroidBoundaries = () => {
    if (!isTestModeEnabled('collision') || !playerPosition || !playerVelocity) return;
    if (!window.asteroidPositions) return;

    for (const asteroid of window.asteroidPositions) {
      if (asteroid.destroyed) continue;

      const ap = asteroid.position;
      const asteroidRadius = asteroid.radius + 4;

      const dx = playerPosition.x - ap.x;
      const dy = playerPosition.y - ap.y;
      const dz = playerPosition.z - ap.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < asteroidRadius) {
        const minSafeDistance = asteroidRadius + 2;
        if (distance < 0.1) {
          playerPosition.x = ap.x + minSafeDistance;
        } else {
          const normalX = dx / distance;
          const normalY = dy / distance;
          const normalZ = dz / distance;

          const targetX = ap.x + normalX * minSafeDistance;
          const targetY = ap.y + normalY * minSafeDistance;
          const targetZ = ap.z + normalZ * minSafeDistance;

          playerPosition.x = THREE.MathUtils.lerp(playerPosition.x, targetX, 0.15);
          playerPosition.y = THREE.MathUtils.lerp(playerPosition.y, targetY, 0.15);
          playerPosition.z = THREE.MathUtils.lerp(playerPosition.z, targetZ, 0.15);

          const velocityInward =
            playerVelocity.x * normalX +
            playerVelocity.y * normalY +
            playerVelocity.z * normalZ;

          if (velocityInward < 0) {
            playerVelocity.x -= normalX * velocityInward;
            playerVelocity.y -= normalY * velocityInward;
            playerVelocity.z -= normalZ * velocityInward;
          }
        }
      }
    }
  };

  const updateCollisions = () => {
    enforceBoundaries();
    enforcePlanetBoundaries();
    enforceAsteroidBoundaries();
  };

  return {
    updateCollisions
  };
};