import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '../utils/localGltf';
import * as THREE from 'three';
import { usePlayerMovement } from '../hooks/usePlayerMovement.js';
import SimpleInputManager from '../systems/SimpleInputManager.js';
import { getWebSocketInstance } from '../services/UnifiedWebSocket.js';

const COCKPIT_MODELS = [
  { name: 'ASTRA Cockpit', path: '/povglb/astra_cockpit.glb' }
];

COCKPIT_MODELS.forEach(model => {
  useGLTF.preload(model.path);
});

const FallbackCockpit = ({ position, rotation, scale, modelName }) => {
  console.log(`CockpitView: Using FallbackCockpit for ${modelName}`);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3, 3, 3]} />
        <meshBasicMaterial color="#ff0000" wireframe />
      </mesh>
      <mesh position={[0, 2, 2]}>
        <boxGeometry args={[8, 0.5, 0.2]} />
        <meshBasicMaterial color="#00ff00" />
      </mesh>
    </group>
  );
};

const GLBCockpit = ({ modelPath, position, rotation, scale, modelName }) => {
  const { camera } = useThree();
  const gltf = useGLTF(modelPath);
  
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const processedScene = gltf.scene.clone();
  processedScene.position.sub(center);
  
  const glassHints = ['glass', 'canopy', 'windshield', 'window', 'visor'];
  const scratchSoften = 0.25;
  const hazeReduce = 0.5;
  processedScene.traverse((child) => {
    if (child.isMesh && child.material) {
      child.visible = true;
      child.castShadow = true;
      child.receiveShadow = true;
      child.material.side = THREE.DoubleSide;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((mat) => {
        if (!mat) return;
        const name = (mat.name || '').toLowerCase();
        const isGlass =
          glassHints.some((hint) => name.includes(hint)) ||
          mat.transparent ||
          (typeof mat.opacity === 'number' && mat.opacity < 1) ||
          (typeof mat.transmission === 'number' && mat.transmission > 0);
        if (!isGlass) return;

        if (mat.normalMap && mat.normalScale) {
          mat.normalScale.multiplyScalar(scratchSoften);
        }
        if (typeof mat.roughness === 'number') {
          mat.roughness = Math.max(0, mat.roughness * hazeReduce);
        }
        if (typeof mat.metalness === 'number') {
          mat.metalness = Math.min(mat.metalness, 0.1);
        }
        mat.needsUpdate = true;
      });
    }
  });
  
  if (!gltf || !gltf.scene) {
    console.error(`CockpitView GLB scene is null for ${modelName}:`, modelPath);
    throw new Error(`GLB scene is null for ${modelPath}`);
  }

  return (
    <primitive 
      object={processedScene} 
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
};

class GLBErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`CockpitView GLB Loading failed for ${this.props.modelName}:`, error);
  }

  render() {
    if (this.state.hasError) {
      return <FallbackCockpit {...this.props} />;
    }
    return <GLBCockpit {...this.props} scale={this.props.scale} />;
  }
}

const CockpitView = ({ selectedModel = 0, cockpitTransform, lighting, isMultiplayer = false }) => {
  const { camera, scene } = useThree();
  const cockpitGroupRef = useRef(new THREE.Group());
  const headEulerRef = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const singlePlayerMovement = usePlayerMovement();

  const smoothedState = useRef({
    position: new THREE.Vector3(),
    rotation: new THREE.Euler()
  });

  useEffect(() => {
    camera.layers.enableAll();
    camera.layers.disable(1);
    
    return () => {
      camera.layers.enableAll();
    };
  }, [camera]);

  useEffect(() => {
    if (cockpitGroupRef.current) {
      camera.add(cockpitGroupRef.current);
      console.log('COCKPIT: Attached to camera as child');
    }
    
    return () => {
      if (cockpitGroupRef.current) {
        camera.remove(cockpitGroupRef.current);
        scene.add(cockpitGroupRef.current);
        console.log('COCKPIT: Detached from camera');
      }
    };
  }, [camera, scene]);

  const movement = singlePlayerMovement;
  
  const currentModel = COCKPIT_MODELS[selectedModel] || COCKPIT_MODELS[0];

  useEffect(() => {
    if (movement.gameState && !movement.gameState.initialized) {
      movement.gameState.position = { x: 0, y: 50, z: 0 };

      movement.gameState.pitch = movement.gameState.pitch || 0;
      movement.gameState.yaw = movement.gameState.yaw || 0;
      movement.gameState.roll = movement.gameState.roll || 0;
      movement.gameState.initialized = true;
      console.log('CockpitView: Preserved rotation values during initialization');
    }
  }, []);

  useEffect(() => {
    const handleSpawn = (e) => {
      const pos = e.detail.position;
      movement.gameState.position = { x: pos.x, y: pos.y, z: pos.z };
    };
    window.addEventListener('force-single-player-spawn', handleSpawn);
    return () => window.removeEventListener('force-single-player-spawn', handleSpawn);
  }, []);

  useFrame((state, delta) => {
    const currentGameState = movement.gameState;
    
    if (!currentGameState) return;
    
    const inputManager = SimpleInputManager.getInstance();
    const input = inputManager.getInputState();
    
    if (input && movement.updateMovement) {
      movement.updateMovement(input, delta);
    }
    
    if (currentGameState && currentGameState.position) {

      camera.position.copy(currentGameState.position);

      camera.rotation.set(
        currentGameState.pitch || 0,
        currentGameState.yaw || 0,
        currentGameState.roll || 0,
        'YXZ'
      );
    }
    
    if (cockpitGroupRef.current) {

      const pos = {
        x: cockpitTransform.position?.x || 0,
        y: cockpitTransform.position?.y || 0, 
        z: cockpitTransform.position?.z || -1
      };
      const rot = {
        x: cockpitTransform.rotation?.x || 0,
        y: cockpitTransform.rotation?.y || 0,
        z: cockpitTransform.rotation?.z || 0
      };
      
      cockpitGroupRef.current.position.set(pos.x, pos.y, pos.z);
      cockpitGroupRef.current.rotation.set(rot.x, rot.y, rot.z);

      if (!window.lastCockpitPosLog || performance.now() - window.lastCockpitPosLog > 3000) {
        window.lastCockpitPosLog = performance.now();
      }
    }

    const headEuler = headEulerRef.current;
    if (input && input.freeLook && input.mouse) {
      headEuler.x = THREE.MathUtils.clamp(headEuler.x + input.mouse.y * 0.002 * delta * 60, -Math.PI / 4, Math.PI / 4);
      headEuler.y += input.mouse.x * 0.002 * delta * 60;
    } else {
      headEuler.x = THREE.MathUtils.lerp(headEuler.x, 0, 0.1 * delta * 60);
      headEuler.y = THREE.MathUtils.lerp(headEuler.y, 0, 0.1 * delta * 60);
    }

    camera.rotation.x += headEuler.x;
    camera.rotation.y += headEuler.y;
  });

  return (
    <>
      <ambientLight intensity={lighting?.ambient || 1.2} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={lighting?.directional1 || 2.0}
        castShadow
      />
      <directionalLight position={[-10, 5, -5]} intensity={lighting?.directional2 || 1.5} />
      <pointLight position={[0, 10, 0]} intensity={lighting?.pointTop || 2.0} />
      <pointLight position={[0, -10, 0]} intensity={lighting?.pointBottom || 1.8} />
      
      <group ref={cockpitGroupRef}>
        <GLBErrorBoundary 
          modelPath={currentModel.path}
          modelName={currentModel.name}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          scale={[cockpitTransform.scale?.x || 1, cockpitTransform.scale?.y || 1, cockpitTransform.scale?.z || 1]}
        />
        

        <mesh position={[0, 0, -2]}>
          <boxGeometry args={[5, 5, 5]} />
          <meshBasicMaterial color="red" wireframe />
        </mesh>
        

        <mesh position={[
          cockpitTransform.position?.x || 0,
          cockpitTransform.position?.y || 0, 
          cockpitTransform.position?.z || -1
        ]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshBasicMaterial color="lime" />
        </mesh>
      </group>
    </>
  );
};

export default CockpitView;
