import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function PortalStyle4({ visible = true }) {
  const groupRef = useRef();
  const rippleRefs = useRef([]);

  useFrame((state) => {
    if (!visible) return;
    
    const time = state.clock.getElapsedTime();

    rippleRefs.current.forEach((ref, index) => {
      if (ref) {
        const speed = 0.3 + index * 0.1;
        const phase = index * 0.5;
        ref.rotation.z = time * speed + phase;

        const scale = 1 + Math.sin(time * 2 + phase) * 0.05;
        ref.scale.set(scale, scale, scale);
      }
    });

    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(time * 0.2) * 0.1;
      groupRef.current.position.y = Math.sin(time * 0.5) * 0.05;
    }
  });

  if (!visible) return null;

  const ripples = [];
  const rippleCount = 8;
  
  for (let i = 0; i < rippleCount; i++) {
    const radius = 0.4 + i * 0.25;
    const thickness = 0.02 + i * 0.005;
    const opacity = 0.8 - i * 0.08;
    
    ripples.push(
      <mesh
        key={i}
        ref={(el) => (rippleRefs.current[i] = el)}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[radius - thickness, radius + thickness, 32, 1]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            time: { value: 0 },
            color: { value: new THREE.Color(0x00ccff) },
            opacity: { value: opacity }
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
            uniform float opacity;
            varying vec2 vUv;
            void main() {
              float wave = sin(vUv.x * 20.0 - time * 3.0) * 0.5 + 0.5;
              float ripple = sin(vUv.y * 30.0 + time * 2.0) * 0.5 + 0.5;
              float intensity = wave * ripple;
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
      {ripples}


      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
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
              float water = sin(vPosition.x * 15.0 + time * 2.0) * sin(vPosition.y * 15.0 + time * 3.0);
              float drop = sin(vPosition.z * 10.0 - time * 1.5);
              float intensity = (water + drop + 2.0) * 0.25;
              vec3 finalColor = color * (0.4 + intensity * 0.6);
              float alpha = 0.8;
              gl_FragColor = vec4(finalColor, alpha);
            }
          `}
        />
      </mesh>

      {[...Array(12)].map((_, i) => {
        const angle = (i * Math.PI * 2) / 12;
        const radius = 1.5 + Math.sin(i * 0.5) * 0.3;
        return (
          <mesh
            key={`droplet-${i}`}
            position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0]}
          >
            <sphereGeometry args={[0.05, 8, 8]} />
            <shaderMaterial
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              uniforms={{
                time: { value: 0 },
                color: { value: new THREE.Color(0x88ddff) }
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
                  float pulse = sin(time * 4.0 + vUv.x * 10.0) * 0.5 + 0.5;
                  vec3 finalColor = color * (0.5 + pulse * 0.5);
                  float alpha = 0.6;
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
