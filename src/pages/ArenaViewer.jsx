import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import arenaData from '../game/data/arena-viewer.json';
import ArenaScene from '../game/components/arena/ArenaScene';
import ArenaOverlay from '../game/components/arena/ArenaOverlay';
import ArenaToggles from '../game/components/arena/ArenaToggles';
import ArenaInfoPanel from '../game/components/arena/ArenaInfoPanel';

export default function ArenaViewer() {
  const [layers, setLayers] = useState({ danger: false, shadows: false, rings: false, threat: false });
  const [clickResult, setClickResult] = useState(null);
  const [playerPos, setPlayerPos] = useState(arenaData.spawns.p1);
  const [cameraPreset, setCameraPreset] = useState('overview');

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#080810', position: 'relative' }}>
      <Canvas camera={{ position: [900, 700, 900], fov: 50, near: 10, far: 15000 }}>
        <ArenaScene 
          data={arenaData} 
          layers={layers} 
          onCellClick={setClickResult}
          playerPos={playerPos}
          setPlayerPos={setPlayerPos}
          cameraPreset={cameraPreset}
        />
      </Canvas>
      <ArenaInfoPanel data={arenaData} playerPos={playerPos} clickResult={clickResult} />
      <ArenaToggles 
        layers={layers} 
        onChange={setLayers} 
        cameraPreset={cameraPreset}
        onCameraChange={setCameraPreset}
      />
      <ArenaOverlay result={clickResult} />
    </div>
  );
}
