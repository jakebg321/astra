import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function PortalStyle2({ visible = true }) {
  const groupRef = useRef();
  const vortexRef = useRef();
  const particlesRef = useRef();

  useFrame((state) => {
    if (!visible) return;
    
    const time = state.clock.getElapsedTime();

    if (vortexRef.current) {
      vortexRef.current.rotation.z = time * 0.8;
      vortexRef.current.rotation.y = Math.sin(time * 0.2) * 0.1;
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.z = -time * 1.2;
      particlesRef.current.rotation.x = Math.cos(time * 0.3) * 0.15;
    }

    if (groupRef.current) {
      const scale = 1 + Math.sin(time * 1.5) * 0.05;
      groupRef.current.scale.set(scale, scale, scale);
    }
  });

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      <mesh ref={vortexRef}>
        <ringGeometry args={[0.5, 2.5, 32, 1, 0, Math.PI * 2]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            time: { value: 0 },
            color: { value: new THREE.Color(0x00ff88) }
          }}
          vertexShader={`
            varying vec2 vUv;
            varying vec3 vPosition;
            void main() {
              vUv = uv;
              vPosition = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform float time;
            uniform vec3 color;
            varying vec2 vUv;
            varying vec3 vPosition;
            void main() {
              float spiral = sin(vUv.x * 8.0 - time * 3.0) * cos(vUv.y * 8.0 + time * 2.0);
              float intensity = (spiral + 1.0) * 0.5;
              vec3 finalColor = color * (0.3 + intensity * 0.7);
              float alpha = 0.6 * intensity;
              gl_FragColor = vec4(finalColor, alpha);
            }
          `}
        />
      </mesh>

      <mesh rotation={[0, 0, Math.PI / 4]}>
        <ringGeometry args={[0.3, 1.8, 24, 1, 0, Math.PI * 2]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            time: { value: 0 },
            color: { value: new THREE.Color(0xff8800) }
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
              float spiral = sin(vUv.x * 12.0 + time * 4.0);
              float intensity = (spiral + 1.0) * 0.5;
              vec3 finalColor = color * intensity;
              float alpha = 0.4 * intensity;
              gl_FragColor = vec4(finalColor, alpha);
            }
          `}
        />
      </mesh>

      <mesh ref={particlesRef}>
        <torusGeometry args={[2.2, 0.05, 32, 64]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            time: { value: 0 },
            color: { value: new THREE.Color(0xffff00) }
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
              float particles = step(0.9, sin(vUv.x * 64.0) * sin(vUv.y * 64.0));
              float pulse = sin(time * 6.0) * 0.5 + 0.5;
              vec3 finalColor = color * particles * (0.5 + pulse * 0.5);
              float alpha = particles * 0.8;
              gl_FragColor = vec4(finalColor, alpha);
            }
          `}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[0.4, 16, 16]} />
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
              float swirl = sin(atan(vUv.y - 0.5, vUv.x - 0.5) * 3.0 - time * 2.0);
              float intensity = (swirl + 1.0) * 0.5;
              vec3 finalColor = color * (0.5 + intensity * 0.5);
              float alpha = 0.7;
              gl_FragColor = vec4(finalColor, alpha);
            }
          `}
        />
      </mesh>
    </group>
  );
}
