import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useGLTF } from '../utils/localGltf';
import * as THREE from 'three';
import { SimplePlanetCollision } from '../systems/SimplePlanetCollision';
import { SystemStatusCheck } from '../utils/SystemStatusCheck';
import performanceManager from '../services/PerformanceManager';
import { isTestModeEnabled } from '../debug/TestModeConfig';
import { GAME_CONFIG } from '../config/GameConfig';


import HyperspaceDimension from '../components/HyperspaceDimension';
import AsteroidField from '../components/AsteroidField';


const AVAILABLE_NEBULA_TEXTURES = [
  { path: '/textures/nebula/nebula1.jpg', label: 'Purple Tendrils' },
  { path: '/textures/nebula/energy-burst.jpg', label: 'Energy Burst' },
  { path: '/textures/nebula/asteroid-field.jpg', label: 'Asteroid Field' },
  { path: '/textures/nebula/storm-clouds.jpg', label: 'Storm Clouds' },
  { path: '/textures/nebula/constellation.png', label: 'Constellation' },
];


if (typeof window !== 'undefined') {
  window.__nebulaTextures = AVAILABLE_NEBULA_TEXTURES;
}


const DEFAULT_NEBULA_LAYER = {
  texture: '/textures/nebula/nebula1.jpg',
  rotationX: 0, rotationY: 0, rotationZ: 0,
  opacity: 0.45, enabled: true,

  driftSpeed: 0.5,
  driftAxisX: 0, driftAxisY: 1, driftAxisZ: 0,
  pulseSpeed: 0,
  pulseAmount: 0,
};

const DEFAULT_NEBULA_LAYERS = [
  { ...DEFAULT_NEBULA_LAYER, opacity: 0.45, driftSpeed: 0.02, driftAxisY: 1, pulseSpeed: 0.08, pulseAmount: 0.03 },
  { ...DEFAULT_NEBULA_LAYER, rotationY: 180, rotationZ: 27, opacity: 0.3, driftSpeed: -0.015, driftAxisX: 0.3, driftAxisY: 0.7, pulseSpeed: 0.05, pulseAmount: 0.02 },
  { ...DEFAULT_NEBULA_LAYER, rotationX: 90, rotationY: 126, opacity: 0.25, driftSpeed: 0.01, driftAxisZ: 1, pulseSpeed: 0.1, pulseAmount: 0.02 },
];

const DEFAULT_NEBULA_SETTINGS = {
  enabled: true,
  globalOpacity: 1.0,
  sphereRadius: 4500,
  radiusMultiplier: 1,
  offsetX: 0,
  offsetY: 0,
  offsetZ: 0,
  outsideMargin: 200,
  maskThreshold: 0.62,
  maskSoftness: 0.12,
  layers: DEFAULT_NEBULA_LAYERS,
};

const mergeNebulaSettings = (current, incoming = {}) => {
  const merged = { ...current, ...incoming };
  if (incoming.layers) {
    merged.layers = incoming.layers.map((layer, i) => ({
      ...(current.layers?.[i] || DEFAULT_NEBULA_LAYER),
      ...layer,
    }));
  }
  return merged;
};


const HUE_SHIFT_PARS = `
uniform float uHueShift;
uniform float uNebulaMaskThreshold;
uniform float uNebulaMaskSoftness;
vec3 hueShiftRGB(vec3 color, float shift) {
  float angle = shift * 3.14159265 / 180.0;
  float s = sin(angle);
  float c = cos(angle);
  vec3 weights = vec3(0.2126, 0.7152, 0.0722);
  float dot_val = dot(color, weights);
  vec3 result = vec3(dot_val) + vec3(c) * (color - vec3(dot_val));
  result += vec3(s) * cross(weights, color);
  return result;
}
`;
const HUE_SHIFT_MAP = `
gl_FragColor.rgb = hueShiftRGB(gl_FragColor.rgb, uHueShift);
float nebulaLum = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
float nebulaMask = smoothstep(
  uNebulaMaskThreshold - uNebulaMaskSoftness,
  uNebulaMaskThreshold + uNebulaMaskSoftness,
  nebulaLum
);
gl_FragColor.a *= nebulaMask;
`;

const NebulaSphere = ({ texturePath, rotationDeg, opacity, radius, radiusMultiplier, offset, driftSpeed, driftAxis, pulseSpeed, pulseAmount, hueShift, maskThreshold, maskSoftness, arenaRadius, outsideMargin, arenaSize }) => {
  const texture = useTexture(texturePath);
  const materialRef = useRef();
  const meshRef = useRef();
  const hueUniformRef = useRef({ value: hueShift || 0 });
  const maskThresholdRef = useRef({ value: maskThreshold ?? 0.62 });
  const maskSoftnessRef = useRef({ value: maskSoftness ?? 0.12 });
  const tempPosition = useRef(new THREE.Vector3());


  useEffect(() => {
    hueUniformRef.current.value = hueShift || 0;
    if (materialRef.current) materialRef.current.needsUpdate = true;
  }, [hueShift]);
  

  useEffect(() => {
    maskThresholdRef.current.value = maskThreshold ?? 0.62;
    maskSoftnessRef.current.value = maskSoftness ?? 0.12;
    if (materialRef.current) materialRef.current.needsUpdate = true;
  }, [maskThreshold, maskSoftness]);


  const material = React.useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      transparent: true,
      opacity: opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uHueShift = hueUniformRef.current;
      shader.uniforms.uNebulaMaskThreshold = maskThresholdRef.current;
      shader.uniforms.uNebulaMaskSoftness = maskSoftnessRef.current;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        '#include <common>\n' + HUE_SHIFT_PARS
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        HUE_SHIFT_MAP + '\n#include <dithering_fragment>'
      );
    };
    return mat;
  }, [texture]);


  useEffect(() => {
    materialRef.current = material;
  }, [material]);


  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.rotation.set(
        THREE.MathUtils.degToRad(rotationDeg[0]),
        THREE.MathUtils.degToRad(rotationDeg[1]),
        THREE.MathUtils.degToRad(rotationDeg[2]),
      );
    }
  }, [rotationDeg]);


  useFrame((state, delta) => {
    if (!meshRef.current) return;


    tempPosition.current.set(0, 0, 0);
    if (offset) tempPosition.current.add(offset);
    meshRef.current.position.copy(tempPosition.current);

    const margin = typeof outsideMargin === 'number' ? outsideMargin : 200;
    const targetRadius = Math.max((arenaRadius || 0) + margin, radius);
    meshRef.current.scale.setScalar((radiusMultiplier || 1) * (targetRadius / radius));


    if (driftSpeed && Math.abs(driftSpeed) > 0.001) {
      const driftRad = THREE.MathUtils.degToRad(driftSpeed) * Math.min(delta, 0.05);
      meshRef.current.rotation.x += driftRad * (driftAxis[0] || 0);
      meshRef.current.rotation.y += driftRad * (driftAxis[1] || 0);
      meshRef.current.rotation.z += driftRad * (driftAxis[2] || 0);
    }


    if (material && pulseSpeed > 0 && pulseAmount > 0) {
      const pulse = Math.sin(state.clock.elapsedTime * pulseSpeed * Math.PI) * pulseAmount;
      material.opacity = Math.max(0, opacity + pulse * opacity);
    } else if (material) {
      material.opacity = opacity;
    }


    hueUniformRef.current.value = hueShift || 0;
  });

  return (
    <mesh ref={meshRef} frustumCulled={false} renderOrder={-1000}>
      <boxGeometry args={[
        (arenaSize?.x || radius * 2) + (outsideMargin || 200) * 2,
        (arenaSize?.y || radius * 2) + (outsideMargin || 200) * 2,
        (arenaSize?.z || radius * 2) + (outsideMargin || 200) * 2
      ]} />
      <primitive object={material} />
    </mesh>
  );
};

const ENVIRONMENT_DEBUG_SETTINGS_KEY = 'astra_environment_visual_debug';
const FACE_KEYS = ['left', 'right', 'front', 'back', 'top', 'bottom'];

const DEFAULT_EXTERNAL_FACE_LIGHT = {
  enabled: true,
  intensityMultiplier: 1,
  distanceMultiplier: 1,
  colorHex: '#7cc8ff'
};

const createDefaultExternalArenaLights = () => ({
  enabled: true,
  linkAllFaces: true,
  globalIntensity: 8,
  globalDistance: 0,
  globalDecay: 1.2,
  outsideOffset: 260,
  globalColorHex: '#9bd6ff',
  coneAngle: 1.1,
  penumbra: 0.35,
  perFace: {
    left: { ...DEFAULT_EXTERNAL_FACE_LIGHT },
    right: { ...DEFAULT_EXTERNAL_FACE_LIGHT },
    front: { ...DEFAULT_EXTERNAL_FACE_LIGHT },
    back: { ...DEFAULT_EXTERNAL_FACE_LIGHT },
    top: { ...DEFAULT_EXTERNAL_FACE_LIGHT },
    bottom: { ...DEFAULT_EXTERNAL_FACE_LIGHT }
  }
});

const HEX_COLOR_PATTERN = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const normalizeHexColor = (value, fallback = '#7cc8ff') => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  const prefixed = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (!HEX_COLOR_PATTERN.test(prefixed)) return fallback;

  if (prefixed.length === 4) {
    const r = prefixed[1];
    const g = prefixed[2];
    const b = prefixed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return prefixed.toLowerCase();
};

const mergeExternalArenaLights = (incoming = {}) => {
  const defaults = createDefaultExternalArenaLights();
  const mergedPerFace = {};

  FACE_KEYS.forEach((faceKey) => {
    mergedPerFace[faceKey] = {
      ...defaults.perFace[faceKey],
      ...(incoming.perFace?.[faceKey] || {})
    };
    mergedPerFace[faceKey].colorHex = normalizeHexColor(
      mergedPerFace[faceKey].colorHex,
      defaults.perFace[faceKey].colorHex
    );
  });

  return {
    ...defaults,
    ...(incoming || {}),
    globalColorHex: normalizeHexColor(
      incoming.globalColorHex ?? defaults.globalColorHex,
      defaults.globalColorHex
    ),
    perFace: mergedPerFace
  };
};

const DEFAULT_ENVIRONMENT_DEBUG_SETTINGS = {
  planet: {
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scale: 1.86,
    hue: 58,
    brightness: 1,
    opacity: 1,
    orbitalBrightness: 1,
    orbitalGlow: 0
  },
  boundary: {
    hue: 0,
    brightness: 1,
    lineOpacity: 0.75,
    glowIntensity: 0.5,
    panelOpacity: 0,
    panelBrightness: 1,
    lineColorHex: '#00ffff',
    panelColorHex: '#00ffff',
    animationSpeed: 1,
    pulseSpeed: 2,
    pulseAmount: 0.3,
    scanSpeed: 1.5,
    scanAmount: 0.2,
    edgeTint: 0.8,
    distanceReactive: 0.5
  },
  externalArenaLights: createDefaultExternalArenaLights(),
  nebula: { ...DEFAULT_NEBULA_SETTINGS }
};

const mergeEnvironmentDebugSettings = (current, incoming = {}) => ({
  planet: {
    ...current.planet,
    ...(incoming.planet || {})
  },
  boundary: {
    ...current.boundary,
    ...(incoming.boundary || {})
  },
  externalArenaLights: mergeExternalArenaLights({
    ...current.externalArenaLights,
    ...(incoming.externalArenaLights || {}),
    perFace: {
      ...(current.externalArenaLights?.perFace || {}),
      ...(incoming.externalArenaLights?.perFace || {})
    }
  }),
  nebula: mergeNebulaSettings(
    current.nebula || DEFAULT_NEBULA_SETTINGS,
    incoming.nebula || {}
  )
});

const degToRad = (degrees) => THREE.MathUtils.degToRad(degrees || 0);

const applyHueBrightness = (baseColor, hueOffsetDeg = 0, brightness = 1) => {
  const color = baseColor instanceof THREE.Color ? baseColor.clone() : new THREE.Color(baseColor);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  hsl.h = (hsl.h + (hueOffsetDeg / 360) + 1) % 1;
  hsl.l = THREE.MathUtils.clamp(hsl.l * brightness, 0, 1);
  return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
};

const applyBoostedPlanetColor = (baseColor, hueOffsetDeg = 0, brightness = 1) => {
  const clampedBrightness = Math.max(0, brightness || 0);
  const adjusted = applyHueBrightness(baseColor, hueOffsetDeg, Math.min(clampedBrightness, 1));
  if (clampedBrightness > 1) {
    adjusted.multiplyScalar(1 + (clampedBrightness - 1) * 0.9);
  }
  return adjusted;
};



const planets = [
  {
    name: 'Mercury',
    texture: '/textures/planets/mercury_baseColor.jpeg',
    size: 25.2,
    distance: 200,
    speed: 0,
    color: '#8C6239',
    inclination: [0.3, 0.1, 0.2],
    orbitOffset: Math.PI * 0.5
  },
  {
    name: 'Venus', 
    texture: '/textures/planets/venus_baseColor.jpeg',
    size: 31.5,
    distance: 250,
    speed: 0,
    color: '#FFC649',
    inclination: [0.2, 0.4, 0.3],
    orbitOffset: Math.PI * 1.5
  },
  {
    name: 'Earth',
    texture: '/textures/planets/earth_baseColor.jpeg', 
    size: 35.7,
    distance: 350,
    speed: 0,
    color: '#6B93D6',
    inclination: [0.1, 0.3, 0.4],
    orbitOffset: 0
  },
  {
    name: 'Mars',
    texture: '/textures/planets/mars_baseColor.jpeg',
    size: 29.4,
    distance: 550,
    speed: 0,
    color: '#CD5C5C',
    inclination: [0.4, 0.2, 0.5],
    orbitOffset: Math.PI
  },
  {
    name: 'Jupiter',
    texture: '/textures/planets/jupiter_baseColor.jpeg',
    size: 54.6,
    distance: 650,
    speed: 0,
    color: '#D8CA9D',
    inclination: [0.2, 0.5, 0.6],
    orbitOffset: Math.PI * 1.2
  },
  {
    name: 'Saturn',
    texture: '/textures/planets/saturn_baseColor.jpeg',
    size: 46.2,
    distance: 700,
    speed: 0,
    color: '#FAD5A5',
    hasRings: true,
    ringTexture: '/textures/planets/saturn_ring_baseColor.png',
    inclination: [0.5, 0.3, 0.4],
    orbitOffset: Math.PI * 1.5
  },
  {
    name: 'Uranus',
    texture: '/textures/planets/uranus_baseColor.jpeg',
    size: 37.8,
    distance: 600,
    speed: 0,
    color: '#4FD0E7',
    inclination: [0.6, 0.4, 0.3],
    orbitOffset: Math.PI * 1.8
  }
];


const PlanetMesh = React.forwardRef(({ planet, texture, fallbackTexture, lodLevel, hueOffset = 0, brightness = 1, opacity = 1 }, ref) => {
  

  const material = React.useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: planet.color,
      map: texture || fallbackTexture,
      side: THREE.FrontSide
    });
  }, [planet, texture, fallbackTexture]);

  useEffect(() => {
    const adjustedColor = applyBoostedPlanetColor(planet.color, hueOffset, brightness);
    material.color.copy(adjustedColor);
    const finalOpacity = THREE.MathUtils.clamp(opacity ?? 1, 0, 1);
    material.opacity = finalOpacity;
    material.transparent = finalOpacity < 0.999;
    material.depthWrite = finalOpacity >= 0.999;
    material.needsUpdate = true;
  }, [material, planet.color, hueOffset, brightness, opacity]);


  const geometryArgs = React.useMemo(() => {
    switch (lodLevel) {
      case 0: return [planet.size, 32, 32];
      case 1: return [planet.size, 24, 24];
      case 2: return [planet.size, 16, 16];
      case 3: return [planet.size, 12, 12];
      default: return [planet.size, 24, 24];
    }
  }, [lodLevel, planet.size]);

  return (
    <mesh ref={ref}>
      <sphereGeometry args={geometryArgs} />
      <primitive object={material} />
    </mesh>
  );
});


const Planet = ({ planet, texture, ringTexture, fallbackTexture, environmentFxSettings }) => {
  const planetRef = useRef();
  const orbitRef = useRef();
  const lastCollisionTime = useRef(0);
  const [lodLevel, setLodLevel] = useState(0);
  const lastLodCheck = useRef(0);
  const planetWorldPos = useRef(new THREE.Vector3());
  const frameCounter = useRef(0);
  const orbitalBrightness = Math.max(0, environmentFxSettings?.orbitalBrightness ?? 1);
  const orbitalGlow = THREE.MathUtils.clamp(environmentFxSettings?.orbitalGlow ?? 0, 0, 3);
  const orbitalHue = environmentFxSettings?.hue ?? 0;
  const orbitalOpacity = THREE.MathUtils.clamp(environmentFxSettings?.opacity ?? 1, 0, 1);
  const glowColor = React.useMemo(
    () => applyBoostedPlanetColor(planet.color, orbitalHue, Math.max(1, orbitalBrightness)),
    [planet.color, orbitalHue, orbitalBrightness]
  );
  const renderLowQualityDebugLight = orbitalGlow > 0.05 || orbitalBrightness > 1.05;
  const baseLightIntensity = performanceManager.getSettings().quality === 'High' ? 0.5 : 0;
  const debugBacklightIntensity = Math.max(0, (orbitalBrightness - 1) * 0.55) + (orbitalGlow * 0.85);
  const pointLightIntensity = baseLightIntensity + debugBacklightIntensity;
  

  useEffect(() => {
    if (orbitRef.current && planet.orbitOffset) {
      orbitRef.current.rotation.y = planet.orbitOffset;
    }
  }, [planet.orbitOffset]);

  useFrame((state) => {
    if (orbitRef.current && window.planetZoneSystem) {

      const rotation = window.planetZoneSystem.getCurrentRotation(planet.name);
      orbitRef.current.rotation.y = rotation;
    }
    
    if (planetRef.current) {

      
      frameCounter.current++;
      const now = Date.now();
      

      if (now - lastLodCheck.current > GAME_CONFIG.lod.updateInterval) {
        lastLodCheck.current = now;
        
        planetRef.current.getWorldPosition(planetWorldPos.current);
        const distanceToCamera = state.camera.position.distanceTo(planetWorldPos.current);
        

        let newLodLevel;
        if (distanceToCamera < GAME_CONFIG.lod.asteroids.high.distance) {
          newLodLevel = 0;
        } else if (distanceToCamera < GAME_CONFIG.lod.asteroids.medium.distance) {
          newLodLevel = 1;
        } else if (distanceToCamera < GAME_CONFIG.lod.asteroids.low.distance) {
          newLodLevel = 2;
        } else {
          newLodLevel = 3;
        }
        
        if (newLodLevel !== lodLevel) {
          setLodLevel(newLodLevel);
        }
      }
      


      

      window.planetPositions = window.planetPositions || new Map();
      window.planetPositions.set(planet.name, {
        position: { ...planetWorldPos.current },
        radius: planet.size,
        lastUpdate: now
      });
    }
  });

  return (
    <group 
      ref={orbitRef}
      rotation={planet.inclination}
    >
      
      

      <group position={[planet.distance, 0, 0]}>
        <PlanetMesh
          ref={planetRef}
          planet={planet}
          texture={texture}
          fallbackTexture={fallbackTexture}
          lodLevel={lodLevel}
          hueOffset={orbitalHue}
          brightness={orbitalBrightness}
          opacity={orbitalOpacity}
        />


        {orbitalGlow > 0.01 && (
          <mesh>
            <sphereGeometry args={[planet.size * (1.12 + orbitalGlow * 0.1), 24, 24]} />
            <meshBasicMaterial
              color={glowColor}
              transparent
              opacity={Math.min(0.38, 0.08 + orbitalGlow * 0.12)}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.BackSide}
            />
          </mesh>
        )}
        

        {planet.hasRings && ringTexture && performanceManager.getSettings().quality === 'High' && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[planet.size * 1.8, planet.size * 0.3, 2, 24]} />
            <meshBasicMaterial 
              map={ringTexture}
              transparent
              opacity={Math.min(1, 0.8 * Math.max(0.2, orbitalOpacity))}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
        

        {(performanceManager.getSettings().quality === 'High' || renderLowQualityDebugLight) && pointLightIntensity > 0.01 && (
          <pointLight
            color={glowColor}
            intensity={pointLightIntensity}
            distance={planet.size * (3 + orbitalGlow * 3)}
            decay={2}
          />
        )}
      </group>
    </group>
  );
};


const EnvironmentRenderer = ({ onReady, loading = false }) => {
  const solarSystemRef = useRef();
  const logoRef = useRef();
  const logoSpinRef = useRef();

  const planetCollision = useRef(null);
  
  const [isInHyperspace, setIsInHyperspace] = useState(false);
  const [environmentDebugSettings, setEnvironmentDebugSettings] = useState(DEFAULT_ENVIRONMENT_DEBUG_SETTINGS);
  const environmentDebugSettingsRef = useRef(environmentDebugSettings);
  const nebulaOffset = React.useMemo(() => (
    new THREE.Vector3(
      environmentDebugSettings?.nebula?.offsetX || 0,
      environmentDebugSettings?.nebula?.offsetY || 0,
      environmentDebugSettings?.nebula?.offsetZ || 0
    )
  ), [
    environmentDebugSettings?.nebula?.offsetX,
    environmentDebugSettings?.nebula?.offsetY,
    environmentDebugSettings?.nebula?.offsetZ
  ]);
  const arenaSize = React.useMemo(() => {
    const size = GAME_CONFIG?.world?.size || { x: 2025, y: 540, z: 2025 };
    return { ...size };
  }, []);
  const arenaRadius = React.useMemo(() => {
    return 0.5 * Math.sqrt(
      (arenaSize.x || 0) * (arenaSize.x || 0) +
      (arenaSize.y || 0) * (arenaSize.y || 0) +
      (arenaSize.z || 0) * (arenaSize.z || 0)
    );
  }, [arenaSize]);

  useEffect(() => {
    environmentDebugSettingsRef.current = environmentDebugSettings;
  }, [environmentDebugSettings]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const applySettings = (nextSettings) => {
      setEnvironmentDebugSettings((currentSettings) => {
        const resolvedIncoming = typeof nextSettings === 'function'
          ? nextSettings(currentSettings)
          : nextSettings;
        const mergedSettings = mergeEnvironmentDebugSettings(currentSettings, resolvedIncoming);
        window.dispatchEvent(
          new CustomEvent('astra:environment-debug-changed', { detail: mergedSettings })
        );
        return mergedSettings;
      });
    };

    window.setEnvironmentDebug = applySettings;
    window.resetEnvironmentDebug = () => applySettings(DEFAULT_ENVIRONMENT_DEBUG_SETTINGS);
    window.getEnvironmentDebug = () => environmentDebugSettingsRef.current;


    window.nebula = {

      opacity: (val) => applySettings({ nebula: { globalOpacity: val } }),

      toggle: () => applySettings((s) => ({ nebula: { enabled: !s.nebula?.enabled } })),

      layer: (index, props) => applySettings((s) => {
        const layers = [...(s.nebula?.layers || DEFAULT_NEBULA_LAYERS)];
        if (index >= 0 && index < layers.length) {
          layers[index] = { ...layers[index], ...props };
        }
        return { nebula: { layers } };
      }),

      add: (texture, props = {}) => applySettings((s) => {
        const layers = [...(s.nebula?.layers || DEFAULT_NEBULA_LAYERS)];
        layers.push({
          ...DEFAULT_NEBULA_LAYER,
          texture,
          ...props,
        });
        return { nebula: { layers } };
      }),

      remove: (index) => applySettings((s) => {
        const layers = [...(s.nebula?.layers || [])];
        layers.splice(index, 1);
        return { nebula: { layers } };
      }),

      radius: (val) => applySettings({ nebula: { sphereRadius: val } }),

      get: () => environmentDebugSettingsRef.current?.nebula,
    };

    return () => {
      delete window.setEnvironmentDebug;
      delete window.resetEnvironmentDebug;
      delete window.getEnvironmentDebug;
      delete window.nebula;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage?.setItem(
        ENVIRONMENT_DEBUG_SETTINGS_KEY,
        JSON.stringify(environmentDebugSettings)
      );
    } catch (error) {

    }
  }, [environmentDebugSettings]);
  

  const readyNotified = useRef(false);
  useEffect(() => {
    if (!readyNotified.current) {
      readyNotified.current = true;
      const timer = setTimeout(() => {
        console.log('EnvironmentRenderer ready, notifying game');
        onReady?.();
      }, 100);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, []);
  

  useEffect(() => {
    if (!isTestModeEnabled('planets')) {
      window.planetPositions = new Map();
    }
  }, []);
  

  useEffect(() => {
    const checkHyperspaceState = () => {
      if (window.playerInHyperspace !== undefined && window.playerInHyperspace !== isInHyperspace) {
        setIsInHyperspace(window.playerInHyperspace);
      }
    };
    
    const interval = setInterval(checkHyperspaceState, 50);
    
    return () => clearInterval(interval);
  }, [isInHyperspace]);
  

  useEffect(() => {
    console.log('Planet collision now handled by boundary system in SpaceshipController');
    

    if (!window.gameStartTime) {
      window.gameStartTime = performance.now();
    }
  }, []);
  

  const planetTextures = isTestModeEnabled('planets') ? useTexture(planets.map(p => p.texture)) : [];
  const saturnRingTexture = isTestModeEnabled('planets') ? useTexture('/textures/planets/saturn_ring_baseColor.png') : null;
  const astraCenterModelGltf = useGLTF('/retexturedmainplanet.glb');
  

  const fallbackTexture = isTestModeEnabled('planets') ? useTexture('/textures/planets/earth_baseColor.jpeg') : null;


  const astraCenterModel = React.useMemo(() => {
    if (!astraCenterModelGltf?.scene) return null;

    const clonedScene = astraCenterModelGltf.scene.clone(true);
    const targetDiameter = 150;

    const initialBox = new THREE.Box3().setFromObject(clonedScene);
    const initialSize = new THREE.Vector3();
    initialBox.getSize(initialSize);
    const maxDimension = Math.max(initialSize.x, initialSize.y, initialSize.z, 1);
    const uniformScale = targetDiameter / maxDimension;

    clonedScene.scale.setScalar(uniformScale);

    const centeredBox = new THREE.Box3().setFromObject(clonedScene);
    const center = new THREE.Vector3();
    centeredBox.getCenter(center);
    clonedScene.position.sub(center);


    clonedScene.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      if (Array.isArray(child.material)) {
        child.material = child.material.map((material) => material.clone());
      } else {
        child.material = child.material.clone();
      }
    });

    return clonedScene;
  }, [astraCenterModelGltf]);

  const planetSettings = environmentDebugSettings.planet;

  const planetPosition = [
    planetSettings.positionX || 0,
    planetSettings.positionY || 0,
    planetSettings.positionZ || 0
  ];
  const planetRotation = [
    degToRad(planetSettings.rotationX),
    degToRad(planetSettings.rotationY),
    degToRad(planetSettings.rotationZ)
  ];
  const planetScale = planetSettings.scale || 1;
  const planetAccentColor = React.useMemo(
    () => applyHueBrightness('#8a2be2', planetSettings.hue, planetSettings.brightness),
    [planetSettings.hue, planetSettings.brightness]
  );

  useEffect(() => {
    if (!astraCenterModel) return;

    const hue = planetSettings.hue || 0;
    const brightness = planetSettings.brightness || 1;
    const debugOpacity = THREE.MathUtils.clamp(planetSettings.opacity ?? 1, 0, 1);

    const applyMaterialAdjustment = (material) => {
      if (!material) return;

      if (!material.userData.__baseDebugMaterialState) {
        material.userData.__baseDebugMaterialState = {
          color: material.color ? material.color.clone() : null,
          emissive: material.emissive ? material.emissive.clone() : null,
          emissiveIntensity: typeof material.emissiveIntensity === 'number' ? material.emissiveIntensity : 1,
          opacity: typeof material.opacity === 'number' ? material.opacity : 1,
          transparent: !!material.transparent,
          transmission: typeof material.transmission === 'number' ? material.transmission : 0
        };
      }

      const baseState = material.userData.__baseDebugMaterialState;
      if (baseState.color && material.color) {
        const adjustedColor = applyHueBrightness(baseState.color, hue, brightness);
        material.color.copy(adjustedColor);
      }

      if (baseState.emissive && material.emissive) {
        const adjustedEmissive = applyHueBrightness(baseState.emissive, hue, brightness);
        material.emissive.copy(adjustedEmissive);
        material.emissiveIntensity = Math.max(
          0.5,
          (baseState.emissiveIntensity || 1) * (0.4 + brightness * 1.8)
        );
      }



      if (material.map && material.emissive && !material.emissiveMap) {
        material.emissiveMap = material.map;
      }

      const finalOpacity = THREE.MathUtils.clamp(debugOpacity, 0, 1);
      material.opacity = finalOpacity;
      material.transparent = finalOpacity < 0.999;
      material.depthWrite = finalOpacity >= 0.999;
      material.blending = THREE.NormalBlending;
      material.side = THREE.DoubleSide;
      if ('alphaMap' in material) {
        material.alphaMap = null;
      }
      if (typeof material.transmission === 'number') {
        material.transmission = 0;
      }
      if (typeof material.metalness === 'number') {
        material.metalness = 0;
      }
      if (typeof material.roughness === 'number') {
        material.roughness = 0.65;
      }
      if (typeof material.alphaTest === 'number') {
        material.alphaTest = 0;
      }
      material.needsUpdate = true;
    };

    astraCenterModel.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      if (Array.isArray(child.material)) {
        child.material.forEach(applyMaterialAdjustment);
      } else {
        applyMaterialAdjustment(child.material);
      }
    });
  }, [astraCenterModel, planetSettings.hue, planetSettings.brightness, planetSettings.opacity]);


  useFrame(() => {

    window.debugPerf?.startTimer('environment');

    if (logoSpinRef.current && isTestModeEnabled('rotation')) {
      logoSpinRef.current.rotation.y += 0.005;
    }


    if (astraCenterModel) {
      window.planetPositions = window.planetPositions || new Map();
      const collisionRadius = (GAME_CONFIG.combat?.centerPlanetCollisionRadius || 75) * (planetScale || 1);
      window.planetPositions.set('CenterPlanet', {
        position: { x: planetPosition[0], y: planetPosition[1], z: planetPosition[2] },
        radius: collisionRadius,
        lastUpdate: performance.now()
      });
    }


    window.debugPerf?.endTimer('environment');
  });


  if (loading) {
    return null;
  }

  return (
    <group ref={solarSystemRef}>

      {isTestModeEnabled('skybox') && (
        <>
          <group
            ref={logoRef}
            position={planetPosition}
            rotation={planetRotation}
            scale={[planetScale, planetScale, planetScale]}
          >
            <group ref={logoSpinRef}>
              {astraCenterModel && <primitive object={astraCenterModel} />}
            </group>
          </group>


          <pointLight
            color={planetAccentColor}
            intensity={1.5 * Math.max(0.25, planetSettings.brightness || 1)}
            distance={80}
            decay={1}
            position={planetPosition}
          />
        </>
      )}


      {isTestModeEnabled('planets') && planets.map((planet, index) => (
        <Planet 
          key={planet.name}
          planet={planet}
          texture={planetTextures[index]}
          ringTexture={planet.hasRings ? saturnRingTexture : null}
          fallbackTexture={fallbackTexture}
          environmentFxSettings={planetSettings}
        />
      ))}


      {isTestModeEnabled('planets') && <AsteroidField />}


      <HyperspaceDimension
        isActive={isInHyperspace}
        duration={2000}
      />
      

    </group>
  );
};

export default EnvironmentRenderer;

useGLTF.preload('/retexturedmainplanet.glb');
