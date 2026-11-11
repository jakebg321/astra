import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import PortalStyleVideo from './PortalStyleVideo.jsx';
import PortalStyle1 from './PortalStyle1.jsx';
import PortalStyle2 from './PortalStyle2.jsx';
import PortalStyle3 from './PortalStyle3.jsx';
import PortalStyle4 from './PortalStyle4.jsx';
import PortalStyle5 from './PortalStyle5.jsx';

const STYLES = [PortalStyleVideo, PortalStyle1, PortalStyle2, PortalStyle3, PortalStyle4, PortalStyle5];

const PortalCycler = ({ position, isDeploying, beaconPosition, portalMode }) => {
  const groupRef = useRef();
  const beaconRef = useRef();
  const { camera } = useThree();
  const [styleIndex, setStyleIndex] = useState(() => window.portalStyleIndex || 0);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'BracketRight' && isDeploying) {
        setStyleIndex(prev => {
          const next = (prev + 1) % STYLES.length;
          window.portalStyleIndex = next;
          return next;
        });
      }
      if (e.code === 'BracketLeft' && isDeploying) {
        setStyleIndex(prev => {
          const next = (prev - 1 + STYLES.length) % STYLES.length;
          window.portalStyleIndex = next;
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDeploying]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (!isDeploying || !position) {
      groupRef.current.visible = false;
    } else {
      groupRef.current.visible = true;
      groupRef.current.position.set(position.x, position.y, position.z);
      groupRef.current.lookAt(camera.position);
    }

    if (!beaconRef.current) return;
    if (!beaconPosition) {
      beaconRef.current.visible = false;
    } else {
      beaconRef.current.visible = true;
      beaconRef.current.position.set(beaconPosition.x, beaconPosition.y, beaconPosition.z);
      beaconRef.current.lookAt(camera.position);

      beaconRef.current.rotation.z += delta * 0.5;
    }
  });

  const ActiveStyle = STYLES[styleIndex];

  return (
    <>
      <group ref={groupRef} scale={[20, 20, 20]} visible={false}>
        <ActiveStyle visible={isDeploying} />
      </group>


      <group ref={beaconRef} scale={[20, 20, 20]} visible={false}>
        <ActiveStyle visible={true} />
        <pointLight color="#ffaa00" intensity={3} distance={80} />
      </group>
    </>
  );
};

export default PortalCycler;
