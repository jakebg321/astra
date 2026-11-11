import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GAME_CONFIG } from '../config/GameConfig';

const DEFAULT_BOUNDARY_VISUAL_SETTINGS = {
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
};

const mergeBoundaryVisualSettings = (incoming = {}) => ({
  ...DEFAULT_BOUNDARY_VISUAL_SETTINGS,
  ...(incoming || {})
});

const HEX_COLOR_PATTERN = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const normalizeHexColor = (value, fallback = '#00ffff') => {
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

const applyHueBrightness = (baseColor, hueOffsetDeg = 0, brightness = 1) => {
  const clampedBrightness = Math.max(0, brightness);
  const color = new THREE.Color(baseColor);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  hsl.h = (hsl.h + (hueOffsetDeg / 360) + 1) % 1;
  hsl.l = THREE.MathUtils.clamp(hsl.l * Math.min(1, clampedBrightness), 0, 1);
  const adjustedColor = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
  if (clampedBrightness > 1) {
    adjustedColor.multiplyScalar(1 + (clampedBrightness - 1) * 0.9);
  }
  return adjustedColor;
};

const BoundaryMesh = () => {
  const meshRef = useRef();
  const panelMaterialsRef = useRef([]);
  const [boundarySettings, setBoundarySettings] = useState(DEFAULT_BOUNDARY_VISUAL_SETTINGS);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncSettings = (source) => {
      if (!source?.boundary) return;
      setBoundarySettings((current) => mergeBoundaryVisualSettings({
        ...current,
        ...source.boundary
      }));
    };

    syncSettings(window.getEnvironmentDebug?.());

    const handleEnvironmentDebugUpdate = (event) => {
      syncSettings(event?.detail || window.getEnvironmentDebug?.());
    };

    window.addEventListener('astra:environment-debug-changed', handleEnvironmentDebugUpdate);
    return () => {
      window.removeEventListener('astra:environment-debug-changed', handleEnvironmentDebugUpdate);
    };
  }, []);

  const lineBaseColorHex = useMemo(
    () => normalizeHexColor(boundarySettings.lineColorHex, '#00ffff'),
    [boundarySettings.lineColorHex]
  );
  const panelBaseColorHex = useMemo(
    () => normalizeHexColor(boundarySettings.panelColorHex, lineBaseColorHex),
    [boundarySettings.panelColorHex, lineBaseColorHex]
  );
  const lineColor = useMemo(
    () => applyHueBrightness(lineBaseColorHex, boundarySettings.hue, 1),
    [lineBaseColorHex, boundarySettings.hue]
  );
  const pulseColor = useMemo(
    () => applyHueBrightness(lineBaseColorHex, boundarySettings.hue + 20, 1),
    [lineBaseColorHex, boundarySettings.hue]
  );
  const panelColor = useMemo(
    () =>
      applyHueBrightness(
        panelBaseColorHex,
        boundarySettings.hue,
        Math.max(0, boundarySettings.panelBrightness)
      ),
    [panelBaseColorHex, boundarySettings.hue, boundarySettings.panelBrightness]
  );
  
  const enhancedMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        playerPosition: { value: new THREE.Vector3() },
        baseColor: { value: new THREE.Color(0x00ffff) },
        pulseColor: { value: new THREE.Color(0x5ce1ff) },
        opacity: { value: 0.75 },
        glowIntensity: { value: 0.5 },
        brightness: { value: 1 },
        animationSpeed: { value: 1 },
        pulseSpeed: { value: 2 },
        pulseAmount: { value: 0.3 },
        scanSpeed: { value: 1.5 },
        scanAmount: { value: 0.2 },
        edgeTint: { value: 0.8 },
        distanceReactive: { value: 0.5 }
      },
      vertexShader: `
        uniform float time;
        uniform vec3 playerPosition;
        varying vec3 vPosition;
        varying float vDistanceFromPlayer;
        
        void main() {
          vPosition = position;
          
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vDistanceFromPlayer = distance(worldPosition.xyz, playerPosition);
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 baseColor;
        uniform vec3 pulseColor;
        uniform float opacity;
        uniform float glowIntensity;
        uniform float brightness;
        uniform float animationSpeed;
        uniform float pulseSpeed;
        uniform float pulseAmount;
        uniform float scanSpeed;
        uniform float scanAmount;
        uniform float edgeTint;
        uniform float distanceReactive;
        
        varying vec3 vPosition;
        varying float vDistanceFromPlayer;
        
        void main() {

          float distanceFactor = 1.0 - min(vDistanceFromPlayer / 800.0, 1.0);
          

          float pulseBase = sin(time * pulseSpeed * animationSpeed + vDistanceFromPlayer * 0.01);
          float pulse = pulseBase * pulseAmount + (1.0 - pulseAmount);
          

          float scanBase = sin(time * scanSpeed * animationSpeed + vPosition.y * 0.02);
          float scanWave = scanBase * scanAmount + (1.0 - scanAmount);
          

          float edgeDistance = min(
            min(abs(vPosition.x) / 900.0, abs(vPosition.z) / 900.0),
            abs(vPosition.y) / 600.0
          );
          

          vec3 proximityColor = mix(baseColor, pulseColor, distanceFactor * distanceReactive);
          vec3 finalColor = mix(proximityColor, vec3(1.0, 0.2, 0.2), edgeDistance * edgeTint);
          

          float finalIntensity = pulse * scanWave * glowIntensity * (0.6 + distanceFactor * 0.4);
          float finalOpacity = clamp(opacity * (0.4 + finalIntensity * 0.6), 0.0, 1.0);
          vec3 litColor = finalColor * (0.5 + brightness * finalIntensity);
          
          gl_FragColor = vec4(litColor, finalOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      fog: false,
      linewidth: 2.0,
      alphaTest: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
  }, []);

  useEffect(() => {
    if (!enhancedMaterial) return;

    enhancedMaterial.uniforms.baseColor.value.copy(lineColor);
    enhancedMaterial.uniforms.pulseColor.value.copy(pulseColor);
    enhancedMaterial.uniforms.opacity.value = THREE.MathUtils.clamp(
      boundarySettings.lineOpacity,
      0,
      1
    );
    enhancedMaterial.uniforms.glowIntensity.value = Math.max(0, boundarySettings.glowIntensity);
    enhancedMaterial.uniforms.brightness.value = Math.max(0, boundarySettings.brightness);
    enhancedMaterial.uniforms.animationSpeed.value = THREE.MathUtils.clamp(
      boundarySettings.animationSpeed ?? 1,
      0,
      2
    );
    enhancedMaterial.uniforms.pulseSpeed.value = THREE.MathUtils.clamp(
      boundarySettings.pulseSpeed ?? 2,
      0,
      4
    );
    enhancedMaterial.uniforms.pulseAmount.value = THREE.MathUtils.clamp(
      boundarySettings.pulseAmount ?? 0.3,
      0,
      0.8
    );
    enhancedMaterial.uniforms.scanSpeed.value = THREE.MathUtils.clamp(
      boundarySettings.scanSpeed ?? 1.5,
      0,
      4
    );
    enhancedMaterial.uniforms.scanAmount.value = THREE.MathUtils.clamp(
      boundarySettings.scanAmount ?? 0.2,
      0,
      0.8
    );
    enhancedMaterial.uniforms.edgeTint.value = THREE.MathUtils.clamp(
      boundarySettings.edgeTint ?? 0.8,
      0,
      1
    );
    enhancedMaterial.uniforms.distanceReactive.value = THREE.MathUtils.clamp(
      boundarySettings.distanceReactive ?? 0.5,
      0,
      1
    );
  }, [enhancedMaterial, lineColor, pulseColor, boundarySettings]);

  useEffect(() => {
    const finalPanelOpacity = THREE.MathUtils.clamp(boundarySettings.panelOpacity, 0, 1);
    panelMaterialsRef.current.forEach((material) => {
      if (!material) return;
      material.color.copy(panelColor);
      material.opacity = finalPanelOpacity;
      material.needsUpdate = true;
    });
  }, [panelColor, boundarySettings.panelOpacity]);
  

  useFrame((_, delta) => {
    if (meshRef.current && enhancedMaterial) {
      enhancedMaterial.uniforms.time.value += delta;
      

      if (window.globalPlayerPosition) {
        enhancedMaterial.uniforms.playerPosition.value.copy(window.globalPlayerPosition);
      }
    }
  });
  

  const squareGridGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const { x, y, z } = GAME_CONFIG.world.size;
    const halfX = x / 2, halfY = y / 2, halfZ = z / 2;
    

    const gridSpacing = 100;
    

    const generateSquareGrid = (yPos) => {

      for (let i = -halfX; i <= halfX; i += gridSpacing) {
        vertices.push(i, yPos, -halfZ, i, yPos, halfZ);
      }
      

      for (let i = -halfZ; i <= halfZ; i += gridSpacing) {
        vertices.push(-halfX, yPos, i, halfX, yPos, i);
      }
    };
    
    generateSquareGrid(halfY);
    generateSquareGrid(-halfY);
    
    const generateSideGrids = () => {

      [-halfX, halfX].forEach((wallX) => {

        for (let i = -halfZ; i <= halfZ; i += gridSpacing) {
          vertices.push(wallX, -halfY, i, wallX, halfY, i);
        }

        for (let i = -halfY; i <= halfY; i += gridSpacing) {
          vertices.push(wallX, i, -halfZ, wallX, i, halfZ);
        }
      });
      

      [-halfZ, halfZ].forEach((wallZ) => {

        for (let i = -halfX; i <= halfX; i += gridSpacing) {
          vertices.push(i, -halfY, wallZ, i, halfY, wallZ);
        }

        for (let i = -halfY; i <= halfY; i += gridSpacing) {
          vertices.push(-halfX, i, wallZ, halfX, i, wallZ);
        }
      });
    };
    
    generateSideGrids();
    

    const corners = [
      [-halfX, -halfY, -halfZ, -halfX, halfY, -halfZ],
      [halfX, -halfY, -halfZ, halfX, halfY, -halfZ],
      [-halfX, -halfY, halfZ, -halfX, halfY, halfZ],
      [halfX, -halfY, halfZ, halfX, halfY, halfZ]
    ];
    vertices.push(...corners.flat());
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geometry;
  }, []);

  const panelDefinitions = useMemo(() => {
    const { x, y, z } = GAME_CONFIG.world.size;
    const halfX = x / 2 - 1;
    const halfY = y / 2 - 1;
    const halfZ = z / 2 - 1;

    return [
      { key: 'left', position: [-halfX, 0, 0], rotation: [0, Math.PI / 2, 0], size: [z, y] },
      { key: 'right', position: [halfX, 0, 0], rotation: [0, Math.PI / 2, 0], size: [z, y] },
      { key: 'back', position: [0, 0, -halfZ], rotation: [0, 0, 0], size: [x, y] },
      { key: 'front', position: [0, 0, halfZ], rotation: [0, 0, 0], size: [x, y] },
      { key: 'top', position: [0, halfY, 0], rotation: [Math.PI / 2, 0, 0], size: [x, z] },
      { key: 'bottom', position: [0, -halfY, 0], rotation: [Math.PI / 2, 0, 0], size: [x, z] }
    ];
  }, []);

  return (
    <group>
      {panelDefinitions.map((panel, index) => (
        <mesh key={panel.key} position={panel.position} rotation={panel.rotation}>
          <planeGeometry args={panel.size} />
          <meshBasicMaterial
            ref={(material) => {
              panelMaterialsRef.current[index] = material;
            }}
            color={panelColor}
            transparent
            opacity={Math.max(0, Math.min(1, boundarySettings.panelOpacity))}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            depthTest
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      <lineSegments ref={meshRef} geometry={squareGridGeometry}>
        <primitive object={enhancedMaterial} />
      </lineSegments>
    </group>
  );
};

export default BoundaryMesh;


export const BoundaryWithMarkers = () => <BoundaryMesh />;
