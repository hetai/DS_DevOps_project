/**
 * Road Network Renderer - Creates 3D visualization of OpenDRIVE road networks
 * Uses React Three Fiber for declarative 3D rendering
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParsedOpenDrive } from '../types/VisualizationTypes';
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
  
  // Road material without texture (using basic color)
  const roadMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0x404040, // Dark gray asphalt color
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.2,
    });
  }, []);
  
  // Generate lane geometries
  const laneGeometries = useMemo(() => {
    const lanes: { geometry: THREE.BufferGeometry; material: THREE.Material; position: THREE.Vector3 }[] = [];
    
    if (!road.lanes?.laneSection) return lanes;
    
    const centerline = road.planView ? 
      GeometryUtils.generateGeometryPoints(road.planView[0], 50) : 
      [new THREE.Vector3(0, 0, 0), new THREE.Vector3(road.length || 10, 0, 0)];
    
    for (const laneSection of road.lanes.laneSection) {
      let currentOffset = 0;
      
      if (laneSection.left?.lanes) {
        for (const lane of laneSection.left.lanes) {
          if (lane.type === 'driving') {
            const laneWidth = lane.width?.[0]?.a || 3.5;
            currentOffset += laneWidth;
            
            const laneGeometry = GeometryUtils.createLaneGeometry(
              centerline,
              lane.width || [{ sOffset: 0, a: 3.5, b: 0, c: 0, d: 0 }],
              currentOffset - laneWidth,
              laneSection.s
            );
            
            const laneMaterial = new THREE.MeshStandardMaterial({
              color: 0x505050,
              roughness: 0.9,
              metalness: 0.1,
            });
            
            lanes.push({
              geometry: laneGeometry,
              material: laneMaterial,
              position: new THREE.Vector3(0, 0, 0.01)
            });
          }
        }
      }
      
      currentOffset = 0;
      
      if (laneSection.right?.lanes) {
        for (const lane of laneSection.right.lanes) {
          if (lane.type === 'driving') {
            const laneWidth = lane.width?.[0]?.a || 3.5;
            currentOffset -= laneWidth;
            
            const laneGeometry = GeometryUtils.createLaneGeometry(
              centerline,
              lane.width || [{ sOffset: 0, a: 3.5, b: 0, c: 0, d: 0 }],
              currentOffset,
              laneSection.s
            );
            
            const laneMaterial = new THREE.MeshStandardMaterial({
              color: 0x505050,
              roughness: 0.9,
              metalness: 0.1,
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
    
    const centerline = road.planView ? 
      GeometryUtils.generateGeometryPoints(road.planView[0], 50) : 
      [new THREE.Vector3(0, 0, 0), new THREE.Vector3(road.length || 10, 0, 0)];
    
    for (const laneSection of road.lanes.laneSection) {
      let currentOffset = 0;
      
      if (laneSection.left?.lanes) {
        for (const lane of laneSection.left.lanes) {
          if (lane.roadMark && lane.roadMark.length > 0) {
            const roadMark = lane.roadMark[0];
            const markingPoints = centerline.map(point => point.clone().add(new THREE.Vector3(0, currentOffset, 0.02)));
            const markingGeometry = GeometryUtils.createDashedLineGeometry(
              markingPoints,
              1.0, // dash size
              0.5, // gap size
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
      <mesh geometry={roadGeometry} material={roadMaterial} receiveShadow />
      
      {/* Individual lanes */}
      {laneGeometries.map((lane, index) => (
        <mesh 
          key={`lane-${index}`}
          geometry={lane.geometry}
          material={lane.material}
          position={lane.position}
          receiveShadow
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
 * Main Road Network Renderer component
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

  // Error handling for missing data
  useEffect(() => {
    if (!openDriveData && onError) {
      onError('No OpenDRIVE data provided');
    }
  }, [openDriveData, onError]);

  // Update visibility
  useFrame(() => {
    if (roadNetworkRef.current) {
      roadNetworkRef.current.visible = visible;
    }
  });

  if (!openDriveData) {
    return null;
  }

  return (
    <group ref={roadNetworkRef} name="road-network">
      {/* Render roads */}
      {openDriveData.roads?.map((road) => (
        <RoadMesh
          key={road.id}
          road={road}
          qualityLevel={qualityLevel}
          showLaneMarkings={showLaneMarkings}
        />
      ))}
      
      {/* Render junctions */}
      {showJunctions && openDriveData.junctions?.map((junction) => (
        <Junction
          key={junction.id}
          junction={junction}
          visible={visible}
        />
      ))}
    </group>
  );
}

// Export additional utilities
export { RoadMesh, Junction, LaneMarking };