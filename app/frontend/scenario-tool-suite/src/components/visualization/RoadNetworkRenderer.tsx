/**
 * 3D road network renderer for OpenDRIVE visualization
 * Renders roads, lanes, junctions, and markings
 */

import React from 'react';
import { Line, Text } from '@react-three/drei';
import { Vector3 } from 'three';

interface RoadData {
  roads: Array<{
    id: string;
    name: string;
    length: number;
    junction: string;
  }>;
  junctions: Array<{
    id: string;
    name: string;
  }>;
  bounds: {
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;
  };
}

interface RoadNetworkRendererProps {
  roadData: RoadData;
  showLabels?: boolean;
}

export const RoadNetworkRenderer: React.FC<RoadNetworkRendererProps> = ({ 
  roadData, 
  showLabels = false 
}) => {
  // Generate simplified road geometry
  const generateRoadGeometry = (road: RoadData['roads'][0]) => {
    const isJunction = road.junction !== "-1";
    const points: Vector3[] = [];

    if (isJunction) {
      // Simple junction as circular points
      const centerX = 100;
      const centerY = 0;
      const radius = 20;
      for (let i = 0; i <= 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        points.push(new Vector3(
          centerX + Math.cos(angle) * radius,
          0,
          centerY + Math.sin(angle) * radius
        ));
      }
    } else {
      // Regular road as straight line
      const roadIndex = parseInt(road.id);
      const startX = roadIndex * 50;
      const endX = startX + road.length;
      
      points.push(new Vector3(startX, 0, 0));
      points.push(new Vector3(endX, 0, 0));
    }

    return points;
  };

  // Generate lane markings
  const generateLaneMarkings = (road: RoadData['roads'][0]) => {
    const isJunction = road.junction !== "-1";
    if (isJunction) return [];

    const roadIndex = parseInt(road.id);
    const startX = roadIndex * 50;
    const endX = startX + road.length;
    
    // Center line
    const centerLine = [
      new Vector3(startX, 0.01, 0),
      new Vector3(endX, 0.01, 0)
    ];

    // Lane boundaries
    const leftBoundary = [
      new Vector3(startX, 0.01, 3.5),
      new Vector3(endX, 0.01, 3.5)
    ];

    const rightBoundary = [
      new Vector3(startX, 0.01, -3.5),
      new Vector3(endX, 0.01, -3.5)
    ];

    return [centerLine, leftBoundary, rightBoundary];
  };

  return (
    <group>
      {/* Road surfaces and lines */}
      {roadData.roads.map((road) => {
        const roadPoints = generateRoadGeometry(road);
        const laneMarkings = generateLaneMarkings(road);
        const isJunction = road.junction !== "-1";

        return (
          <group key={road.id}>
            {/* Main road line */}
            <Line
              points={roadPoints}
              color={isJunction ? "#ffaa00" : "#666666"}
              lineWidth={isJunction ? 3 : 2}
            />

            {/* Lane markings */}
            {laneMarkings.map((marking, index) => (
              <Line
                key={`${road.id}-marking-${index}`}
                points={marking}
                color="#ffffff"
                lineWidth={1}
                dashed={index === 0} // Center line is dashed
                dashSize={index === 0 ? 2 : undefined}
                gapSize={index === 0 ? 1 : undefined}
              />
            ))}

            {/* Road labels */}
            {showLabels && (
              <Text
                position={[
                  roadPoints[0].x + (roadPoints[roadPoints.length - 1].x - roadPoints[0].x) / 2,
                  2,
                  roadPoints[0].z + (roadPoints[roadPoints.length - 1].z - roadPoints[0].z) / 2
                ]}
                fontSize={1}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
              >
                {road.name || `Road ${road.id}`}
              </Text>
            )}
          </group>
        );
      })}

      {/* Junction labels */}
      {showLabels && roadData.junctions.map((junction) => (
        <Text
          key={junction.id}
          position={[100, 5, 0]} // Fixed junction position for now
          fontSize={1.5}
          color="#ffaa00"
          anchorX="center"
          anchorY="middle"
        >
          {junction.name || `Junction ${junction.id}`}
        </Text>
      ))}

      {/* Ground grid */}
      <gridHelper 
        args={[
          Math.max(roadData.bounds.max_x - roadData.bounds.min_x, 100),
          20,
          "#333333",
          "#333333"
        ]} 
        position={[
          (roadData.bounds.max_x + roadData.bounds.min_x) / 2,
          -0.1,
          (roadData.bounds.max_y + roadData.bounds.min_y) / 2
        ]}
      />
    </group>
  );
};