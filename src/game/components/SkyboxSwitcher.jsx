import React, { useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const SKYBOX_VARIANTS = [
  { id: 'galaxy', name: 'Spiral Galaxy', file: '/skybox_planet_00002.png' },
  { id: 'nebula', name: 'Nebula Spires', file: '/skybox_planet_00003.png' },
  { id: 'purple_planet', name: 'Purple Planet', file: '/skybox_purple_planet.png' },
  { id: 'purple_lava', name: 'Purple Lava Planet', file: '/skybox_purple_lava.png' },
];

export function HDRSkybox({ variant = 'purple_planet' }) {
  const { scene } = useThree();
  const [currentVariant, setCurrentVariant] = useState(variant);

  useEffect(() => {
    const variantData = SKYBOX_VARIANTS.find(v => v.id === currentVariant) || SKYBOX_VARIANTS[0];
    const skyboxFile = variantData.file;
    const loader = new THREE.TextureLoader();

    loader.load(
      skyboxFile,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        scene.background = texture;
        scene.environment = texture;
        console.log('Skybox loaded:', skyboxFile);
      },
      undefined,
      (error) => {
        console.warn('Failed to load skybox:', error);
        scene.background = new THREE.Color('#0a0a1a');
      }
    );
  }, [currentVariant, scene]);

  useEffect(() => {
    window.switchSkybox = (newVariant) => {
      setCurrentVariant(newVariant);
      console.log('Switched to skybox variant:', newVariant);
    };
    window.getSkyboxVariants = () => SKYBOX_VARIANTS;
  }, []);

  return null;
}

export function SkyboxSwitcherUI() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentVariant, setCurrentVariant] = useState('purple_planet');

  useEffect(() => {
    const handleKeyPress = (e) => {

      if (e.key === 'k' || e.key === 'K') {
        setIsOpen(prev => !prev);
        return;
      }

      if (e.key === 'ArrowRight') {
        const currentIndex = SKYBOX_VARIANTS.findIndex(v => v.id === currentVariant);
        const nextIndex = (currentIndex + 1) % SKYBOX_VARIANTS.length;
        switchToVariant(SKYBOX_VARIANTS[nextIndex].id);
      } else if (e.key === 'ArrowLeft') {
        const currentIndex = SKYBOX_VARIANTS.findIndex(v => v.id === currentVariant);
        const prevIndex = (currentIndex - 1 + SKYBOX_VARIANTS.length) % SKYBOX_VARIANTS.length;
        switchToVariant(SKYBOX_VARIANTS[prevIndex].id);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentVariant]);

  const switchToVariant = (variantId) => {
    setCurrentVariant(variantId);
    if (window.switchSkybox) {
      window.switchSkybox(variantId);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'rgba(0,0,0,0.8)',
      padding: '20px',
      borderRadius: '10px',
      color: 'white',
      fontFamily: 'sans-serif',
      zIndex: 1000,
      minWidth: '200px'
    }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>🌌 Skybox Switcher</h3>
      <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '10px' }}>
        Press 'K' to toggle
      </p>

      {SKYBOX_VARIANTS.map((variant, index) => (
        <button
          key={variant.id}
          onClick={() => switchToVariant(variant.id)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            padding: '10px',
            margin: '5px 0',
            background: currentVariant === variant.id ? '#00ff88' : '#333',
            color: currentVariant === variant.id ? '#000' : '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          <span>{variant.name}</span>

        </button>
      ))}

      <p style={{ fontSize: '11px', opacity: 0.5, marginTop: '15px', lineHeight: '1.5' }}>
        ← → Arrow keys to cycle
      </p>
    </div>
  );
}

export function useHDRSwitcher() {
  return {
    currentHDR: '/skybox_purple_planet.png',
    showSwitcher: false,
    setShowSwitcher: () => {}
  };
}
