import React, { useState, useEffect } from 'react';

const ThrusterDebugPositioner = ({ onPositionChange, initialPosition = [0, -1.2, 2.5] }) => {
  const [position, setPosition] = useState(initialPosition);
  const [isVisible, setIsVisible] = useState(true);

  const stepSize = 0.1;

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (!isVisible) return;
      
      let newPosition = [...position];
      let changed = false;

      switch(event.key.toLowerCase()) {
        case 'u':
          newPosition[1] += stepSize;
          changed = true;
          break;
        case 'j':
          newPosition[1] -= stepSize;
          changed = true;
          break;
        case 'h':
          newPosition[0] -= stepSize;
          changed = true;
          break;
        case 'k':
          newPosition[0] += stepSize;
          changed = true;
          break;
        case 'i':
          newPosition[2] -= stepSize;
          changed = true;
          break;
        case 'm':
          newPosition[2] += stepSize;
          changed = true;
          break;
        case 'p':
          setIsVisible(!isVisible);
          break;
        case 'r':
          newPosition = [...initialPosition];
          changed = true;
          break;
      }

      if (changed) {
        setPosition(newPosition);
        onPositionChange?.(newPosition);
        window.thrusterDebugPosition = newPosition;
        console.log('Thruster position updated:', {
          x: newPosition[0].toFixed(2),
          y: newPosition[1].toFixed(2), 
          z: newPosition[2].toFixed(2)
        });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [position, isVisible, onPositionChange, initialPosition]);

  const savePosition = () => {
    localStorage.setItem('thrusterPosition', JSON.stringify(position));
    console.log('Thruster position saved:', position);
  };

  const saveAsDefault = () => {
    console.log('COPY THIS TO CODE:');
    console.log(`Default position: [${position[0].toFixed(2)}, ${position[1].toFixed(2)}, ${position[2].toFixed(2)}]`);
    console.log('Update both ShipRenderer.jsx and MultiplayerGame.jsx with this position');
    
    localStorage.setItem('thrusterPosition', JSON.stringify(position));
    localStorage.setItem('thrusterDefaultPosition', JSON.stringify(position));
  };

  const loadPosition = () => {
    const saved = localStorage.getItem('thrusterPosition');
    if (saved) {
      const loadedPosition = JSON.parse(saved);
      setPosition(loadedPosition);
      onPositionChange?.(loadedPosition);
      console.log('Thruster position loaded:', loadedPosition);
    }
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 9999,
      border: '1px solid #444',
      minWidth: '250px'
    }}>
      <div style={{ 
        borderBottom: '1px solid #444', 
        paddingBottom: '10px', 
        marginBottom: '10px',
        fontWeight: 'bold'
      }}>
        🚀 THRUSTER DEBUG
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <div><strong>Position:</strong></div>
        <div>X: {position[0].toFixed(2)} (Left/Right)</div>
        <div>Y: {position[1].toFixed(2)} (Up/Down)</div>
        <div>Z: {position[2].toFixed(2)} (Forward/Back)</div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div><strong>Controls:</strong></div>
        <div>U - Move Up</div>
        <div>J - Move Down</div>
        <div>H - Move Left</div>
        <div>K - Move Right</div>
        <div>I - Move Forward</div>
        <div>M - Move Backward</div>
        <div>R - Reset Position</div>
        <div>P - Toggle Panel</div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button 
          onClick={savePosition}
          style={{
            background: '#2d5a2d',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          Save
        </button>
        <button 
          onClick={loadPosition}
          style={{
            background: '#2d2d5a',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          Load
        </button>
        <button 
          onClick={saveAsDefault}
          style={{
            background: '#5a2d2d',
            color: 'white',
            border: 'none',
            padding: '5px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          Set Default
        </button>
      </div>
    </div>
  );
};

export default ThrusterDebugPositioner; 