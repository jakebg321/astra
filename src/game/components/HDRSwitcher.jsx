import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function HDRSkybox({ pngPath = '/skybox_planet_00003.png' }) {
  const { scene } = useThree();
  
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    
    loader.load(
      pngPath,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        scene.background = texture;
        scene.environment = texture;
        console.log('Skybox loaded:', pngPath);
      },
      undefined,
      (error) => {
        console.warn('Failed to load skybox:', error);
        scene.background = new THREE.Color('#0a0a1a');
      }
    );
    
    return () => {
    };
  }, [pngPath, scene]);
  
  return null;
}
