import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GAME_CONFIG } from '../config/GameConfig';

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

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

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

const ArenaExternalLightRig = () => {
  const [settings, setSettings] = useState(createDefaultExternalArenaLights);
  const lightRefs = useRef({});
  const targetRefs = useRef({});

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const readFromWindow = () => {
      const fullDebugSettings = window.getEnvironmentDebug?.();
      const externalSettings = fullDebugSettings?.externalArenaLights;
      if (!externalSettings) return;
      setSettings(mergeExternalArenaLights(externalSettings));
    };

    const handleSettingsChange = (event) => {
      const detailSettings = event?.detail?.externalArenaLights;
      if (detailSettings) {
        setSettings(mergeExternalArenaLights(detailSettings));
        return;
      }
      readFromWindow();
    };

    readFromWindow();
    window.addEventListener('astra:environment-debug-changed', handleSettingsChange);
    return () => {
      window.removeEventListener('astra:environment-debug-changed', handleSettingsChange);
    };
  }, []);

  const { x, y, z } = GAME_CONFIG.world.size;
  const halfX = x / 2;
  const halfY = y / 2;
  const halfZ = z / 2;

  const outsideOffset = clamp(settings.outsideOffset ?? 260, 0, 1500);
  const positions = useMemo(
    () => ({
      left: [-halfX - outsideOffset, 0, 0],
      right: [halfX + outsideOffset, 0, 0],
      back: [0, 0, -halfZ - outsideOffset],
      front: [0, 0, halfZ + outsideOffset],
      top: [0, halfY + outsideOffset, 0],
      bottom: [0, -halfY - outsideOffset, 0]
    }),
    [halfX, halfY, halfZ, outsideOffset]
  );

  useEffect(() => {
    FACE_KEYS.forEach((faceKey) => {
      const light = lightRefs.current[faceKey];
      const target = targetRefs.current[faceKey];
      if (!light || !target) return;
      light.target = target;
      light.target.updateMatrixWorld();
    });
  }, [positions, settings]);

  if (!settings.enabled) {
    return null;
  }

  const globalIntensity = clamp(settings.globalIntensity ?? 8, 0, 40);
  const globalDistance = clamp(settings.globalDistance ?? 0, 0, 10000);
  const globalDecay = clamp(settings.globalDecay ?? 1.2, 0, 4);
  const coneAngle = clamp(settings.coneAngle ?? 1.1, 0.2, 1.4);
  const penumbra = clamp(settings.penumbra ?? 0.35, 0, 1);
  const globalColor = normalizeHexColor(settings.globalColorHex, '#9bd6ff');

  return (
    <>
      {FACE_KEYS.map((faceKey) => {
        const faceSettings = settings.perFace?.[faceKey] || DEFAULT_EXTERNAL_FACE_LIGHT;
        if (!faceSettings.enabled) return null;

        const intensity = globalIntensity * clamp(faceSettings.intensityMultiplier ?? 1, 0, 4);
        const distanceMult = clamp(faceSettings.distanceMultiplier ?? 1, 0.1, 4);
        const distance = globalDistance <= 0 ? 0 : globalDistance * distanceMult;
        const faceColor = settings.linkAllFaces
          ? globalColor
          : normalizeHexColor(faceSettings.colorHex, globalColor);

        if (intensity <= 0.001) return null;

        return (
          <group key={`external-arena-light-${faceKey}`}>
            <object3D
              ref={(node) => {
                targetRefs.current[faceKey] = node;
              }}
              position={[0, 0, 0]}
            />
            <spotLight
              ref={(node) => {
                lightRefs.current[faceKey] = node;
              }}
              position={positions[faceKey]}
              color={faceColor}
              intensity={intensity}
              distance={distance}
              decay={globalDecay}
              angle={coneAngle}
              penumbra={penumbra}
              castShadow={false}
            />
          </group>
        );
      })}
    </>
  );
};

export default ArenaExternalLightRig;
