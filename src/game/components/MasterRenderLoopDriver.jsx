

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { getMasterRenderLoop } from '../systems/MasterRenderLoop.js';
import { GAME_CONFIG } from '../config/GameConfig.js';

const MasterRenderLoopDriver = () => {
  const lastLogTime = useRef(0);

  useFrame((state, delta) => {

    const gl = state.gl;
    if (gl?.info) {
      const info = gl.info;
      window.glInfo = {
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        lines: info.render.lines,
        points: info.render.points,
        geometries: info.memory.geometries,
        textures: info.memory.textures
      };

      if (window.debugGPU) {
        const now = performance.now();
        if (now - lastLogTime.current > 3000) {
          lastLogTime.current = now;
        }
      }
    }

    if (!GAME_CONFIG.performance.optimizations.masterRenderLoop) {
      return;
    }

    const masterLoop = getMasterRenderLoop();

    masterLoop.update(state, delta);
  });

  return null;
};

export default MasterRenderLoopDriver;