import React from 'react';

export default function ArenaToggles({ layers, onChange, cameraPreset, onCameraChange }) {
  const buttonStyle = (isActive) => ({
    background: isActive ? '#1a3a5a' : 'rgba(10,10,30,0.82)',
    color: isActive ? '#44aaff' : '#667788',
    fontSize: '11px',
    fontFamily: "'Courier New', monospace",
    border: `1px solid ${isActive ? '#2266aa' : '#1a2a3a'}`,
    borderRadius: '3px',
    padding: '5px 10px',
    cursor: 'pointer',
    letterSpacing: '0.5px',
    transition: 'all 0.15s'
  });

  const cameraButtonStyle = (preset) => ({
    background: cameraPreset === preset ? '#2a4a6a' : 'rgba(10,10,30,0.82)',
    color: cameraPreset === preset ? '#88ccff' : '#556677',
    fontSize: '10px',
    fontFamily: "'Courier New', monospace",
    border: `1px solid ${cameraPreset === preset ? '#4488aa' : '#1a2a3a'}`,
    borderRadius: '3px',
    padding: '4px 8px',
    cursor: 'pointer',
    letterSpacing: '0.5px',
    transition: 'all 0.15s'
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: '14px',
        right: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        zIndex: 10
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '8px',
          padding: '8px',
          background: 'rgba(8,8,20,0.6)',
          borderRadius: '4px',
          border: '1px solid #1a2a3a'
        }}
      >
        <span style={{ color: '#445566', fontSize: '9px', marginRight: '4px', alignSelf: 'center' }}>CAM:</span>
        <button style={cameraButtonStyle('overview')} onClick={() => onCameraChange('overview')}>Overview</button>
        <button style={cameraButtonStyle('topdown')} onClick={() => onCameraChange('topdown')}>Top</button>
        <button style={cameraButtonStyle('p1pov')} onClick={() => onCameraChange('p1pov')}>P1 POV</button>
        <button style={cameraButtonStyle('p2pov')} onClick={() => onCameraChange('p2pov')}>P2 POV</button>
      </div>

      <button style={buttonStyle(layers.danger)} onClick={() => onChange({ ...layers, danger: !layers.danger })}>Danger View</button>
      <button style={buttonStyle(layers.shadows)} onClick={() => onChange({ ...layers, shadows: !layers.shadows })}>Shadow Cones</button>
      <button style={buttonStyle(layers.rings)} onClick={() => onChange({ ...layers, rings: !layers.rings })}>Time Rings</button>
      <button style={buttonStyle(layers.threat)} onClick={() => onChange({ ...layers, threat: !layers.threat })}>Threat Volume</button>
    </div>
  );
}
