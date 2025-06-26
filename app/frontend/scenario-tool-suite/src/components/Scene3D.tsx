
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Vehicle } from './Vehicle';
import { Road } from './Road';

const Scene3D = () => {
  return (
    <Canvas camera={{ position: [0, 5, 10], fov: 75 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 10, 5]} intensity={1} />
      <Road />
      <Vehicle position={[0, 0.5, 0]} />
      <OrbitControls />
      <gridHelper />
    </Canvas>
  );
};

export default Scene3D;
