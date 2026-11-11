import React from 'react';
import { OrbitControls } from '@react-three/drei';
import ArenaBox from './ArenaBox';
import VolumetricHeatmap from './VolumetricHeatmap';
import PlanetMeshes from './PlanetMeshes';
import PlanetLabels from './PlanetLabels';
import SpawnMarkers from './SpawnMarkers';
import FirstContactZone from './FirstContactZone';
import ShadowCones from './ShadowCones';
import TimeRings from './TimeRings';
import EngagementCorridor from './EngagementCorridor';
import ClickAnalyzer from './ClickAnalyzer';
import CameraController from './CameraController';

export default function ArenaScene({ data, layers, onCellClick, playerPos, setPlayerPos, cameraPreset }) {
  return (
    <>
      <fog attach="fog" args={[0x080810, 4000, 12000]} />
      
      <CameraController preset={cameraPreset} />
      

      <OrbitControls
        makeDefault
        minDistance={0}
        maxDistance={6000}
        enableDamping
        dampingFactor={0.08}
        target={[0, 0, 0]}
      />
      
      <ArenaBox size={data.arena} />
      

      <VolumetricHeatmap 
        cells={data.heatmap.cells} 
        dangerMode={layers.danger} 
      />
      

      <PlanetMeshes planets={data.planets} />
      
      <PlanetLabels planets={data.planets} />
      

      <SpawnMarkers 
        spawns={data.spawns} 
        playerPos={playerPos}
      />
      
      <FirstContactZone point={data.firstContact} />
      

      <ShadowCones 
        planets={data.planets} 
        spawns={data.spawns} 
        playerPos={playerPos}
        visible={layers.shadows} 
        arenaSize={data.arena}
      />
      

      <TimeRings 
        spawns={data.spawns} 
        playerPos={playerPos}
        speedNormal={data.combat.speedNormal} 
        visible={layers.rings} 
      />
      

      <EngagementCorridor
        spawns={data.spawns}
        planets={data.planets}
        arenaSize={data.arena}
        visible={layers.threat}
      />
      
      <ClickAnalyzer 
        data={data} 
        onCellClick={onCellClick}
        playerPos={playerPos}
        setPlayerPos={setPlayerPos}
      />
    </>
  );
}
