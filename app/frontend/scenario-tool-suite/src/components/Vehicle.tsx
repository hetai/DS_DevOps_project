import { Box } from '@react-three/drei';

export const Vehicle = (props: any) => {
  return (
    <Box {...props}>
      <meshStandardMaterial color="red" />
    </Box>
  );
};