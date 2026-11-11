import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function PortalStyle3({ visible = true }) {
  const groupRef = useRef();
  const frameRef = useRef();
  const centerRef = useRef();

  useFrame((state) => {
    if (!visible) return;
    
    const time = state.clock.getElapsedTime();

    if (frameRef.current) {
      frameRef.current.rotation.z = time * 0.3;
      frameRef.current.rotation.y = Math.sin(time * 0.1) * 0.1;
    }

    if (centerRef.current) {
      const scale = 1 + Math.sin(time * 2.5) * 0.15;
      centerRef.current.scale.set(scale, scale, scale);
    }

    if (groupRef.current) {
      const breathScale = 1 + Math.sin(time * 0.8) * 0.03;
      groupRef.current.scale.set(breathScale, breathScale, breathScale);
    }
  });

  if (!visible) return null;

  const hexRings = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6;
    hexRings.push(
      <mesh
        key={i}
        position={[Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, 0]}
        rotation={[0, 0, angle]}
      >
        <ringGeometry args={[0.3, 0.5, 8, 1]} />
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
              float pulse = sin(time * 3.0 + vUv.x * 6.28) * 0.5 + 0.5;
              vec3 finalColor = color * (0.4 + pulse * 0.6);
              float alpha = 0.7;
              gl_FragColor = vec4(finalColor, alpha);
            }
          `}
        />
      </mesh>
    );
  }

  return (
    <group ref={groupRef}>
      <group ref={frameRef}>
        {hexRings}
        
        <mesh>
          <ringGeometry args={[1.2, 1.4, 6, 1]} />
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
                float hexPattern = sin(vUv.x * 6.28) * cos(vUv.y * 6.28);
                float intensity = (hexPattern + 1.0) * 0.5;
                vec3 finalColor = color * (0.5 + intensity * 0.5);
                float alpha = 0.6;
                gl_FragColor = vec4(finalColor, alpha);
              }
            `}
          />
        </mesh>
      </group>

      <mesh ref={centerRef}>
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
              float hexPattern = sin(vPosition.x * 10.0) * sin(vPosition.y * 10.0) * sin(vPosition.z * 10.0);
              float pulse = sin(time * 4.0) * 0.5 + 0.5;
              float intensity = (hexPattern + 1.0) * 0.5 * (0.5 + pulse * 0.5);
              vec3 finalColor = color * (0.3 + intensity * 0.7);
              float alpha = 0.8;
              gl_FragColor = vec4(finalColor, alpha);
            }
          `}
        />
      </mesh>

      {[...Array(6)].map((_, i) => {
        const angle = (i * Math.PI * 2) / 6;
        return (
          <mesh
            key={`connector-${i}`}
            position={[Math.cos(angle) * 0.9, Math.sin(angle) * 0.9, 0]}
            rotation={[0, 0, angle + Math.PI / 2]}
          >
            <ringGeometry args={[0.05, 0.15, 8, 1]} />
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
                  float pulse = sin(time * 5.0) * 0.5 + 0.5;
                  vec3 finalColor = color * (0.6 + pulse * 0.4);
                  float alpha = 0.9;
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
