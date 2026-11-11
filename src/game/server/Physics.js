import * as THREE from 'three';
import { GAME_CONFIG } from '../config/GameConfig.js';

export class Physics {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.interpolationBuffer = new Map();
    this.reconciliationBuffer = new Map();
    this.lastWingFired = new Map();

    this.tempVector3 = new THREE.Vector3();
    this.tempVector3_2 = new THREE.Vector3();
    this.tempSphere = new THREE.Sphere();
    this.tempRay = new THREE.Ray();

    this.planetCache = {
      positions: new Map(),
      lastUpdate: 0,
      updateInterval: 100
    };

    this.asteroidCache = {
      positions: [],
      initialized: false
    };
  }

  initializeAsteroids() {
    if (this.asteroidCache.initialized) return;
    const asteroidData = GAME_CONFIG.environment?.asteroids?.data || [];
    const hitMultiplier = GAME_CONFIG.environment?.asteroids?.hitRadiusMultiplier || 1.0;
    this.asteroidCache.positions = asteroidData.map((a, index) => ({
      index,
      x: a.pos[0],
      y: a.pos[1],
      z: a.pos[2],
      radius: a.scale * hitMultiplier,
      destroyed: false
    }));
    this.asteroidCache.initialized = true;
  }

  checkAsteroidCollisions(ray, maxRange) {
    this.initializeAsteroids();
    let closestDistance = maxRange;
    let hitAsteroid = null;
    let hitPoint = null;
    let asteroidCenter = null;

    for (const asteroid of this.asteroidCache.positions) {
      if (asteroid.destroyed) continue;
      this.tempSphere.set(
        this.tempVector3_2.set(asteroid.x, asteroid.y, asteroid.z),
        asteroid.radius
      );
      const hit = ray.intersectSphere(this.tempSphere, this.tempVector3);
      if (hit) {
        const distance = ray.origin.distanceTo(hit);
        if (distance < closestDistance) {
          closestDistance = distance;
          hitAsteroid = asteroid;
          hitPoint = { x: hit.x, y: hit.y, z: hit.z };
          asteroidCenter = { x: asteroid.x, y: asteroid.y, z: asteroid.z };
        }
      }
    }

    return {
      blocked: hitAsteroid !== null,
      asteroidIndex: hitAsteroid?.index ?? -1,
      distance: closestDistance,
      hitPoint,
      asteroidCenter
    };
  }

  checkWallCollisions(ray, maxRange, shooterId) {
    const players = this.gameRoom.gameState.players;
    const wallConfig = GAME_CONFIG.crystalWall || {};
    const WALL_SCALE = 10;
    const halfW = ((wallConfig.width || 40) * WALL_SCALE) / 2;
    const halfH = ((wallConfig.height || 30) * WALL_SCALE) / 2;
    const halfD = (wallConfig.depth || 4) / 2;

    let closestDistance = maxRange;
    let hitWall = null;
    let hitPoint = null;
    let hitWallOwnerId = null;

    for (const playerId in players) {
      const player = players[playerId];
      if (!player?.crystalWall) continue;

      if (playerId === shooterId) continue;

      const w = player.crystalWall;
      const cx = w.position.x;
      const cy = w.position.y;
      const cz = w.position.z;

      const cosY = Math.cos(w.rotation.y || 0);
      const sinY = Math.sin(w.rotation.y || 0);

      const exX = Math.abs(cosY * halfW) + Math.abs(sinY * halfD);
      const exZ = Math.abs(sinY * halfW) + Math.abs(cosY * halfD);

      const box = new THREE.Box3(
        new THREE.Vector3(cx - exX, cy - halfH, cz - exZ),
        new THREE.Vector3(cx + exX, cy + halfH, cz + exZ)
      );

      const intersection = ray.intersectBox(box, this.tempVector3);
      if (intersection) {
        const distance = ray.origin.distanceTo(intersection);
        if (distance < closestDistance) {
          closestDistance = distance;
          hitWall = w;
          hitWallOwnerId = playerId;
          hitPoint = { x: intersection.x, y: intersection.y, z: intersection.z };
        }
      }
    }

    return {
      blocked: hitWall !== null,
      wall: hitWall,
      ownerId: hitWallOwnerId,
      distance: closestDistance,
      hitPoint,
    };
  }

  checkOwnWallPassthrough(ray, targetDistance, shooterId) {
    const players = this.gameRoom.gameState.players;
    const shooter = players[shooterId];
    if (!shooter?.crystalWall) return false;

    const wallConfig = GAME_CONFIG.crystalWall || {};
    const WALL_SCALE = 10;
    const halfW = ((wallConfig.width || 40) * WALL_SCALE) / 2;
    const halfH = ((wallConfig.height || 30) * WALL_SCALE) / 2;
    const halfD = (wallConfig.depth || 4) / 2;

    const w = shooter.crystalWall;
    const cosY = Math.cos(w.rotation.y || 0);
    const sinY = Math.sin(w.rotation.y || 0);
    const exX = Math.abs(cosY * halfW) + Math.abs(sinY * halfD);
    const exZ = Math.abs(sinY * halfW) + Math.abs(cosY * halfD);

    const box = new THREE.Box3(
      new THREE.Vector3(w.position.x - exX, w.position.y - halfH, w.position.z - exZ),
      new THREE.Vector3(w.position.x + exX, w.position.y + halfH, w.position.z + exZ)
    );

    const intersection = ray.intersectBox(box, this.tempVector3);
    if (intersection) {
      const wallDist = ray.origin.distanceTo(intersection);

      return wallDist < targetDistance;
    }
    return false;
  }

  destroyAsteroid(index) {
    if (this.asteroidCache.positions[index]) {
      this.asteroidCache.positions[index].destroyed = true;
    }
  }

  resetAsteroids() {
    this.asteroidCache.positions.forEach(a => { a.destroyed = false; });
  }

  getCenterPlanetCollisionRadius() {
    return GAME_CONFIG?.combat?.centerPlanetCollisionRadius || 75;
  }
  
  createBullet(playerId, bulletData) {
    const player = this.gameRoom.gameState.players[playerId];
    if (!player) {
      return null;
    }
    
    const now = Date.now();

    const position = bulletData?.position || player.position;
    const rotation = bulletData?.rotation || player.rotation;

    const euler = new THREE.Euler(rotation.x, rotation.y, rotation.z, 'YXZ');
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyEuler(euler);
    
    const right = new THREE.Vector3(1, 0, 0);
    right.applyEuler(euler);

    const wingOffset = GAME_CONFIG.combat.wingOffset * 2 || 1.5;
    let forwardOffset = 5;

    if (bulletData?.velocity && typeof bulletData.velocity === 'number') {

      const velocityCompensation = Math.max(0, Math.min(5, bulletData.velocity * 0.1));
      forwardOffset += velocityCompensation;
    }

    const lastWing = this.lastWingFired.get(playerId) || 'right';
    const fireFromLeft = lastWing === 'right';
    this.lastWingFired.set(playerId, fireFromLeft ? 'left' : 'right');

    const wingMultiplier = fireFromLeft ? -1 : 1;
    const sideOffset = 2.0;
    
    const bulletPosition = {
      x: position.x + (wingMultiplier * right.x * sideOffset) + (forward.x * forwardOffset),
      y: position.y - 4.0,
      z: position.z + (wingMultiplier * right.z * sideOffset) + (forward.z * forwardOffset)
    };

    const convergenceDistance = 200;
    const convergencePoint = {
      x: position.x + (forward.x * convergenceDistance),
      y: position.y + (forward.y * convergenceDistance),
      z: position.z + (forward.z * convergenceDistance)
    };

    const convergenceDirection = {
      x: convergencePoint.x - bulletPosition.x,
      y: convergencePoint.y - bulletPosition.y,
      z: convergencePoint.z - bulletPosition.z
    };
    
    const convergenceLength = Math.sqrt(
      convergenceDirection.x * convergenceDirection.x + 
      convergenceDirection.y * convergenceDirection.y + 
      convergenceDirection.z * convergenceDirection.z
    );
    
    const normalizedConvergence = {
      x: convergenceDirection.x / convergenceLength,
      y: convergenceDirection.y / convergenceLength,
      z: convergenceDirection.z / convergenceLength
    };

    const maxRange = GAME_CONFIG.combat.bulletSpeed * GAME_CONFIG.combat.bulletLifetime;
    
    this.gameRoom.gameStats.totalShots++;
    const playerStats = this.gameRoom.gameStats.playerStats.get(playerId);
    if (playerStats) {
      playerStats.shots++;
    }

    const directionVector = new THREE.Vector3(
      normalizedConvergence.x, 
      normalizedConvergence.y, 
      normalizedConvergence.z
    );

    const hitscanResult = this.performHitscan(playerId, bulletPosition, directionVector, maxRange, true);

    let bulletLifeDistance = maxRange;
    let impactType = null;
    let impactData = null;
    
    if (hitscanResult && hitscanResult.type === 'planet_block') {
      bulletLifeDistance = hitscanResult.distance;
      impactType = 'planet';
      impactData = {
        planet: hitscanResult.planet,
        hitPoint: hitscanResult.hitPoint,
        planetCenter: hitscanResult.planetCenter
      };
    } else if (hitscanResult && hitscanResult.type === 'asteroid_block') {
      bulletLifeDistance = hitscanResult.distance;
      impactType = 'asteroid';
      impactData = {
        asteroidIndex: hitscanResult.asteroidIndex,
        hitPoint: hitscanResult.hitPoint,
        asteroidCenter: hitscanResult.asteroidCenter
      };
    } else if (hitscanResult && hitscanResult.type === 'wall_block') {
      bulletLifeDistance = hitscanResult.distance;
      impactType = 'wall';
      impactData = {
        wallId: hitscanResult.wallId,
        hitPoint: hitscanResult.hitPoint,
      };
    }

    const bulletStyle = bulletData?.bulletStyle || 2;

    const shotThroughWall = this.checkOwnWallPassthrough(
      this.tempRay, bulletLifeDistance, playerId
    );
    if (shotThroughWall) {

      const shooter = this.gameRoom.gameState.players[playerId];
      if (shooter?.crystalWall) {
        this.gameRoom.broadcast('wallPassthrough', {
          wallId: shooter.crystalWall.id,
          playerId: playerId
        });
      }
    }

    const bullet = {
      id: `bullet_${playerId}_${now}_${fireFromLeft ? 'L' : 'R'}`,
      owner: playerId,
      position: bulletPosition,
      spawnPosition: { ...bulletPosition },
      velocity: {
        x: normalizedConvergence.x * GAME_CONFIG.combat.bulletSpeed,
        y: normalizedConvergence.y * GAME_CONFIG.combat.bulletSpeed,
        z: normalizedConvergence.z * GAME_CONFIG.combat.bulletSpeed
      },
      created: now,
      isVisualOnly: true,
      wing: fireFromLeft ? 'LEFT' : 'RIGHT',
      bulletStyle: bulletStyle,
      impactType: impactType,
      impactData: impactData,
      lifeDistance: bulletLifeDistance,
      wallBoosted: shotThroughWall
    };
    
    this.gameRoom.gameState.bullets.push(bullet);
    
    return [bullet];
  }

  checkPlanetCollisions(ray, maxRange) {
    const now = Date.now();

    if (now - this.planetCache.lastUpdate > this.planetCache.updateInterval) {
      this.updatePlanetCache();
      this.planetCache.lastUpdate = now;
    }
    
    let closestDistance = maxRange;
    let blockingPlanet = null;
    let hitPoint = null;
    let planetCenter = null;

    const centerPlanetRadius = this.getCenterPlanetCollisionRadius();
    this.tempSphere.set(this.tempVector3.set(0, 0, 0), centerPlanetRadius);
    const centerHit = ray.intersectSphere(this.tempSphere, this.tempVector3_2);
    
    if (centerHit) {
      const distance = ray.origin.distanceTo(centerHit);
      if (distance < closestDistance) {
        closestDistance = distance;
        blockingPlanet = 'Astra Center';
        hitPoint = { x: centerHit.x, y: centerHit.y, z: centerHit.z };
        planetCenter = { x: 0, y: 0, z: 0 };
      }
    }

    for (const [planetName, planetData] of this.planetCache.positions) {
      this.tempSphere.set(
        this.tempVector3.set(planetData.x, planetData.y, planetData.z),
        planetData.radius
      );

      const hit = ray.intersectSphere(this.tempSphere, this.tempVector3_2);
      if (hit) {
        const distance = ray.origin.distanceTo(hit);
        if (distance < closestDistance) {
          closestDistance = distance;
          blockingPlanet = planetName;
          hitPoint = { x: hit.x, y: hit.y, z: hit.z };
          planetCenter = { x: planetData.x, y: planetData.y, z: planetData.z };
        }
      }
    }
    
    return {
      blocked: blockingPlanet !== null,
      planet: blockingPlanet,
      distance: closestDistance,
      hitPoint: hitPoint,
      planetCenter: planetCenter
    };
  }

  updatePlanetCache() {

    const needsUpdate = this.planetCache.positions.size === 0;
    
    if (!needsUpdate) {
      return;
    }

    if (typeof window !== 'undefined' && window.planetPositions) {

      for (const [planetName, planetData] of window.planetPositions) {
        this.planetCache.positions.set(planetName, {
          x: planetData.position.x,
          y: planetData.position.y,
          z: planetData.position.z,
          radius: planetData.radius
        });
      }
    } else {

      const serverPlanets = [
        { name: 'Mercury', distance: 200, size: 25.2, orbitOffset: Math.PI * 0.5, inclination: [0.3, 0.1, 0.2] },
        { name: 'Venus', distance: 250, size: 31.5, orbitOffset: Math.PI * 1.5, inclination: [0.2, 0.4, 0.3] },
        { name: 'Earth', distance: 350, size: 35.7, orbitOffset: 0, inclination: [0.1, 0.3, 0.4] },
        { name: 'Mars', distance: 550, size: 29.4, orbitOffset: Math.PI, inclination: [0.4, 0.2, 0.5] },
        { name: 'Jupiter', distance: 650, size: 54.6, orbitOffset: Math.PI * 1.2, inclination: [0.2, 0.5, 0.6] },
        { name: 'Saturn', distance: 700, size: 46.2, orbitOffset: Math.PI * 1.5, inclination: [0.5, 0.3, 0.4] },
        { name: 'Uranus', distance: 600, size: 37.8, orbitOffset: Math.PI * 1.8, inclination: [0.6, 0.4, 0.3] }
      ];
      
      for (const planet of serverPlanets) {

        const euler = new THREE.Euler(
          planet.inclination[0],
          planet.orbitOffset,
          planet.inclination[2],
          'XYZ'
        );

        const worldPos = new THREE.Vector3(planet.distance, 0, 0).applyEuler(euler);

        this.planetCache.positions.set(planet.name, {
          x: worldPos.x,
          y: worldPos.y,
          z: worldPos.z,
          radius: planet.size
        });
        
      }
      
    }
  }

  nearestPlayerHitDistance(shooterId, maxRange, hitRadius) {
    const players = this.gameRoom.gameState.players;
    const sphere = this.blockSphere || (this.blockSphere = new THREE.Sphere());
    const hit = this.blockHit || (this.blockHit = new THREE.Vector3());
    let nearest = maxRange;
    for (const playerId in players) {
      const player = players[playerId];
      if (!player?.position || playerId === shooterId) continue;
      if (player.isDashing || player.inHyperspace || player.isPortalTraveling) continue;
      sphere.center.set(player.position.x, player.position.y, player.position.z);
      sphere.radius = hitRadius;
      if (this.tempRay.intersectSphere(sphere, hit)) {
        const d = this.tempRay.origin.distanceTo(hit);
        if (d < nearest) nearest = d;
      }
    }
    return nearest;
  }

  performHitscan(shooterId, rayOrigin, rayDirection, maxRange, returnDetails = false) {
    const players = this.gameRoom.gameState.players;
    const hitRadius = GAME_CONFIG.combat.hitRadius || 8.0;
    let closestHit = null;
    let closestDistance = maxRange;

    this.tempRay.set(
      this.tempVector3.set(rayOrigin.x, rayOrigin.y, rayOrigin.z),
      rayDirection.clone().normalize()
    );

    const blockRange = this.nearestPlayerHitDistance(shooterId, maxRange, hitRadius);

    const planetBlock = this.checkPlanetCollisions(this.tempRay, blockRange);
    if (planetBlock.blocked) {

      if (returnDetails) {
        return {
          type: 'planet_block',
          planet: planetBlock.planet,
          distance: planetBlock.distance,
          hitPoint: planetBlock.hitPoint,
          planetCenter: planetBlock.planetCenter
        };
      }
      return null;
    }

    const asteroidBlock = this.checkAsteroidCollisions(this.tempRay, blockRange);
    if (asteroidBlock.blocked) {
      closestDistance = asteroidBlock.distance;
      this.destroyAsteroid(asteroidBlock.asteroidIndex);
      if (this.gameRoom.broadcastAsteroidDestroyed) {
        this.gameRoom.broadcastAsteroidDestroyed(asteroidBlock.asteroidIndex, asteroidBlock.hitPoint);
      }
      if (returnDetails) {
        return {
          type: 'asteroid_block',
          asteroidIndex: asteroidBlock.asteroidIndex,
          distance: asteroidBlock.distance,
          hitPoint: asteroidBlock.hitPoint,
          asteroidCenter: asteroidBlock.asteroidCenter
        };
      }
      return null;
    }

    const wallBlock = this.checkWallCollisions(this.tempRay, blockRange, shooterId);
    if (wallBlock.blocked) {

      const falloff = GAME_CONFIG.combat.damageFalloff;
      let damageMultiplier = 1.0;
      if (falloff && wallBlock.distance > falloff.startRange) {
        const t = Math.min(1, (wallBlock.distance - falloff.startRange) / (falloff.endRange - falloff.startRange));
        damageMultiplier = 1.0 - t * (1.0 - falloff.minMultiplier);
      }
      const wallDamage = GAME_CONFIG.combat.damagePerHit * damageMultiplier;
      this.gameRoom.damageCrystalWall(wallBlock.ownerId, wallDamage, wallBlock.hitPoint);

      if (returnDetails) {
        return {
          type: 'wall_block',
          wallId: wallBlock.wall?.id,
          ownerId: wallBlock.ownerId,
          distance: wallBlock.distance,
          hitPoint: wallBlock.hitPoint,
        };
      }
      return null;
    }

    Object.entries(players)
      .filter(([playerId, player]) => playerId && player && player.position)
      .forEach(([playerId, player]) => {
        if (playerId === shooterId) return;

        if (player.isDashing || player.inHyperspace || player.isPortalTraveling) {
          return;
        }

        this.tempSphere.set(
          this.tempVector3_2.set(player.position.x, player.position.y, player.position.z),
          hitRadius
        );

        const intersectionPoint = this.tempRay.intersectSphere(this.tempSphere, this.tempVector3);
        
        if (intersectionPoint) {

          const dx = rayOrigin.x - intersectionPoint.x;
          const dy = rayOrigin.y - intersectionPoint.y;
          const dz = rayOrigin.z - intersectionPoint.z;
          const actualDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (actualDistance < closestDistance) {
            closestDistance = actualDistance;
            closestHit = { playerId, player, distance: actualDistance };
          }
        }
      });

    if (closestHit) {
      const { playerId, player } = closestHit;

      const previousHealth = player.health;
      const falloff = GAME_CONFIG.combat.damageFalloff;
      let damageMultiplier = 1.0;
      if (falloff && closestHit.distance > falloff.startRange) {
        const t = Math.min(1, (closestHit.distance - falloff.startRange) / (falloff.endRange - falloff.startRange));
        damageMultiplier = 1.0 - t * (1.0 - falloff.minMultiplier);
      }

      const wallBoost = this.checkOwnWallPassthrough(this.tempRay, closestHit.distance, shooterId)
        ? (1.0 + (GAME_CONFIG.crystalWall?.damageBoost || 0.3))
        : 1.0;
      const actualDamage = GAME_CONFIG.combat.damagePerHit * damageMultiplier * wallBoost;
      const rawNewHealth = previousHealth - actualDamage;
      const HEALTH_EPSILON = 1e-6;
      player.health = rawNewHealth <= HEALTH_EPSILON ? 0 : Math.max(0, rawNewHealth);

      player.lastDamagedAt = Date.now();

      this.gameRoom.gameStats.totalHits++;
      const shooterStats = this.gameRoom.gameStats.playerStats.get(shooterId);
      if (shooterStats) {
        shooterStats.hits++;
        shooterStats.damage += actualDamage;
      }

      this.gameRoom.broadcast('playerHit', {
        targetId: playerId,
        attackerId: shooterId,
        damage: actualDamage,
        previousHealth: previousHealth,
        newHealth: player.health,
        position: {
          x: player.position.x,
          y: player.position.y,
          z: player.position.z
        },
        hitType: 'hitscan',
        wallBoosted: wallBoost > 1.0
      });

      if (player.health <= HEALTH_EPSILON) {
        this.gameRoom.endGame(shooterId);
      }
      
      return 'hit';
    }

    return 'miss';
  }
  
  update(deltaTime) {

    const players = this.gameRoom.gameState.players;
    for (const playerId in players) {
      const player = players[playerId];
      if (!player) continue;
      
      if (player.isBoosting && player.boost > 0) {
        player.boost = Math.max(0, player.boost - GAME_CONFIG.boost.drainRate / 100 * deltaTime);
      } else if (!player.isBoosting && player.boost < 1.0) {
        player.boost = Math.min(1.0, player.boost + GAME_CONFIG.boost.fillRate / 100 * deltaTime);
      }
    }

    this.updateBullets(deltaTime);
  }

  updateBullets(deltaTime) {
    const now = Date.now();

    this.gameRoom.gameState.bullets = this.gameRoom.gameState.bullets.filter(bullet => {

      const age = now - bullet.created;
      const maxAge = GAME_CONFIG.combat.bulletLifetime * 1000;
      
      if (age > maxAge) {
        return false;
      }

      if (bullet.lifeDistance && bullet.spawnPosition) {
        const dx = bullet.position.x - bullet.spawnPosition.x;
        const dy = bullet.position.y - bullet.spawnPosition.y;
        const dz = bullet.position.z - bullet.spawnPosition.z;
        const traveled = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (traveled >= bullet.lifeDistance) {
          return false;
        }
      }

      bullet.position.x += bullet.velocity.x * deltaTime;
      bullet.position.y += bullet.velocity.y * deltaTime;
      bullet.position.z += bullet.velocity.z * deltaTime;

      return true;
    });
    
  }

  handlePlayerInput(playerId, input) {
    const player = this.gameRoom.gameState.players[playerId];
    if (!player || !input) return;
    
  }
}
