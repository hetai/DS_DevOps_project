import React from 'react';
import { Cylinder, Cone, Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface CoordinateAxesProps {
  size?: number;
  showLabels?: boolean;
  showOrigin?: boolean;
}

export const CoordinateAxes: React.FC<CoordinateAxesProps> = ({
  size = 5,
  showLabels = true,
  showOrigin = true
}) => {
  const axisRadius = size * 0.01;
  const arrowLength = size * 0.2;
  const arrowRadius = size * 0.03;

  return (
    <group>
      {/* Origin sphere */}
      {showOrigin && (
        <Sphere args={[axisRadius * 2]} position={[0, 0, 0]}>
          <meshBasicMaterial color="white" />
        </Sphere>
      )}

      {/* X-axis (Red) */}
      <group>
        <Cylinder
          args={[axisRadius, axisRadius, size]}
          position={[size / 2, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <meshBasicMaterial color="red" />
        </Cylinder>
        <Cone
          args={[arrowRadius, arrowLength]}
          position={[size + arrowLength / 2, 0, 0]}
          rotation={[0, 0, -Math.PI / 2]}
        >
          <meshBasicMaterial color="red" />
        </Cone>
      </group>

      {/* Y-axis (Green) */}
      <group>
        <Cylinder
          args={[axisRadius, axisRadius, size]}
          position={[0, size / 2, 0]}
        >
          <meshBasicMaterial color="green" />
        </Cylinder>
        <Cone
          args={[arrowRadius, arrowLength]}
          position={[0, size + arrowLength / 2, 0]}
        >
          <meshBasicMaterial color="green" />
        </Cone>
      </group>

      {/* Z-axis (Blue) */}
      <group>
        <Cylinder
          args={[axisRadius, axisRadius, size]}
          position={[0, 0, size / 2]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <meshBasicMaterial color="blue" />
        </Cylinder>
        <Cone
          args={[arrowRadius, arrowLength]}
          position={[0, 0, size + arrowLength / 2]}
        >
          <meshBasicMaterial color="blue" />
        </Cone>
      </group>
    </group>
  );
};

export default CoordinateAxes;