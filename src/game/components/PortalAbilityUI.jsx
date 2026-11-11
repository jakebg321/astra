import React from 'react';
import './PortalAbilityUI.css';

const PortalAbilityUI = ({ portalAbility }) => {
  if (!portalAbility) return null;

  const { isDeploying, cooldownEndTime, cooldownDuration, distance, mode, beaconPosition, beaconPlacedAt, beaconDuration, recallCooldownEndTime } = portalAbility;
  const now = Date.now();
  const isOnCooldown = now < cooldownEndTime;
  const cooldownRemaining = Math.max(0, cooldownEndTime - now);
  const cooldownProgress = isOnCooldown
    ? (cooldownDuration - cooldownRemaining) / cooldownDuration
    : 1;
  const isBeaconMode = mode === 'beacon';
  const hasBeacon = !!beaconPosition;
  const beaconTimeLeft = hasBeacon && beaconPlacedAt ? Math.max(0, (beaconDuration || 20000) - (now - beaconPlacedAt)) : 0;
  const recallOnCooldown = now < (recallCooldownEndTime || 0);

  return (
    <>
      {isDeploying && (
        <div className="portal-mode-overlay">
          <div className="portal-mode-border" />
        </div>
      )}

      <div className={`portal-ability-ui ${isDeploying ? 'deploying' : 'idle'}`}>
        <div className="portal-ability-button">
        <div className={`portal-icon ${isOnCooldown ? 'cooldown' : 'ready'}`}>
          {isBeaconMode ? '📍' : '🌀'}
          {isOnCooldown && (
            <div className="cooldown-overlay">
              <div className="cooldown-text">
                {Math.ceil(cooldownRemaining / 1000)}s
              </div>
              <svg className="cooldown-circle">
                <circle
                  cx="24"
                  cy="24"
                  r="22"
                  fill="none"
                  stroke="rgba(139, 0, 255, 0.3)"
                  strokeWidth="4"
                  strokeDasharray={`${138.23 * cooldownProgress} 138.23`}
                  transform="rotate(-90 24 24)"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      <div className="portal-mode-label" style={{ color: isBeaconMode ? '#ffaa00' : '#aa00ff', fontSize: '10px', textAlign: 'center', marginTop: '2px', fontWeight: 'bold' }}>
        {isBeaconMode ? 'BEACON' : 'INSTANT'}
      </div>

      {isDeploying && (
        <div className="portal-deployment">
          <div className="deployment-phase">
            {isBeaconMode ? 'Place Beacon' : 'Place Portal'}
          </div>
          <div className="portal-distance">
            Distance: {Math.round(distance || 50)} units
          </div>
          <div className="deployment-controls">
            <span className="control-hint">Left Click - Place</span>
            <span className="control-hint">Scroll - Adjust Distance</span>
            <span className="control-hint">Right Click - Cancel</span>
          </div>
        </div>
      )}

      {hasBeacon && !isDeploying && (
        <div className="portal-deployment" style={{ borderColor: '#ffaa00' }}>
          <div className="deployment-phase" style={{ color: '#ffaa00' }}>
            BEACON ACTIVE — {Math.ceil(beaconTimeLeft / 1000)}s
          </div>
          <div className="deployment-controls">
            <span className="control-hint">3 - Warp to Beacon</span>
            <span className="control-hint">F - Recall{recallOnCooldown ? ` (${Math.ceil(((recallCooldownEndTime || 0) - now) / 1000)}s)` : ''}</span>
          </div>
        </div>
      )}

      {!isDeploying && !isOnCooldown && !hasBeacon && (
        <div className="portal-hint">
          Press 1 to deploy {isBeaconMode ? 'beacon' : 'portal'} · V to switch mode
        </div>
      )}
      </div>
    </>
  );
};

export default PortalAbilityUI;
