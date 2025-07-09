import { Plane } from '@react-three/drei';

export const Road = (props: any) => {
  return (
    <Plane {...props} args={[1000, 1000]} rotation={[0, 0, 0]} position={[0, 0, 0]}>
      <meshStandardMaterial color="gray" />
    </Plane>
  );
};