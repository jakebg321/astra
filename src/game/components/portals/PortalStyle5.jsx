import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function PortalStyle5({ visible = true }) {
  const groupRef = useRef();
  const tunnelRef = useRef();
  const mouthRef = useRef();

  useFrame((state) => {
    if (!visible) return;
    
    const time = state.clock.getElapsedTime();

    if (tunnelRef.current) {
      tunnelRef.current.rotation.z = time * 0.6;
      tunnelRef.current.rotation.x = Math.sin(time * 0.3) * 0.1;
    }

    if (mouthRef.current) {
      const scale = 1 + Math.sin(time * 2) * 0.08;
      mouthRef.current.scale.set(scale, scale, scale);
    }

    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.1;
      const warpScale = 1 + Math.sin(time * 0.8) * 0.03;
      groupRef.current.scale.set(warpScale, warpScale, warpScale);
    }
  });

  if (!visible) return null;

  const tunnelSegments = [];
  const segmentCount = 15;
  
  for (let i = 0; i < segmentCount; i++) {
    const z = -i * 0.3;
    const radius = 2.5 - i * 0.12;
    const opacity = 0.6 - i * 0.035;
    
    tunnelSegments.push(
      <mesh
        key={`segment-${i}`}
        position={[0, 0, z]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[radius - 0.08, radius + 0.08, 24, 1]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            time: { value: 0 },
            color: { value: new THREE.Color(0x8800ff) },
            opacity: { value: opacity },
            segmentIndex: { value: i }
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
            uniform float opacity;
            uniform float segmentIndex;
            varying vec2 vUv;
            varying vec3 vPosition;
            void main() {
              float spiral = sin(atan(vPosition.y, vPosition.x) * 4.0 - time * 3.0 + segmentIndex * 0.5);
              float depth = 1.0 - segmentIndex / 15.0;
              float intensity = (spiral + 1.0) * 0.5 * depth;
              vec3 finalColor = color * (0.3 + intensity * 0.7);
              float alpha = opacity * (0.4 + intensity * 0.6);
              gl_FragColor = vec4(finalColor, alpha);
            }
          `}
        />
      </mesh>
    );
  }

  return (
    <group ref={groupRef}>
      <group ref={tunnelRef}>
        {tunnelSegments}
      </group>

      <mesh ref={mouthRef}>
        <torusGeometry args={[2.5, 0.15, 24, 32]} />
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
              float warp = sin(atan(vPosition.y, vPosition.x) * 6.0 - time * 2.0);
              float pulse = sin(time * 3.0) * 0.5 + 0.5;
              float intensity = (warp + 1.0) * 0.5 * (0.5 + pulse * 0.5);
              vec3 finalColor = color * (0.4 + intensity * 0.6);
              float alpha = 0.7;
              gl_FragColor = vec4(finalColor, alpha);
            }
          `}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 2.35, 32, 1]} />
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
              float energy = sin(vUv.x * 16.0 - time * 4.0) * cos(vUv.y * 16.0 + time * 3.0);
              float intensity = (energy + 1.0) * 0.5;
              vec3 finalColor = color * (0.5 + intensity * 0.5);
              float alpha = 0.6 * intensity;
              gl_FragColor = vec4(finalColor, alpha);
            }
          `}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[0.6, 16, 16]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            time: { value: 0 },
            color: { value: new THREE.Color(0x000000) }
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
              float distortion = sin(vPosition.x * 20.0 + time * 5.0) * sin(vPosition.y * 20.0 + time * 4.0);
              float intensity = 1.0 - abs(distortion) * 0.3;
              vec3 finalColor = color * intensity;
              float alpha = 0.9;
              gl_FragColor = vec4(finalColor, alpha);
            }
          `}
        />
      </mesh>

      {[...Array(16)].map((_, i) => {
        const angle = (i * Math.PI * 2) / 16;
        const radius = 2.8;
        return (
          <mesh
            key={`particle-${i}`}
            position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0]}
          >
            <sphereGeometry args={[0.04, 6, 6]} />
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
                  float flicker = sin(time * 8.0 + vUv.x * 12.0) * 0.5 + 0.5;
                  vec3 finalColor = color * (0.7 + flicker * 0.3);
                  float alpha = 0.8;
                  gl_FragColor = vec4(finalColor, alpha);
                }
              `}
            />
          </mesh>
        );
      })}
    </group>
  );
}
