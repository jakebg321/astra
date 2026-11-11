import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PRESETS = {
  overview: { pos: [900, 700, 900], target: [0, 0, 0] },
  topdown: { pos: [0, 2500, 0], target: [0, 0, 0] },
  p1pov: { pos: [-700, 100, 0], target: [700, 50, 0] },
  p2pov: { pos: [700, 100, 0], target: [-700, 50, 0] }
};

export default function CameraController({ preset }) {
  const { camera, controls } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());
  const isAnimating = useRef(false);
  
  useEffect(() => {
    if (!preset || !PRESETS[preset]) return;
    
    const config = PRESETS[preset];
    targetPos.current.set(...config.pos);
    targetLook.current.set(...config.target);
    
    isAnimating.current = true;
  }, [preset]);
  
  useFrame(() => {
    if (!isAnimating.current) return;

    camera.position.lerp(targetPos.current, 0.05);

    if (controls) {
      controls.target.lerp(targetLook.current, 0.05);
      controls.update();
    }
    
    if (camera.position.distanceTo(targetPos.current) < 10) {
      isAnimating.current = false;
    }
  });
  
  return null;
}
