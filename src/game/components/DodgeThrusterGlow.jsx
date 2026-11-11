import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function DodgeThrusterGlow() {
  const leftGlowRef = useRef();
  const rightGlowRef = useRef();
  const topGlowRef = useRef();
  const bottomGlowRef = useRef();

  const glowTexture = React.useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(100, 180, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(50, 100, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 50, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useFrame((state) => {
    const dodgeState = window.gameMovementState?.dodge;
    if (!dodgeState || !leftGlowRef.current || !rightGlowRef.current || !topGlowRef.current || !bottomGlowRef.current) return;

    if (dodgeState.isLeftDodging) {
      const elapsed = Date.now() - dodgeState.leftStartTime;
      const progress = Math.min(elapsed / dodgeState.dodgeDuration, 1);

      const intensity = progress < 0.3 ? progress / 0.3 : 1 - ((progress - 0.3) / 0.7);

      rightGlowRef.current.material.opacity = intensity * 0.7;
      rightGlowRef.current.visible = true;
      leftGlowRef.current.visible = false;
    }

    else if (dodgeState.isRightDodging) {
      const elapsed = Date.now() - dodgeState.rightStartTime;
      const progress = Math.min(elapsed / dodgeState.dodgeDuration, 1);

      const intensity = progress < 0.3 ? progress / 0.3 : 1 - ((progress - 0.3) / 0.7);

      leftGlowRef.current.material.opacity = intensity * 0.7;
      leftGlowRef.current.visible = true;
      rightGlowRef.current.visible = false;
    }
    else {
      leftGlowRef.current.visible = false;
      rightGlowRef.current.visible = false;
    }

    if (dodgeState.isUpDodging) {
      const elapsed = Date.now() - dodgeState.upStartTime;
      const progress = Math.min(elapsed / dodgeState.dodgeDuration, 1);
      const intensity = progress < 0.3 ? progress / 0.3 : 1 - ((progress - 0.3) / 0.7);

      bottomGlowRef.current.material.opacity = intensity * 0.7;
      bottomGlowRef.current.visible = true;
      topGlowRef.current.visible = false;
    }

    else if (dodgeState.isDownDodging) {
      const elapsed = Date.now() - dodgeState.downStartTime;
      const progress = Math.min(elapsed / dodgeState.dodgeDuration, 1);
      const intensity = progress < 0.3 ? progress / 0.3 : 1 - ((progress - 0.3) / 0.7);

      topGlowRef.current.material.opacity = intensity * 0.7;
      topGlowRef.current.visible = true;
      bottomGlowRef.current.visible = false;
    }
    else {
      topGlowRef.current.visible = false;
      bottomGlowRef.current.visible = false;
    }
  });

  return (
    <>

      <sprite
        ref={leftGlowRef}
        position={[-35, 0, -50]}
        scale={[30, 60, 1]}
        visible={false}
      >
        <spriteMaterial
          map={glowTexture}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          opacity={0}
        />
      </sprite>


      <sprite
        ref={rightGlowRef}
        position={[35, 0, -50]}
        scale={[30, 60, 1]}
        visible={false}
      >
        <spriteMaterial
          map={glowTexture}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          opacity={0}
        />
      </sprite>


      <sprite
        ref={topGlowRef}
        position={[0, 25, -50]}
        scale={[60, 30, 1]}
        visible={false}
      >
        <spriteMaterial
          map={glowTexture}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          opacity={0}
        />
      </sprite>


      <sprite
        ref={bottomGlowRef}
        position={[0, -25, -50]}
        scale={[60, 30, 1]}
        visible={false}
      >
        <spriteMaterial
          map={glowTexture}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          opacity={0}
        />
      </sprite>
    </>
  );
}

export default DodgeThrusterGlow;
