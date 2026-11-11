import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';

export default function PortalStyleVideo({ visible = true }) {
  const meshRef = useRef();
  const videoRef = useRef(null);

  const { texture, video } = useMemo(() => {
    const vid = document.createElement('video');
    vid.src = '/portal-swirl.mp4';
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    vid.crossOrigin = 'anonymous';
    vid.preload = 'auto';
    videoRef.current = vid;

    const tex = new THREE.VideoTexture(vid);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.format = THREE.RGBAFormat;
    tex.colorSpace = THREE.SRGBColorSpace;

    return { texture: tex, video: vid };
  }, []);

  useEffect(() => {
    if (visible) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [visible, video]);

  useEffect(() => {
    return () => {
      video.pause();
      video.src = '';
      texture.dispose();
    };
  }, [video, texture]);

  if (!visible) return null;

  return (
    <mesh ref={meshRef}>
      <circleGeometry args={[1.5, 64]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
