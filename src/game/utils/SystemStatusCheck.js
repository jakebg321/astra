

export const SystemStatusCheck = {
  checkPlanetSystem() {
    const results = {
      planetSystemExists: !!window.planetZoneSystem,
      systemType: window.planetZoneSystem?.constructor?.name || 'unknown',
      planetsCount: window.planetZoneSystem?.planets?.length || 0,
      collisionMethod: typeof window.planetZoneSystem?.checkCollision,
      rotationMethod: typeof window.planetZoneSystem?.getCurrentRotation,
      testMethod: typeof window.planetZoneSystem?.testCollisionAtPosition
    };
    
    console.log('PLANET SYSTEM STATUS:', results);
    return results;
  },
  
  testPlanetCollision() {
    if (!window.planetZoneSystem) {
      console.error('No planet system found!');
      return false;
    }

    const mercuryTest = window.planetZoneSystem.testCollisionAtPosition(250, 0, 0);
    console.log('Mercury orbit test:', mercuryTest ? 'COLLISION' : 'NO COLLISION');

    const safeTest = window.planetZoneSystem.testCollisionAtPosition(0, 0, 0);
    console.log('Origin test:', safeTest ? 'COLLISION' : 'NO COLLISION');
    
    return true;
  },
  
  checkMultiplayerStatus() {
    const ws = window.getWebSocketInstance?.();
    const results = {
      webSocketExists: !!ws,
      connectionExists: !!(ws?.connection),
      isConnected: ws?.connection?.isConnected || false,
      gameStateManager: !!ws?.gameStateManager,
      hasSetPlayerName: typeof ws?.gameStateManager?.setPlayerName === 'function'
    };
    
    console.log('MULTIPLAYER STATUS:', results);
    return results;
  },
  
  runFullCheck() {
    console.log('=== SYSTEM STATUS CHECK ===');
    
    const planetStatus = this.checkPlanetSystem();
    const multiplayerStatus = this.checkMultiplayerStatus();
    
    const overall = {
      planetSystemWorking: planetStatus.planetSystemExists && planetStatus.systemType === 'SimplePlanetCollision',
      multiplayerWorking: multiplayerStatus.webSocketExists && multiplayerStatus.hasSetPlayerName,
      allSystemsGo: false
    };
    
    overall.allSystemsGo = overall.planetSystemWorking && overall.multiplayerWorking;
    
    console.log('OVERALL STATUS:', overall);
    
    if (overall.allSystemsGo) {
      console.log('ALL SYSTEMS WORKING - Ready to test planet collision!');
      this.testPlanetCollision();
    } else {
      console.log('Some systems need attention');
    }
    
    return overall;
  }
};

if (typeof window !== 'undefined') {
  window.checkSystemStatus = () => SystemStatusCheck.runFullCheck();
  window.testPlanetCollision = (x = 250, y = 0, z = 0) => {
    if (window.planetZoneSystem) {
      return window.planetZoneSystem.testCollisionAtPosition(x, y, z);
    }
    console.error('No planet system found!');
    return null;
  };
}