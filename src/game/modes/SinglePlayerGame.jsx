import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import PlayerController from '../components/PlayerController';
import EnvironmentRenderer from '../renderers/EnvironmentRenderer';
import GameHUD from '../components/GameHUD';
import { HDRSkybox } from '../components/HDRSwitcher';
import { BoundaryWithMarkers } from '../components/BoundaryMesh';
import CockpitView from '../components/CockpitView.jsx';
import * as THREE from 'three';
import MasterRenderLoopDriver from '../components/MasterRenderLoopDriver';

const SinglePlayerGame = ({ playerName, onLeaveGame }) => {
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerBoost, setPlayerBoost] = useState(100);
  const [weaponHeat, setWeaponHeat] = useState(0);
  const [isOverheated, setIsOverheated] = useState(false);

  const [testConfig, setTestConfig] = useState({
    enableShip: true,
    enableEnvironment: true,
    enableHUD: true,
    enableCrosshair: true,
    enableShadows: true,
    enableFog: true,
    enableHDR: true,
    enableLighting: true,
    staticCamera: false,
    justRedCube: false,
    enablePOVMode: false,
    selectedCockpitModel: 0
  });

  const COCKPIT_PRESETS = [
    {
      name: 'New Chopped',
      selectedModel: 0,
      transform: {
        position: { x: 0, y: -0.24, z: -0.21 },
        rotation: { x: -0.02, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      }
    },
    {
      name: 'Space Fighter Wasp', 
      selectedModel: 1,
      transform: {
        position: { x: 0, y: -2.97, z: -0.92 },
        rotation: { x: -0.16, y: 3.1384, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      }
    },
    {
      name: 'Spitfire Cockpit',
      selectedModel: 2,
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      }
    },
    {
      name: 'Spaceship Interior (with textures)',
      selectedModel: 3,
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      }
    },
    {
      name: 'ASTRA Cockpit',
      selectedModel: 4,
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      }
    }
  ];

  const [cockpitTransform, setCockpitTransform] = useState(COCKPIT_PRESETS[testConfig.selectedCockpitModel].transform);

  const toggleTest = (key) => {
    setTestConfig(prev => {
      const newConfig = { ...prev, [key]: !prev[key] };
      console.log(`TOGGLED ${key}:`, newConfig[key]);

      return newConfig;
    });
  };

  useEffect(() => {

    const mockWebSocket = {
      sendInput: () => {},
      updateBullets: () => {},
      getOtherPlayers: () => ({}),
      send: () => {},
      on: () => {},
      off: () => {},
      gameStateManager: {
        playerId: 'single-player',
        playerName: playerName,
        currentRoom: { players: [{ id: 'single-player', name: playerName }] },
        gameState: { 
          players: {
            'single-player': {
              id: 'single-player',
              name: playerName,
              position: { x: 0, y: 50, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              health: 100,
              boost: 100
            }
          }, 
          bullets: [] 
        }
      }
    };
    
    window.getWebSocketInstance = () => mockWebSocket;

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('game-started'));

      const setSpawnPosition = () => {
        let success = false;
        
        if (window.gameStateRef?.current) {
          window.gameStateRef.current.position.set(0, 50, 0);
          window.gameStateRef.current.initialized = true;
          console.log('Set spawn via gameStateRef');
          success = true;
        }
        
        if (window.playerMovementRef?.current) {
          window.playerMovementRef.current.gameState.position = { x: 0, y: 50, z: 0 };
          window.playerMovementRef.current.gameState.initialized = true;
          console.log('Set spawn via playerMovementRef');
          success = true;
        }
        
        window.dispatchEvent(new CustomEvent('single-player-spawn', {
          detail: { position: { x: 0, y: 50, z: 0 }, initialized: true }
        }));
        
        return success;
      };

      if (!setSpawnPosition()) {
        const spawnInterval = setInterval(() => {
          if (setSpawnPosition()) {
            clearInterval(spawnInterval);
          }
        }, 100);

        setTimeout(() => {
          clearInterval(spawnInterval);

          window.dispatchEvent(new CustomEvent('force-single-player-spawn', {
            detail: { position: { x: 0, y: 50, z: 0 } }
          }));
          console.log('Forced single player spawn via event');
        }, 3000);
      }
    }, 100);
    
    return () => {
      if (window.getWebSocketInstance) {
        delete window.getWebSocketInstance;
      }
    };
  }, [playerName]);

  return (
    <>
      <div className="absolute top-4 right-4 z-[9999] bg-black/90 border border-red-500 p-4 text-white font-mono text-xs max-w-xs">
        <div className="text-red-400 font-bold mb-2">Performance test</div>
        
        <div className="grid grid-cols-2 gap-1 text-xs">
          {Object.entries(testConfig).filter(([key]) => key !== 'selectedCockpitModel').map(([key, value]) => (
            <button
              key={key}
              onClick={() => toggleTest(key)}
              className={`px-1 py-0.5 border text-xs ${
                value ? 'bg-green-900 border-green-500 text-green-300' : 'bg-red-900 border-red-500 text-red-300'
              }`}
            >
              {key.replace('enable', '').replace('just', '').replace('static', 'stat')}: {value ? 'ON' : 'OFF'}
            </button>
          ))}
        </div>
        
        {testConfig.enablePOVMode && (
          <div className="mt-2 border-t border-gray-600 pt-2">
            <div className="text-cyan-400 text-xs mb-1">Cockpit Model:</div>
            <select 
              value={testConfig.selectedCockpitModel}
              onChange={(e) => {
                const newIndex = parseInt(e.target.value);
                setTestConfig(prev => ({...prev, selectedCockpitModel: newIndex}));
                setCockpitTransform(COCKPIT_PRESETS[newIndex].transform);
              }}
              className="w-full bg-gray-800 border border-gray-600 text-white text-xs p-1"
            >
              {COCKPIT_PRESETS.map((preset, index) => (
                <option key={index} value={index}>{preset.name}</option>
              ))}
            </select>
          </div>
        )}
        
        <div className="mt-2 text-yellow-400 text-xs">
          Click buttons to isolate lag source!
        </div>
      </div>

      {testConfig.enablePOVMode && (
        <div className="absolute top-4 left-4 z-[9999] bg-black/90 border border-cyan-500 p-4 text-white font-mono text-xs max-w-md">
          <div className="text-cyan-400 font-bold mb-2">🎯 COCKPIT POSITIONING</div>
          
          <div className="space-y-2">
            <div className="text-yellow-400 text-xs font-bold">Position</div>
            {['x', 'y', 'z'].map(axis => (
              <div key={axis} className="flex items-center gap-2">
                <span className="w-4 text-cyan-300">{axis.toUpperCase()}:</span>
                <input
                  type="range"
                  min={axis === 'z' ? -10 : -5}
                  max={axis === 'z' ? 10 : 5}
                  step="0.01"
                  value={cockpitTransform.position[axis]}
                  onChange={(e) => setCockpitTransform(prev => ({
                    ...prev,
                    position: { ...prev.position, [axis]: parseFloat(e.target.value) }
                  }))}
                  className="flex-1"
                />
                <input
                  type="number"
                  step="0.01"
                  value={cockpitTransform.position[axis]}
                  onChange={(e) => setCockpitTransform(prev => ({
                    ...prev,
                    position: { ...prev.position, [axis]: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-16 bg-gray-800 border border-gray-600 text-white text-xs p-1"
                />
              </div>
            ))}
          </div>
          
          <div className="space-y-2 mt-3">
            <div className="text-yellow-400 text-xs font-bold">Rotation</div>
            {['x', 'y', 'z'].map(axis => (
              <div key={axis} className="flex items-center gap-2">
                <span className="w-4 text-cyan-300">{axis.toUpperCase()}:</span>
                <input
                  type="range"
                  min="-3.14159"
                  max="3.14159"
                  step="0.01"
                  value={cockpitTransform.rotation[axis]}
                  onChange={(e) => setCockpitTransform(prev => ({
                    ...prev,
                    rotation: { ...prev.rotation, [axis]: parseFloat(e.target.value) }
                  }))}
                  className="flex-1"
                />
                <input
                  type="number"
                  step="0.01"
                  value={cockpitTransform.rotation[axis]}
                  onChange={(e) => setCockpitTransform(prev => ({
                    ...prev,
                    rotation: { ...prev.rotation, [axis]: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-16 bg-gray-800 border border-gray-600 text-white text-xs p-1"
                />
              </div>
            ))}
          </div>
          
          <div className="mt-3 p-2 bg-gray-800 rounded text-xs">
            <div className="text-green-400 font-bold mb-1">Current Values:</div>
            <div>Pos: {cockpitTransform.position.x.toFixed(2)}, {cockpitTransform.position.y.toFixed(2)}, {cockpitTransform.position.z.toFixed(2)}</div>
            <div>Rot: {cockpitTransform.rotation.x.toFixed(2)}, {cockpitTransform.rotation.y.toFixed(4)}, {cockpitTransform.rotation.z.toFixed(2)}</div>
          </div>
        </div>
      )}

      {testConfig.enableHUD && (
        <GameHUD 
          playerHealth={playerHealth}
          playerBoost={playerBoost}
          weaponHeat={weaponHeat}
          isOverheated={isOverheated}
          showDebugInfo={true}
        />
      )}
      
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-black/70 border border-purple-500/50 px-4 py-2 text-purple-400 font-bold">
          Single-player performance test
        </div>
      </div>

      <Canvas 
        key={`${testConfig.justRedCube}-${testConfig.enableShadows}-${testConfig.enableHDR}-${testConfig.staticCamera}`}
        className="absolute inset-0 z-0"
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: "high-performance"
        }}
        camera={testConfig.staticCamera ? 
          { position: [0, 60, 60], fov: 75 } :
          { position: [0, 55, 60], fov: 75 }
        }
        onCreated={({ gl, camera, scene }) => {
          gl.setClearColor('#000000', 0);

          if (testConfig.enableShadows) {
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
          } else {
            gl.shadowMap.enabled = false;
          }
          
          window.gameRenderer = gl;
          window.gameCamera = camera;
          window.gameScene = scene;

          if (testConfig.staticCamera) {
            camera.position.set(0, 60, 60);
            camera.lookAt(0, 50, 0);
          }
        }}
      >
        {testConfig.justRedCube && (
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2, 2, 2]} />
            <meshBasicMaterial color="red" />
          </mesh>
        )}
        

        {!testConfig.justRedCube && (
          <>
            {testConfig.enableHDR && <HDRSkybox />}
            
            {testConfig.enableLighting && (
              <>
                <ambientLight intensity={0.3} />
                <directionalLight 
                  position={[50, 50, 25]} 
                  intensity={1.0}
                  castShadow={testConfig.enableShadows}
                  shadow-mapSize-width={testConfig.enableShadows ? 2048 : 512}
                  shadow-mapSize-height={testConfig.enableShadows ? 2048 : 512}
                  shadow-camera-far={200}
                  shadow-camera-left={-50}
                  shadow-camera-right={50}
                  shadow-camera-top={50}
                  shadow-camera-bottom={-50}
                />
              </>
            )}
            
            {testConfig.enableFog && <fog attach="fog" args={['#000008', 50, 200]} />}
            

            <MasterRenderLoopDriver />

            {testConfig.enableShip && !testConfig.enablePOVMode && (
              <PlayerController 
                playerName={playerName}
                onHealthChange={setPlayerHealth}
                onBoostChange={setPlayerBoost}
                onShipStateChange={() => {}}
                onScreenPositionUpdate={() => {}}
              />
            )}
            

            {testConfig.enablePOVMode && (
              <CockpitView 
                selectedModel={COCKPIT_PRESETS[testConfig.selectedCockpitModel].selectedModel}
                cockpitTransform={cockpitTransform}
                lighting={{
                  ambient: 1.2,
                  directional1: 2.0,
                  directional2: 1.5,
                  pointTop: 2.0,
                  pointBottom: 1.8
                }}
              />
            )}
            

            {testConfig.enableEnvironment && (
              <>
                <EnvironmentRenderer />
                <BoundaryWithMarkers />
              </>
            )}
            
          </>
        )}
      </Canvas>
    </>
  );
};

export default SinglePlayerGame; 

