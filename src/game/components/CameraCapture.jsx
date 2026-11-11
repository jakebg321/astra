import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

export function CameraCapture({ onCameraCapture }) {
  const { camera } = useThree();
  
  useEffect(() => {
    if (camera && onCameraCapture) {
      onCameraCapture(camera);
    }
  }, [camera, onCameraCapture]);
  
  return null;
}