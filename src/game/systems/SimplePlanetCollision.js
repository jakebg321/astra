

export class SimplePlanetCollision {
  constructor(planets) {
    this.planets = planets;
    this.gameStartTime = performance.now();
    
    console.log(`Simple collision system ready for ${planets.length} planets`);
  }
  
  checkCollision(playerX, playerY, playerZ) {
    const currentTime = performance.now();
    const gameTime = (currentTime - this.gameStartTime) / 1000;
    
    for (const planet of this.planets) {

      const angle = gameTime * planet.speed + (planet.orbitOffset || 0);
      const planetX = planet.distance * Math.cos(angle);
      const planetZ = planet.distance * Math.sin(angle);
      const planetY = 0;

      const dx = playerX - planetX;
      const dy = playerY - planetY;
      const dz = playerZ - planetZ;
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

      if (distance < planet.size) {
        console.log(`SIMPLE COLLISION: ${planet.name} (distance: ${distance.toFixed(1)}, size: ${planet.size})`);
        
        return {
          planet: planet.name,
          planetPosition: { x: planetX, y: planetY, z: planetZ },
          distance: distance,
          pushDirection: {
            x: dx / distance,
            y: dy / distance,
            z: dz / distance
          }
        };
      }
    }
    
    return null;
  }

  getCurrentRotation(planetName) {
    const currentTime = performance.now();
    const gameTime = (currentTime - this.gameStartTime) / 1000;
    const planet = this.planets.find(p => p.name === planetName);
    
    if (!planet) return 0;
    return gameTime * planet.speed + (planet.orbitOffset || 0);
  }

  testCollisionAtPosition(x, y, z) {
    const collision = this.checkCollision(x, y, z);
    if (collision) {
      console.log(`SIMPLE TEST COLLISION at (${x}, ${y}, ${z}):`, collision);
    } else {
      console.log(`SIMPLE: NO COLLISION at (${x}, ${y}, ${z})`);
    }
    return collision;
  }
}