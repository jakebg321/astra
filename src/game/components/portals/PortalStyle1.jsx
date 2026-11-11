import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function PortalStyle1({ visible = true }) {
  const groupRef = useRef();
  const ring1Ref = useRef();
  const ring2Ref = useRef();
  const coreRef = useRef();

  useFrame((state) => {
    if (!visible) return;
    
    const time = state.clock.getElapsedTime();

    if (ring1Ref.current) ring1Ref.current.rotation.z = time * 0.5;
    if (ring2Ref.current) ring2Ref.current.rotation.z = -time * 0.3;

    if (coreRef.current) {
      const scale = 1 + Math.sin(time * 2) * 0.1;
      coreRef.current.scale.set(scale, scale, scale);
    }

    if (groupRef.current) groupRef.current.rotation.y = Math.sin(time * 0.1) * 0.2;
  });

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      <mesh ref={ring1Ref}>
        <torusGeometry args={[2, 0.1, 16, 32]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            time: { value: 0 },
            color: { value: new THREE.Color(0x00ffff) }
          }}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform float time;
            uniform vec3 color;
            varying vec2 vUv;
            void main() {
              float pulse = sin(time * 3.0) * 0.5 + 0.5;
              vec3 finalColor = color * (0.5 + pulse * 0.5);
              float alpha = 0.8 * (1.0 - distance(vUv, vec2(0.5)) * 2.0);
              gl_FragColor = vec4(finalColor, alpha);
            }
          `}
        />
      </mesh>

      <mesh ref={ring2Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.08, 16, 32]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            time: { value: 0 },
            color: { value: new THREE.Color(0xff00ff) }
          }}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform float time;
            uniform vec3 color;
            varying vec2 vUv;
            void main() {
              float pulse = sin(time * 4.0) * 0.5 + 0.5;
              vec3 finalColor = color * (0.6 + pulse * 0.4);
              float alpha = 0.7;
              gl_FragColor = vec4(finalColor, alpha);
            }
          `}
        />
      </mesh>

      <mesh ref={coreRef}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            time: { value: 0 },
            color: { value: new THREE.Color(0xffffff) }
          }}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform float time;
            uniform vec3 color;
            varying vec2 vUv;
            void main() {
              float noise = sin(vUv.x * 10.0 + time * 2.0) * sin(vUv.y * 10.0 + time * 3.0);
              float intensity = 0.8 + noise * 0.2;
              vec3 finalColor = color * intensity;
              float alpha = 0.9 * (1.0 - distance(vUv, vec2(0.5)));
              gl_FragColor = vec4(finalColor, alpha);
            }
          `}
        />
      </mesh>
    </group>
  );
}
