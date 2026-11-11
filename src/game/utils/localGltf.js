import { useGLTF } from '@react-three/drei';

useGLTF.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);

export { useGLTF };
