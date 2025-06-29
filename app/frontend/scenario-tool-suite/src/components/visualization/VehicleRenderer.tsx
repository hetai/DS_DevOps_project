/**
 * 3D vehicle renderer for OpenSCENARIO entities
 * Renders vehicles with different categories and positions
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Text } from '@react-three/drei';
import { Mesh } from 'three';

interface ScenarioData {
  entities: Array<{
    name: string;
    type: string;
    category?: string;
  }>;
  events: Array<{
    name: string;
    priority: string;
  }>;
  initial_conditions: Array<{
    entity?: string;
    position?: {
      x: number;
      y: number;
      z: number;
    };
    heading?: number;
  }>;
}

interface VehicleRendererProps {
  scenarios: ScenarioData;
  animate?: boolean;
}

export const VehicleRenderer: React.FC<VehicleRendererProps> = ({ 
  scenarios, 
  animate = false 
}) => {
  // Get vehicle dimensions based on category
  const getVehicleDimensions = (category: string = 'car') => {
    switch (category.toLowerCase()) {
      case 'truck':
        return { width: 2.5, length: 8.0, height: 3.0 };
      case 'bus':
        return { width: 2.5, length: 12.0, height: 3.5 };
      case 'bicycle':
        return { width: 0.6, length: 1.8, height: 1.2 };
      case 'motorbike':
        return { width: 0.8, length: 2.2, height: 1.3 };
      default: // car
        return { width: 2.0, length: 4.5, height: 1.5 };
    }
  };

  // Get vehicle color based on category
  const getVehicleColor = (category: string = 'car', name: string) => {
    if (name.toLowerCase().includes('ego')) {
      return '#00ff00'; // Green for ego vehicle
    }

    switch (category.toLowerCase()) {
      case 'truck':
        return '#ff6600';
      case 'bus':
        return '#ffff00';
      case 'bicycle':
        return '#00ccff';
      case 'motorbike':
        return '#ff00ff';
      default: // car
        return '#0066ff';
    }
  };

  // Get initial position for vehicle
  const getVehiclePosition = (entity: ScenarioData['entities'][0]) => {
    const condition = scenarios.initial_conditions.find(
      c => c.entity === entity.name
    );

    if (condition && condition.position) {
      return [condition.position.x, condition.position.y + 0.75, condition.position.z];
    }

    // Default positions based on entity index
    const entityIndex = scenarios.entities.indexOf(entity);
    return [10 + entityIndex * 20, 0.75, 0];
  };

  // Get vehicle rotation
  const getVehicleRotation = (entity: ScenarioData['entities'][0]) => {
    const condition = scenarios.initial_conditions.find(
      c => c.entity === entity.name
    );

    const heading = condition?.heading || 0;
    return [0, heading, 0];
  };

  return (
    <group>
      {scenarios.entities
        .filter(entity => entity.type === 'vehicle')
        .map((entity) => {
          const dimensions = getVehicleDimensions(entity.category);
          const color = getVehicleColor(entity.category || 'car', entity.name);
          const position = getVehiclePosition(entity);
          const rotation = getVehicleRotation(entity);

          return (
            <VehicleModel
              key={entity.name}
              name={entity.name}
              category={entity.category || 'car'}
              dimensions={dimensions}
              color={color}
              position={position}
              rotation={rotation}
              animate={animate}
            />
          );
        })}
    </group>
  );
};

interface VehicleModelProps {
  name: string;
  category: string;
  dimensions: { width: number; length: number; height: number };
  color: string;
  position: number[];
  rotation: number[];
  animate: boolean;
}

const VehicleModel: React.FC<VehicleModelProps> = ({
  name,
  category,
  dimensions,
  color,
  position,
  rotation,
  animate
}) => {
  const meshRef = useRef<Mesh>(null);

  // Animation frame
  useFrame((state, delta) => {
    if (animate && meshRef.current) {
      // Simple idle animation - slight bobbing
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Main vehicle body */}
      <Box
        ref={meshRef}
        args={[dimensions.length, dimensions.height, dimensions.width]}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial color={color} />
      </Box>

      {/* Vehicle wheels (simplified) */}
      <group>
        {/* Front wheels */}
        <Box
          args={[0.3, 0.3, 0.1]}
          position={[dimensions.length * 0.3, -dimensions.height * 0.3, dimensions.width * 0.4]}
        >
          <meshStandardMaterial color="#333333" />
        </Box>
        <Box
          args={[0.3, 0.3, 0.1]}
          position={[dimensions.length * 0.3, -dimensions.height * 0.3, -dimensions.width * 0.4]}
        >
          <meshStandardMaterial color="#333333" />
        </Box>

        {/* Rear wheels */}
        <Box
          args={[0.3, 0.3, 0.1]}
          position={[-dimensions.length * 0.3, -dimensions.height * 0.3, dimensions.width * 0.4]}
        >
          <meshStandardMaterial color="#333333" />
        </Box>
        <Box
          args={[0.3, 0.3, 0.1]}
          position={[-dimensions.length * 0.3, -dimensions.height * 0.3, -dimensions.width * 0.4]}
        >
          <meshStandardMaterial color="#333333" />
        </Box>
      </group>

      {/* Vehicle label */}
      <Text
        position={[0, dimensions.height + 0.5, 0]}
        fontSize={0.5}
        color="#ffffff"
        anchorX="center"
        anchorY="bottom"
        billboard
      >
        {name}
        {category !== 'car' && (
          <Text
            position={[0, -0.3, 0]}
            fontSize={0.3}
            color="#cccccc"
            anchorX="center"
            anchorY="top"
          >
            ({category})
          </Text>
        )}
      </Text>
    </group>
  );
};