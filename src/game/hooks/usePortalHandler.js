import { useEffect } from 'react';

export const usePortalHandler = (playerPosition, playerVelocity) => {

  useEffect(() => {
    if (!playerPosition || !playerVelocity) return;

    const handlePortalTeleport = (event) => {
      const { destination } = event.detail || {};
      
      if (destination && playerPosition && playerVelocity) {
        playerPosition.set(destination.x, destination.y, destination.z);
        playerVelocity.set(0, 0, 0);

        if (window.gameMovementState) {
          window.gameMovementState.position.set(destination.x, destination.y, destination.z);
          window.gameMovementState.velocity.set(0, 0, 0);
        }
        
        if (window.localShipRef && window.localShipRef.position) {
          window.localShipRef.position.set(destination.x, destination.y, destination.z);
        }
        
        if (window.gameCamera) {
          window.gameCamera.position.set(destination.x, destination.y, destination.z);
        }
        
        if (window.cameraState) {
          window.cameraState.position.set(destination.x, destination.y, destination.z);
          window.cameraState.lastPosition.set(destination.x, destination.y, destination.z);
          window.cameraState.lookAtTarget.set(destination.x, destination.y + 1.5, destination.z);
          window.cameraState.velocity.set(0, 0, 0);
          window.cameraState.lookAtVelocity.set(0, 0, 0);
          window.cameraState.smoothVelocity.set(0, 0, 0);
          window.cameraState.calculatedVelocity.set(0, 0, 0);
        }

        const lockDurationMs = 120;
        const lockTimestamp = Date.now();
        window.portalTeleportLock = {
          active: true,
          position: destination,
          timestamp: lockTimestamp,
          durationMs: lockDurationMs,
          unlockAt: lockTimestamp + lockDurationMs
        };

        window.dispatchEvent(new CustomEvent('force-position-sync', {
          detail: { position: destination }
        }));
      }
    };

    window.addEventListener('portal-teleport', handlePortalTeleport);
    
    return () => {
      window.removeEventListener('portal-teleport', handlePortalTeleport);
    };
  }, [playerPosition, playerVelocity]);

  return {

  };
};
