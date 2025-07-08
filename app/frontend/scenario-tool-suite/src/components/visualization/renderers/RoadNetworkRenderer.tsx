/**
 * Road Network Renderer - Creates 3D visualization of OpenDRIVE road networks
 * Uses React Three Fiber for declarative 3D rendering
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParsedOpenDrive, RoadElement } from '../types/VisualizationTypes';
import { OpenDriveParser } from '../parsers/OpenDriveParser';
import { GeometryUtils } from '../utils/GeometryUtils';

interface RoadNetworkRendererProps {
  openDriveData?: ParsedOpenDrive;
  showLaneMarkings?: boolean;
  showJunctions?: boolean;
  qualityLevel?: 'low' | 'medium' | 'high';
  visible?: boolean;
  onError?: (error: string) => void;
}

interface RoadMeshProps {
  road: any;
  qualityLevel: 'low' | 'medium' | 'high';
  showLaneMarkings: boolean;
}

interface LaneMarkingProps {
  road: any;
  lane: any;
  centerline: THREE.Vector3[];
  laneOffset: number;
}

interface JunctionProps {
  junction: any;
  visible: boolean;
}

/**
 * Individual road mesh component
 */
function RoadMesh({ road, qualityLevel, showLaneMarkings }: RoadMeshProps) {
  const roadGroupRef = useRef<THREE.Group>(null);
  
  // Generate road geometry based on quality level
  const roadGeometry = useMemo(() => {
    if (!road.planView || road.planView.length === 0) {
      return new THREE.PlaneGeometry(1, 1);
    }
    
    const resolution = qualityLevel === 'high' ? 100 : qualityLevel === 'medium' ? 50 : 25;
    return GeometryUtils.createRoadGeometry(road.planView, 7.0, resolution);
  }, [road.planView, qualityLevel]);
  
  // Road material
  const roadMaterial = useMemo(() => {
    return new THREE.MeshLambertMaterial({
      color: 0x404040,
      side: THREE.DoubleSide,
    });
  }, []);
  
  // Generate lane geometries
  const laneGeometries = useMemo(() => {
    const lanes: { geometry: THREE.BufferGeometry; material: THREE.Material; position: THREE.Vector3 }[] = [];
    
    if (!road.lanes?.laneSection) return lanes;
    
    // Generate centerline points
    const centerline = road.planView ? 
      GeometryUtils.generateGeometryPoints(road.planView[0], 50) : 
      [new THREE.Vector3(0, 0, 0), new THREE.Vector3(road.length || 10, 0, 0)];
    
    for (const laneSection of road.lanes.laneSection) {
      let currentOffset = 0;
      
      // Process left lanes
      if (laneSection.left?.lanes) {
        for (const lane of laneSection.left.lanes) {
          if (lane.type === 'driving' || lane.type === 'parking') {
            const laneWidth = lane.width?.[0]?.a || 3.5;
            currentOffset += laneWidth;
            
            const laneGeometry = GeometryUtils.createLaneGeometry(
              centerline,
              lane.width || [{ sOffset: 0, a: 3.5, b: 0, c: 0, d: 0 }],
              currentOffset - laneWidth,
              laneSection.s
            );
            
            const laneMaterial = new THREE.MeshLambertMaterial({
              color: lane.type === 'driving' ? 0x505050 : 0x353535,
              transparent: true,
              opacity: 0.9
            });
            
            lanes.push({
              geometry: laneGeometry,
              material: laneMaterial,
              position: new THREE.Vector3(0, 0, 0.01) // Slightly above road surface
            });
          }
        }
      }
      
      // Reset offset for right lanes
      currentOffset = 0;
      
      // Process right lanes
      if (laneSection.right?.lanes) {
        for (const lane of laneSection.right.lanes) {
          if (lane.type === 'driving' || lane.type === 'parking') {
            const laneWidth = lane.width?.[0]?.a || 3.5;
            currentOffset -= laneWidth;
            
            const laneGeometry = GeometryUtils.createLaneGeometry(
              centerline,
              lane.width || [{ sOffset: 0, a: 3.5, b: 0, c: 0, d: 0 }],
              currentOffset,
              laneSection.s
            );
            
            const laneMaterial = new THREE.MeshLambertMaterial({
              color: lane.type === 'driving' ? 0x505050 : 0x353535,
              transparent: true,
              opacity: 0.9
            });
            
            lanes.push({
              geometry: laneGeometry,
              material: laneMaterial,
              position: new THREE.Vector3(0, 0, 0.01)
            });
          }
        }
      }
    }
    
    return lanes;
  }, [road.lanes, road.planView, road.length]);
  
  // Lane markings
  const laneMarkings = useMemo(() => {
    if (!showLaneMarkings || !road.lanes?.laneSection) return [];
    
    const markings: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = [];
    
    // Generate centerline for markings
    const centerline = road.planView ? 
      GeometryUtils.generateGeometryPoints(road.planView[0], 50) : 
      [new THREE.Vector3(0, 0, 0), new THREE.Vector3(road.length || 10, 0, 0)];
    
    for (const laneSection of road.lanes.laneSection) {
      let currentOffset = 0;
      
      // Process lane markings
      if (laneSection.left?.lanes) {
        for (const lane of laneSection.left.lanes) {
          if (lane.roadMark && lane.roadMark.length > 0) {
            const roadMark = lane.roadMark[0];
            const markingGeometry = GeometryUtils.createTrajectoryGeometry(
              centerline.map(point => point.clone().add(new THREE.Vector3(0, currentOffset, 0.02))),
              roadMark.width || 0.15
            );
            
            const markingMaterial = new THREE.MeshBasicMaterial({
              color: roadMark.color === 'white' ? 0xffffff : roadMark.color === 'yellow' ? 0xffff00 : 0xffffff
            });
            
            markings.push({ geometry: markingGeometry, material: markingMaterial });
          }
          
          const laneWidth = lane.width?.[0]?.a || 3.5;
          currentOffset += laneWidth;
        }
      }
    }
    
    return markings;
  }, [road.lanes, road.planView, road.length, showLaneMarkings]);
  
  // Cleanup geometries on unmount
  useEffect(() => {
    return () => {
      roadGeometry.dispose();
      roadMaterial.dispose();
      laneGeometries.forEach(lane => {
        lane.geometry.dispose();
        lane.material.dispose();
      });
      laneMarkings.forEach(marking => {
        marking.geometry.dispose();
        marking.material.dispose();
      });
    };
  }, [roadGeometry, roadMaterial, laneGeometries, laneMarkings]);
  
  return (
    <group ref={roadGroupRef} name={`road-${road.id}`}>
      {/* Main road surface */}
      <mesh geometry={roadGeometry} material={roadMaterial} />
      
      {/* Individual lanes */}
      {laneGeometries.map((lane, index) => (
        <mesh 
          key={`lane-${index}`}
          geometry={lane.geometry}
          material={lane.material}
          position={lane.position}
        />
      ))}
      
      {/* Lane markings */}
      {laneMarkings.map((marking, index) => (
        <mesh
          key={`marking-${index}`}
          geometry={marking.geometry}
          material={marking.material}
        />
      ))}
    </group>
  );
}

/**
 * Lane marking component
 */
function LaneMarking({ road, lane, centerline, laneOffset }: LaneMarkingProps) {
  const markingGeometry = useMemo(() => {
    if (!lane.roadMark || lane.roadMark.length === 0) {
      return null;
    }
    
    const roadMark = lane.roadMark[0];
    const markingPoints = centerline.map(point => 
      point.clone().add(new THREE.Vector3(0, laneOffset, 0.02))
    );
    
    return GeometryUtils.createTrajectoryGeometry(markingPoints, roadMark.width || 0.15);
  }, [centerline, lane.roadMark, laneOffset]);
  
  const markingMaterial = useMemo(() => {
    if (!lane.roadMark || lane.roadMark.length === 0) {
      return new THREE.MeshBasicMaterial({ color: 0xffffff });
    }
    
    const roadMark = lane.roadMark[0];
    const color = roadMark.color === 'white' ? 0xffffff : 
                 roadMark.color === 'yellow' ? 0xffff00 : 0xffffff;
    
    return new THREE.MeshBasicMaterial({ color });
  }, [lane.roadMark]);
  
  if (!markingGeometry) return null;
  
  return <mesh geometry={markingGeometry} material={markingMaterial} />;
}

/**
 * Junction component
 */
function Junction({ junction, visible }: JunctionProps) {
  const junctionRef = useRef<THREE.Mesh>(null);
  
  const junctionGeometry = useMemo(() => {
    // Create a circular geometry for junction visualization
    return new THREE.CircleGeometry(5, 16);
  }, []);
  
  const junctionMaterial = useMemo(() => {
    return new THREE.MeshLambertMaterial({
      color: 0x606060,
      transparent: true,
      opacity: 0.6
    });
  }, []);
  
  // Calculate junction position (simplified - should be calculated from connecting roads)
  const position = useMemo(() => {
    return new THREE.Vector3(0, 0, 0.005); // Slightly above road level
  }, []);
  
  useFrame(() => {
    if (junctionRef.current) {
      junctionRef.current.visible = visible;
    }
  });
  
  useEffect(() => {
    return () => {
      junctionGeometry.dispose();
      junctionMaterial.dispose();
    };
  }, [junctionGeometry, junctionMaterial]);
  
  return (
    <mesh
      ref={junctionRef}
      geometry={junctionGeometry}
      material={junctionMaterial}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]} // Rotate to lie flat
      name={`junction-${junction.id}`}
    />
  );
}

/**
 * Road network debug helpers
 */
function RoadNetworkDebug({ roads }: { roads: any[] }) {
  const debugLines = useMemo(() => {
    const lines: { points: THREE.Vector3[]; color: number }[] = [];
    
    for (const road of roads) {
      if (road.planView && road.planView.length > 0) {
        const points = GeometryUtils.generateGeometryPoints(road.planView[0], 20);
        lines.push({ points, color: 0xff0000 }); // Red centerline
      }
    }
    
    return lines;
  }, [roads]);
  
  return (
    <group name="road-debug">
      {debugLines.map((line, index) => (
        <line key={index}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={line.points.length}
              array={new Float32Array(line.points.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={line.color} />
        </line>
      ))}
    </group>
  );
}

/**
 * Main road network renderer component
 */
export default function RoadNetworkRenderer({
  openDriveData,
  showLaneMarkings = true,
  showJunctions = true,
  qualityLevel = 'medium',
  visible = true,
  onError
}: RoadNetworkRendererProps) {
  const roadNetworkRef = useRef<THREE.Group>(null);
  
  // Parse and validate OpenDRIVE data
  const parsedData = useMemo(() => {
    if (!openDriveData) return null;
    
    try {
      // Validate the data
      const parser = new OpenDriveParser();
      const validation = parser.validateParsedData(openDriveData);
      
      if (!validation.isValid) {
        console.warn('OpenDRIVE validation warnings:', validation.errors);
        onError?.(`OpenDRIVE validation issues: ${validation.errors.join(', ')}`);
      }
      
      return openDriveData;
    } catch (error: any) {
      console.error('Error processing OpenDRIVE data:', error);
      onError?.(`Failed to process OpenDRIVE data: ${error.message}`);
      return null;
    }
  }, [openDriveData, onError]);
  
  // Calculate road network bounds for LOD
  const networkBounds = useMemo(() => {
    if (!parsedData?.boundingBox) {
      return { size: 100, center: new THREE.Vector3(0, 0, 0) };
    }
    
    const { min, max } = parsedData.boundingBox;
    const size = min.distanceTo(max);
    const center = min.clone().add(max).multiplyScalar(0.5);
    
    return { size, center };
  }, [parsedData]);
  
  // Level of Detail management
  const [lodLevel, setLodLevel] = React.useState<'high' | 'medium' | 'low'>('medium');
  
  useFrame(({ camera }) => {
    if (!roadNetworkRef.current) return;
    
    const distance = camera.position.distanceTo(networkBounds.center);
    const newLodLevel = distance > networkBounds.size * 2 ? 'low' :
                      distance > networkBounds.size ? 'medium' : 'high';
    
    if (newLodLevel !== lodLevel) {
      setLodLevel(newLodLevel);
    }
  });
  
  // Update visibility
  useFrame(() => {
    if (roadNetworkRef.current) {
      roadNetworkRef.current.visible = visible;
    }
  });
  
  if (!parsedData) {
    return null;
  }
  
  return (
    <group ref={roadNetworkRef} name="road-network">
      {/* Roads */}
      {parsedData.roads?.map((road: any) => (
        <RoadMesh
          key={road.id}
          road={road}
          qualityLevel={Math.min(qualityLevel, lodLevel) as 'low' | 'medium' | 'high'}
          showLaneMarkings={showLaneMarkings && lodLevel !== 'low'}
        />
      ))}
      
      {/* Junctions */}
      {showJunctions && parsedData.junctions?.map((junction: any) => (
        <Junction
          key={junction.id}
          junction={junction}
          visible={visible}
        />
      ))}
      
      {/* Debug helpers (only in development) */}
      {process.env.NODE_ENV === 'development' && parsedData.roads && (
        <RoadNetworkDebug roads={parsedData.roads} />
      )}
    </group>
  );
}

// Export additional utilities
export { RoadMesh, Junction, LaneMarking };