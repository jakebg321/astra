import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, useTexture } from '@react-three/drei';
import PlayerController from '../components/PlayerController';
import EnvironmentRenderer from '../renderers/EnvironmentRenderer';
import BulletsRenderer from '../renderers/BulletsRenderer';
import GameHUD from '../components/GameHUD';
import { HDRSkybox } from '../components/HDRSwitcher';
import { BoundaryWithMarkers } from '../components/BoundaryMesh';
import MasterRenderLoopDriver from '../components/MasterRenderLoopDriver';
import SimpleInputManager from '../systems/SimpleInputManager';
import ControllerTestPanel from '../../components/ControllerTestPanel.jsx';
import ControllerDetectionNotification from '../../components/ControllerDetectionNotification.jsx';
import DebugLaserWeapon from '../components/DebugLaserWeapon.jsx';
import { useDebugTrainingWeapons } from '../hooks/useDebugTrainingWeapons.js';
import { GAME_CONFIG } from '../config/GameConfig.js';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Target, Settings, Eye } from 'lucide-react';
import AudioControls from '../components/AudioControls';

const BulletDebugVisualizer = () => {
  const groupRef = useRef();
  
  useFrame(() => {
    if (!groupRef.current || !window.trainingBullets) return;

    groupRef.current.clear();
    
    window.trainingBullets.slice(0, 3).forEach((bullet, index) => {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 8, 8),
        new THREE.MeshBasicMaterial({ color: index === 0 ? '#ffff00' : '#ff8800' })
      );
      sphere.position.set(bullet.position.x, bullet.position.y, bullet.position.z);
      groupRef.current.add(sphere);
    });
  });
  
  return <group ref={groupRef} />;
};

const TrainingBulletUpdater = ({ bouncingTargetPositions, onTargetHit, showTargets }) => {
  useFrame((state, delta) => {
    if (!window.trainingBullets || window.trainingBullets.length === 0) return;
    
    const now = Date.now();
    
    window.trainingBullets = window.trainingBullets.filter(bullet => {
      const age = now - bullet.created;
      const maxAge = GAME_CONFIG.combat.bulletLifetime * 1000;
      
      if (age > maxAge) {
        return false;
      }

      if (showTargets && bouncingTargetPositions) {
        for (const [targetId, targetPos] of bouncingTargetPositions.current) {
          const distance = Math.sqrt(
            Math.pow(bullet.position.x - targetPos.x, 2) +
            Math.pow(bullet.position.y - targetPos.y, 2) +
            Math.pow(bullet.position.z - targetPos.z, 2)
          );

          if (distance < 10) {
            if (onTargetHit) {
              onTargetHit(targetId);
            }
            return false;
          }
        }
      }
      
      return true;
    });
  });

  return null;
};

const BouncingBullseyeTarget = ({ wallType, id, onHit, isHit, speed, bouncingTargetPositions, color, size = 1.0, movement = false, movementMode = 'stationary', customTexture = null }) => {
  const groupRef = useRef();
  const velocity = useRef({ x: 0, y: 0, z: 0 });
  const position = useRef({ x: 0, y: 0, z: 0 });
  const [destroyed, setDestroyed] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);
  const [pieces, setPieces] = useState([]);
  
  const { camera } = useThree();
  
  const defaultTexture = useTexture('/textures/target.png');
  
  useEffect(() => {
    if (defaultTexture && !customTexture) {
      defaultTexture.rotation = Math.PI;
      defaultTexture.center.set(0.5, 0.5);
      defaultTexture.needsUpdate = true;
    }
  }, [defaultTexture, customTexture]);
  
  const targetTexture = customTexture || defaultTexture;
  
  useEffect(() => {
    const boundarySize = 290;
    const randomSpeed = speed * (0.5 + Math.random() * 1);
    
    switch (wallType) {
      case 'front':
        position.current = {
          x: (Math.random() - 0.5) * 400,
          y: (Math.random() - 0.5) * 400,
          z: boundarySize
        };
        velocity.current = {
          x: (Math.random() - 0.5) * randomSpeed,
          y: (Math.random() - 0.5) * randomSpeed,
          z: 0
        };
        break;
      case 'back':
        position.current = {
          x: (Math.random() - 0.5) * 400,
          y: (Math.random() - 0.5) * 400,
          z: -boundarySize
        };
        velocity.current = {
          x: (Math.random() - 0.5) * randomSpeed,
          y: (Math.random() - 0.5) * randomSpeed,
          z: 0
        };
        break;
      case 'left':
        position.current = {
          x: -boundarySize,
          y: (Math.random() - 0.5) * 400,
          z: (Math.random() - 0.5) * 400
        };
        velocity.current = {
          x: 0,
          y: (Math.random() - 0.5) * randomSpeed,
          z: (Math.random() - 0.5) * randomSpeed
        };
        break;
      case 'right':
        position.current = {
          x: boundarySize,
          y: (Math.random() - 0.5) * 400,
          z: (Math.random() - 0.5) * 400
        };
        velocity.current = {
          x: 0,
          y: (Math.random() - 0.5) * randomSpeed,
          z: (Math.random() - 0.5) * randomSpeed
        };
        break;
      case 'top':
        position.current = {
          x: (Math.random() - 0.5) * 400,
          y: boundarySize,
          z: (Math.random() - 0.5) * 400
        };
        velocity.current = {
          x: (Math.random() - 0.5) * randomSpeed,
          y: 0,
          z: (Math.random() - 0.5) * randomSpeed
        };
        break;
      case 'bottom':
        position.current = {
          x: (Math.random() - 0.5) * 400,
          y: -boundarySize,
          z: (Math.random() - 0.5) * 400
        };
        velocity.current = {
          x: (Math.random() - 0.5) * randomSpeed,
          y: 0,
          z: (Math.random() - 0.5) * randomSpeed
        };
        break;
    }
  }, [wallType, speed]);

  useEffect(() => {
    if (isHit && !destroyed && pieces.length === 0) {
      console.log(`TARGET ${id} BREAKING INTO PIECES!`);

      const newPieces = [];
      for (let i = 0; i < 5; i++) {
        newPieces.push({
          id: i,
          position: { 
            x: position.current.x, 
            y: position.current.y, 
            z: position.current.z 
          },
          velocity: {
            x: (Math.random() - 0.5) * 100,
            y: (Math.random() - 0.5) * 100 + 50,
            z: (Math.random() - 0.5) * 100
          },
          rotation: {
            x: Math.random() * Math.PI * 2,
            y: Math.random() * Math.PI * 2,
            z: Math.random() * Math.PI * 2
          },
          angularVelocity: {
            x: (Math.random() - 0.5) * 10,
            y: (Math.random() - 0.5) * 10,
            z: (Math.random() - 0.5) * 10
          },
          scale: 0.3 + Math.random() * 0.4,
          life: 1.0
        });
      }
      setPieces(newPieces);
      
      setTimeout(() => {
        setDestroyed(true);
        if (onHit) onHit(id);
      }, 3000);
    }
  }, [isHit, destroyed, id, onHit, pieces.length]);

  useFrame((state, delta) => {
    if (!groupRef.current || destroyed) return;
    
    const targetRadius = 10 * size;
    
    if (pieces.length > 0) {
      setPieces(prevPieces => 
        prevPieces.map(piece => ({
          ...piece,
          position: {
            x: piece.position.x + piece.velocity.x * delta,
            y: piece.position.y + piece.velocity.y * delta,
            z: piece.position.z + piece.velocity.z * delta
          },
          velocity: {
            x: piece.velocity.x * 0.98,
            y: piece.velocity.y * 0.98 - 98 * delta,
            z: piece.velocity.z * 0.98
          },
          rotation: {
            x: piece.rotation.x + piece.angularVelocity.x * delta,
            y: piece.rotation.y + piece.angularVelocity.y * delta,
            z: piece.rotation.z + piece.angularVelocity.z * delta
          },
          life: Math.max(0, piece.life - delta * 0.5)
        }))
      );
    } else {
      if (movement && movementMode !== 'stationary') {
        const time = state.clock.elapsedTime;
        
        switch (movementMode) {
          case 'patrol':
            position.current.x += velocity.current.x * delta;
            position.current.y += velocity.current.y * delta;
            position.current.z += velocity.current.z * delta;
            
            const boundary = 280;
            if (Math.abs(position.current.x) > boundary) {
              velocity.current.x *= -1;
              position.current.x = Math.sign(position.current.x) * boundary;
            }
            if (Math.abs(position.current.y) > boundary) {
              velocity.current.y *= -1;
              position.current.y = Math.sign(position.current.y) * boundary;
            }
            if (Math.abs(position.current.z) > boundary) {
              velocity.current.z *= -1;
              position.current.z = Math.sign(position.current.z) * boundary;
            }
            break;
            
          case 'orbital':
            const orbitRadius = 150 + (id * 30);
            const orbitSpeed = speed * 0.01;
            const angle = time * orbitSpeed + (id * Math.PI * 2 / 5);
            
            position.current.x = Math.cos(angle) * orbitRadius;
            position.current.z = Math.sin(angle) * orbitRadius;
            break;
        }
      }
      
      groupRef.current.position.set(position.current.x, position.current.y, position.current.z);

      if (camera) {
        groupRef.current.lookAt(camera.position);
      }
      
      if (bouncingTargetPositions) {
        bouncingTargetPositions.current.set(id, {
          x: position.current.x,
          y: position.current.y,
          z: position.current.z
        });
      }

      if (!window.trainingTargets) {
        window.trainingTargets = [];
      }
      
      const existingIndex = window.trainingTargets.findIndex(t => t.id === id);
      const targetData = {
        id: id,
        x: position.current.x,
        y: position.current.y,
        z: position.current.z,
        color: color,
        radius: targetRadius
      };
      
      if (existingIndex >= 0) {
        window.trainingTargets[existingIndex] = targetData;
      } else {
        window.trainingTargets.push(targetData);
      }
    }
  });

  if (destroyed) {
    return null;
  }

  if (pieces.length > 0) {

    return (
      <group ref={groupRef} position={[position.current.x, position.current.y, position.current.z]}>
        {pieces.map((piece) => (
          <mesh
            key={piece.id}
            position={[
              piece.position.x - position.current.x,
              piece.position.y - position.current.y, 
              piece.position.z - position.current.z
            ]}
            rotation={[piece.rotation.x, piece.rotation.y, piece.rotation.z]}
            scale={[piece.scale * piece.life, piece.scale * piece.life, piece.scale * piece.life]}
          >
            <sphereGeometry args={[5, 16, 16]} />
            <meshBasicMaterial 
              map={targetTexture}
              color="#ffffff"
              transparent={true}
              opacity={piece.life}
            />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group ref={groupRef}>
      <mesh scale={[size, size, size]}>
        <sphereGeometry args={[10, 32, 32]} />
        <meshBasicMaterial 
          map={targetTexture}
          color="#ffffff"
        />
      </mesh>
      

      <mesh scale={[size, size, size]}>
        <sphereGeometry args={[10, 16, 16]} />
        <meshBasicMaterial 
          color="#ff00ff"
          wireframe={true}
          transparent={true}
          opacity={0.3}
        />
      </mesh>
      
    </group>
  );
};

const TrainingTutorial = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-purple-500 rounded-lg p-8 max-w-3xl mx-4">
        <h2 className="text-2xl font-bold text-purple-400 mb-6 flex items-center gap-3">
          <Gamepad2 className="w-8 h-8" />
          Training Mode
        </h2>
        
        <div className="space-y-4 text-gray-300">
          <div>
            <h3 className="text-cyan-300 font-bold mb-2">📋 Training Progression</h3>
            <p>• <span className="text-yellow-400">Phase 1:</span> Movement practice (3 seconds)</p>
            <p>• <span className="text-green-400">Phase 2:</span> Combat training begins</p>
          </div>
          
          <div>
            <h3 className="text-purple-300 font-bold mb-2">🎮 Star Wars Squadrons Controls</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-cyan-400 font-semibold">Flight Controls:</p>
                <p>• WASD / Left Stick: Thrust Vectors</p>
                <p>• Mouse / Right Stick: Look/Turn</p>
                <p>• SHIFT / A/Cross: Boost</p>
                <p>• B/Circle: Brake</p>
              </div>
              <div>
                <p className="text-red-400 font-semibold">Combat Controls:</p>
                <p>• Left Click / Right Trigger: Fire</p>
                <p>• Right Click / Left Trigger: Aim</p>
                <p>• Destroy textured sphere targets</p>
                <p>• Targets explode on impact</p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-green-300 font-bold mb-2">🔧 Testing Features</h3>
            <p>• Press T to open controller test panel</p>
            <p>• Real-time input monitoring and settings</p>
            <p>• Haptic feedback testing</p>
            <p>• Live performance metrics</p>
          </div>
        </div>
        
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-bold transition-colors"
          >
            Start Training
          </button>
        </div>
      </div>
    </div>
  );
};

const TrainingMode = ({ playerName, onLeaveGame }) => {
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerBoost, setPlayerBoost] = useState(100);
  const [weaponHeat, setWeaponHeat] = useState(0);
  const [isOverheated, setIsOverheated] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [targetsHit, setTargetsHit] = useState(0);
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0, z: 0 });
  const [playerRotation, setPlayerRotation] = useState({ pitch: 0, yaw: 0, roll: 0 });
  const [showTargets, setShowTargets] = useState(false);
  const [movementTime, setMovementTime] = useState(0);
  const [hitTargets, setHitTargets] = useState(new Set());
  const [targetSpeed, setTargetSpeed] = useState(50);
  const [showControllerTest, setShowControllerTest] = useState(false);
  const [laserTrajectory, setLaserTrajectory] = useState(null);
  
  const [targetMovement, setTargetMovement] = useState(false);
  const [movementMode, setMovementMode] = useState('stationary');
  const [targetSize, setTargetSize] = useState(1.0);
  const [targetAmount, setTargetAmount] = useState(5);
  const [autoRespawn, setAutoRespawn] = useState(false);
  const [forceReset, setForceReset] = useState(0);
  const [customTexture, setCustomTexture] = useState(null);

  const handleTextureUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      console.log('UPLOADING CUSTOM TEXTURE:', file.name, file.type);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const texture = new THREE.Texture(img);
          texture.needsUpdate = true;
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;

          texture.rotation = Math.PI;
          texture.center.set(0.5, 0.5);
          
          setCustomTexture(texture);
          setForceReset(prev => prev + 1);
          console.log('CUSTOM TEXTURE LOADED and applied to targets');
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTargetHit = (targetId) => {
    if (!hitTargets.has(targetId)) {
      setHitTargets(prev => new Set([...prev, targetId]));
      setTargetsHit(prev => prev + 1);
      console.log(`TARGET ${targetId} DESTROYED! Total destroyed: ${targetsHit + 1}`);
      
      if (autoRespawn) {
        setTimeout(() => {
          setHitTargets(prev => {
            const newSet = new Set(prev);
            newSet.delete(targetId);
            return newSet;
          });
          console.log(`TARGET ${targetId} RESPAWNED!`);
        }, 3000);
      }
    }
  };

  const { localBullets } = useDebugTrainingWeapons(playerPosition, playerRotation, handleTargetHit);

  useEffect(() => {
    const timer = setInterval(() => {
      setMovementTime(prev => {
        const newTime = prev + 0.1;
        if (newTime >= 3 && !showTargets) {
          setShowTargets(true);
        }
        return newTime;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [showTargets]);
  
  useEffect(() => {
    setHitTargets(new Set());
    setTargetsHit(0);
  }, [targetAmount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const inputManager = SimpleInputManager.getInstance();
        if (inputManager.canvas !== canvas) {
          console.log('Updating InputManager canvas reference');
          inputManager.canvas = canvas;
        }
        
        const handleClick = () => {
          if (document.pointerLockElement !== canvas) {
            canvas.requestPointerLock().catch(err => {
              console.log('Pointer lock failed:', err.message);
            });
          }
        };
        
        canvas.addEventListener('click', handleClick);
        return () => canvas.removeEventListener('click', handleClick);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const wallTargets = useMemo(() => {
    const wallTypes = ['front', 'back', 'left', 'right', 'top', 'bottom'];
    const colors = ['red', 'green', 'blue', 'yellow', 'purple', 'cyan', 'orange', 'pink', 'lime', 'magenta'];
    const targets = [];
    
    for (let i = 0; i < targetAmount; i++) {
      targets.push({
        id: i,
        wallType: wallTypes[i % wallTypes.length],
        globalId: `${i}_${forceReset}`,
        color: colors[i % colors.length]
      });
    }
    
    return targets;
  }, [targetAmount, forceReset]);

  const bouncingTargetPositions = useRef(new Map());

  const handleTrajectoryUpdate = (trajectory) => {
    setLaserTrajectory(trajectory);
    
    if (showTargets && window.trainingTargets && trajectory) {
      window.trainingTargets.forEach((target) => {
        const targetPos = new THREE.Vector3(target.x, target.y, target.z);
        const rayOrigin = new THREE.Vector3(trajectory.spawn.x, trajectory.spawn.y, trajectory.spawn.z);
        const rayDirection = new THREE.Vector3(trajectory.direction.x, trajectory.direction.y, trajectory.direction.z);
        
        const ray = new THREE.Ray(rayOrigin, rayDirection);
        const distanceToTarget = ray.distanceToPoint(targetPos);
        
        if (distanceToTarget <= target.radius) {
          console.log(`LASER INTERSECTS ${target.color} TARGET - Distance: ${distanceToTarget.toFixed(1)}u`);
        }
      });
    }
  };

  return (
    <div className="w-full h-screen relative bg-black overflow-hidden">
      {showTutorial && (
        <TrainingTutorial onClose={() => setShowTutorial(false)} />
      )}


      <Canvas
        shadows
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
        gl={{ 
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true
        }}
      >

        <PerspectiveCamera 
          makeDefault 
          position={[0, 5, 10]} 
          near={0.1}
          far={5000}
          fov={75}
        />
        

        <ambientLight intensity={0.4} color="#ffffff" />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={1.2} 
          color="#ffffff"
          castShadow 
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <hemisphereLight 
          skyColor="#87CEEB" 
          groundColor="#362907" 
          intensity={0.6} 
        />

        <HDRSkybox />


        <MasterRenderLoopDriver />


        <DebugLaserWeapon 
          playerPosition={playerPosition}
          playerRotation={playerRotation}
          onTrajectoryUpdate={handleTrajectoryUpdate}
        />


        <PlayerController 
          playerName={playerName}
          health={0}
          boost={playerBoost}
          weaponHeat={0}
          isOverheated={false}
          onHealthChange={setPlayerHealth}
          onBoostChange={setPlayerBoost}
          onWeaponHeatChange={setWeaponHeat}
          onOverheatChange={setIsOverheated}
          onPositionChange={setPlayerPosition}
          onRotationChange={setPlayerRotation}
          isTraining={true}
        />


        <EnvironmentRenderer loading={false} />
        

        <BulletsRenderer />


        {showTargets && wallTargets.map((target, index) => (
          <BouncingBullseyeTarget
            key={target.globalId}
            id={target.globalId}
            wallType={target.wallType}
            onHit={handleTargetHit}
            isHit={hitTargets.has(target.globalId)}
            speed={targetSpeed}
            bouncingTargetPositions={bouncingTargetPositions}
            color={target.color}
            size={targetSize}
            movement={targetMovement}
            movementMode={movementMode}
            customTexture={customTexture}
          />
        ))}


        <BoundaryWithMarkers />
      </Canvas>


      <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-10">
        <div className="relative">
          <div className="absolute w-8 h-8 border-2 border-cyan-400 rotate-45 opacity-80" style={{
            top: '-16px',
            left: '-16px'
          }}></div>
          
          <div className="absolute w-4 h-0.5 bg-red-500 opacity-90" style={{
            top: '-1px',
            left: '-8px'
          }}></div>
          <div className="absolute w-0.5 h-4 bg-red-500 opacity-90" style={{
            top: '-8px',
            left: '-1px'
          }}></div>
          
          <div className="absolute w-1 h-1 bg-red-500 rounded-full" style={{
            top: '-2px',
            left: '-2px'
          }}></div>
        </div>
      </div>

      <GameHUD 
        playerHealth={playerHealth}
        playerBoost={playerBoost}
        weaponHeat={weaponHeat}
        isOverheated={isOverheated}
        gameMode="training"
      />


      <div className="absolute top-4 right-4 bg-black/70 border border-purple-500/50 rounded-lg p-4 text-purple-400 font-mono">
        <div className="text-lg font-bold mb-2 flex items-center gap-2">
          <Gamepad2 className="w-5 h-5" />
          Training Mode
        </div>
        
        {!showTargets ? (
          <div>
            <div className="text-yellow-400">🎮 Movement Practice</div>
            <div className="text-sm">Targets in: <span className="text-orange-400">{Math.max(0, (3 - movementTime)).toFixed(1)}s</span></div>
            <div className="text-xs text-gray-400 mt-1">Practice flying around</div>
          </div>
        ) : (
          <div>
            <div className="text-green-400">🎯 Combat Training</div>
            <div>Targets Hit: <span className="text-green-400">{targetsHit}</span> / {targetAmount}</div>
            
            <div className="mt-3 border-t border-purple-500/30 pt-2">
              <div className="text-sm text-purple-300 mb-2">🎯 Training Controls</div>
              
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs text-gray-300">Movement:</label>
                <button 
                  onClick={() => setTargetMovement(!targetMovement)}
                  className={`px-2 py-1 rounded text-xs font-bold ${targetMovement ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
                >
                  {targetMovement ? 'ON' : 'OFF'}
                </button>
              </div>
              
              {targetMovement && (
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-xs text-gray-300">Mode:</label>
                  <select 
                    value={movementMode} 
                    onChange={(e) => setMovementMode(e.target.value)}
                    className="bg-gray-700 text-white text-xs px-2 py-1 rounded"
                  >
                    <option value="stationary">Stationary</option>
                    <option value="patrol">Patrol</option>
                    <option value="orbital">Orbital</option>
                  </select>
                </div>
              )}
              
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs text-gray-300">Size:</label>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.0" 
                  step="0.1" 
                  value={targetSize} 
                  onChange={(e) => setTargetSize(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="text-xs w-8 text-center">{targetSize.toFixed(1)}x</span>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs text-gray-300">Amount:</label>
                <button 
                  onClick={() => setTargetAmount(prev => Math.max(1, prev - 1))}
                  className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                >
                  -
                </button>
                <span className="text-xs w-8 text-center">{targetAmount}</span>
                <button 
                  onClick={() => setTargetAmount(prev => Math.min(10, prev + 1))}
                  className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                >
                  +
                </button>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs text-gray-300">Respawn:</label>
                <button 
                  onClick={() => setAutoRespawn(!autoRespawn)}
                  className={`px-2 py-1 rounded text-xs font-bold ${autoRespawn ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
                >
                  {autoRespawn ? 'ON' : 'OFF'}
                </button>
              </div>
              
              <div className="mt-2 pt-2 border-t border-purple-500/30">
                <label className="text-xs text-gray-300 mb-1 block">Custom Target:</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleTextureUpload}
                  className="hidden" 
                  id="textureUpload"
                />
                <label 
                  htmlFor="textureUpload" 
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs font-bold cursor-pointer block text-center w-full"
                >
                  {customTexture ? 'Change Texture' : 'Upload PNG/JPG'}
                </label>
                {customTexture && (
                  <button 
                    onClick={() => {
                      setCustomTexture(null);
                      setForceReset(prev => prev + 1);
                      console.log('RESET TO DEFAULT TEXTURE');
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs w-full mt-1"
                  >
                    Use Default
                  </button>
                )}
              </div>
              
              <button 
                onClick={() => {
                  console.log('RESET ALL TARGETS CLICKED - Before:', { hitTargets: Array.from(hitTargets), targetsHit, forceReset });
                  setHitTargets(new Set());
                  setTargetsHit(0);
                  setForceReset(prev => prev + 1);
                  console.log('RESET ALL TARGETS - Spawning brand new targets with reset counter:', forceReset + 1);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold w-full mt-2"
              >
                Reset All Targets
              </button>
            </div>
          </div>
        )}
        
        <div className="text-xs text-gray-400 mt-2">Press T to open test panel</div>
      </div>

      <div className="absolute top-4 left-4 space-y-2">
        <button
          onClick={onLeaveGame}
          className="block bg-red-600/80 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-colors border border-red-500/50"
        >
          Exit Training
        </button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowControllerTest(true)}
          className="block bg-purple-600/80 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold transition-colors border border-purple-500/50 flex items-center gap-2"
        >
          <Gamepad2 className="w-4 h-4" />
          Test Panel
        </motion.button>
      </div>

      {useEffect(() => {
        const handleKeyPress = (e) => {
          if (e.key.toLowerCase() === 't') {
            setShowControllerTest(true);
          }
        };
        
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
      }, [])}

      <AnimatePresence>
        {showControllerTest && (
          <ControllerTestPanel onClose={() => setShowControllerTest(false)} />
        )}
      </AnimatePresence>

      <ControllerDetectionNotification />
      
      <AudioControls />
    </div>
  );
};

export default TrainingMode;
