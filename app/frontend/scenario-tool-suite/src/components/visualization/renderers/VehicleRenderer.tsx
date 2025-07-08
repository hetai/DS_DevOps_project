/**
 * Vehicle Renderer - Creates 3D visualization of vehicles and their trajectories
 * Handles vehicle animations, trajectory paths, and dynamic positioning
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VehicleElement, TimelineEvent } from '../types/VisualizationTypes';
import { GeometryUtils } from '../utils/GeometryUtils';
import { MathUtils } from '../utils/MathUtils';

interface VehicleRendererProps {
  vehicles: VehicleElement[];
  timeline: TimelineEvent[];
  currentTime: number;
  showTrajectories?: boolean;
  showVehicleLabels?: boolean;
  playbackSpeed?: number;
  visible?: boolean;
  onVehicleClick?: (vehicleId: string) => void;
}

interface VehicleProps {
  vehicle: VehicleElement;
  currentTime: number;
  showTrajectory: boolean;
  showLabel: boolean;
  onClick?: () => void;
}

interface TrajectoryProps {
  points: THREE.Vector3[];
  color?: number;
  opacity?: number;
  currentProgress?: number;
}

interface VehicleLabelProps {
  vehicleId: string;
  position: THREE.Vector3;
  visible: boolean;
}

/**
 * Individual vehicle component
 */
function Vehicle({ vehicle, currentTime, showTrajectory, showLabel, onClick }: VehicleProps) {
  const vehicleGroupRef = useRef<THREE.Group>(null);
  const vehicleMeshRef = useRef<THREE.Mesh>(null);
  
  // Vehicle geometry based on type
  const vehicleGeometry = useMemo(() => {
    const dimensions = getVehicleDimensions(vehicle.type);
    return GeometryUtils.createVehicleGeometry(
      dimensions.length,
      dimensions.width,
      dimensions.height
    );
  }, [vehicle.type]);
  
  // Vehicle material with color based on type
  const vehicleMaterial = useMemo(() => {
    const color = getVehicleColor(vehicle.type);
    return new THREE.MeshLambertMaterial({
      color,
      transparent: true,
      opacity: 0.9
    });
  }, [vehicle.type]);
  
  // Calculate current position and rotation based on timeline
  const currentTransform = useMemo(() => {
    return calculateVehicleTransformAtTime(vehicle, currentTime);
  }, [vehicle, currentTime]);
  
  // Trajectory geometry
  const trajectoryGeometry = useMemo(() => {
    if (!showTrajectory || !vehicle.trajectory || vehicle.trajectory.length < 2) {
      return null;
    }
    
    return GeometryUtils.createTrajectoryGeometry(vehicle.trajectory, 0.05);
  }, [vehicle.trajectory, showTrajectory]);
  
  const trajectoryMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.6
    });
  }, []);
  
  // Update vehicle position and rotation
  useFrame(() => {
    if (vehicleGroupRef.current) {
      vehicleGroupRef.current.position.copy(currentTransform.position);
      vehicleGroupRef.current.rotation.copy(currentTransform.rotation);
    }
  });
  
  // Add hover effect
  const [hovered, setHovered] = React.useState(false);
  
  useFrame(() => {
    if (vehicleMeshRef.current) {
      vehicleMeshRef.current.material.opacity = hovered ? 1.0 : 0.9;
    }
  });
  
  // Cleanup
  useEffect(() => {
    return () => {
      vehicleGeometry.dispose();
      vehicleMaterial.dispose();
      trajectoryGeometry?.dispose();
      trajectoryMaterial.dispose();
    };
  }, [vehicleGeometry, vehicleMaterial, trajectoryGeometry, trajectoryMaterial]);
  
  return (
    <group ref={vehicleGroupRef} name={`vehicle-${vehicle.id}`}>
      {/* Vehicle mesh */}
      <mesh
        ref={vehicleMeshRef}
        geometry={vehicleGeometry}
        material={vehicleMaterial}
        castShadow
        receiveShadow
        onClick={onClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      />
      
      {/* Trajectory path */}
      {trajectoryGeometry && (
        <Trajectory
          points={vehicle.trajectory || []}
          color={0x00ff00}
          opacity={0.6}
          currentProgress={calculateTrajectoryProgress(vehicle, currentTime)}
        />
      )}
      
      {/* Vehicle label */}
      {showLabel && (
        <VehicleLabel
          vehicleId={vehicle.id}
          position={currentTransform.position.clone().add(new THREE.Vector3(0, 0, 2))}
          visible={true}
        />
      )}
      
      {/* Direction indicator */}
      <DirectionIndicator rotation={currentTransform.rotation} />
    </group>
  );
}

/**
 * Trajectory path component
 */
function Trajectory({ points, color = 0x00ff00, opacity = 0.6, currentProgress = 0 }: TrajectoryProps) {
  const trajectoryRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef<THREE.Mesh>(null);
  
  const trajectoryGeometry = useMemo(() => {
    if (points.length < 2) return null;
    return GeometryUtils.createTrajectoryGeometry(points, 0.05);
  }, [points]);
  
  const trajectoryMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: opacity * 0.5
    });
  }, [color, opacity]);
  
  // Progress indicator geometry
  const progressGeometry = useMemo(() => {
    if (points.length < 2 || currentProgress <= 0) return null;
    
    const progressIndex = Math.floor(currentProgress * (points.length - 1));
    const progressPoints = points.slice(0, Math.max(1, progressIndex + 1));
    
    return GeometryUtils.createTrajectoryGeometry(progressPoints, 0.08);
  }, [points, currentProgress]);
  
  const progressMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity
    });
  }, [opacity]);
  
  if (!trajectoryGeometry) return null;
  
  return (
    <group name="trajectory">
      {/* Full trajectory path */}
      <mesh
        ref={trajectoryRef}
        geometry={trajectoryGeometry}
        material={trajectoryMaterial}
      />
      
      {/* Progress indicator */}
      {progressGeometry && (
        <mesh
          ref={progressRef}
          geometry={progressGeometry}
          material={progressMaterial}
        />
      )}
    </group>
  );
}

/**
 * Vehicle label component
 */
function VehicleLabel({ vehicleId, position, visible }: VehicleLabelProps) {
  const labelRef = useRef<THREE.Sprite>(null);
  
  const labelTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;
    
    canvas.width = 256;
    canvas.height = 64;
    
    // Background
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Text
    context.fillStyle = 'white';
    context.font = '16px Arial';
    context.textAlign = 'center';
    context.fillText(vehicleId, canvas.width / 2, canvas.height / 2 + 6);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
  }, [vehicleId]);
  
  const labelMaterial = useMemo(() => {
    if (!labelTexture) return null;
    
    return new THREE.SpriteMaterial({
      map: labelTexture,
      transparent: true,
      alphaTest: 0.1
    });
  }, [labelTexture]);
  
  useFrame(({ camera }) => {
    if (labelRef.current) {
      // Billboard effect - always face camera
      labelRef.current.lookAt(camera.position);
      labelRef.current.visible = visible;
    }
  });
  
  if (!labelMaterial) return null;
  
  return (
    <sprite
      ref={labelRef}
      material={labelMaterial}
      position={position}
      scale={[2, 0.5, 1]}
    />
  );
}

/**
 * Direction indicator component
 */
function DirectionIndicator({ rotation }: { rotation: THREE.Euler }) {
  const arrowRef = useRef<THREE.Mesh>(null);
  
  const arrowGeometry = useMemo(() => {
    return GeometryUtils.createArrowGeometry(1.5, 0.3, 0.2, 0.05);
  }, []);
  
  const arrowMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8
    });
  }, []);
  
  useFrame(() => {
    if (arrowRef.current) {
      arrowRef.current.rotation.copy(rotation);
      arrowRef.current.position.z = 0.1; // Slightly above vehicle
    }
  });
  
  return (
    <mesh
      ref={arrowRef}
      geometry={arrowGeometry}
      material={arrowMaterial}
    />
  );
}

/**
 * Vehicle type definitions and utilities
 */
function getVehicleDimensions(vehicleType: string): { length: number; width: number; height: number } {
  switch (vehicleType.toLowerCase()) {
    case 'car':
    case 'sedan':
      return { length: 4.5, width: 2.0, height: 1.5 };
    case 'truck':
    case 'lorry':
      return { length: 12.0, width: 2.5, height: 3.5 };
    case 'bus':
      return { length: 12.0, width: 2.5, height: 3.0 };
    case 'motorcycle':
    case 'motorbike':
      return { length: 2.2, width: 0.8, height: 1.3 };
    case 'bicycle':
      return { length: 1.8, width: 0.6, height: 1.2 };
    case 'van':
      return { length: 5.5, width: 2.2, height: 2.5 };
    case 'trailer':
      return { length: 8.0, width: 2.5, height: 2.8 };
    default:
      return { length: 4.5, width: 2.0, height: 1.5 };
  }
}

function getVehicleColor(vehicleType: string): number {
  switch (vehicleType.toLowerCase()) {
    case 'car':
    case 'sedan':
      return 0x4080ff; // Blue
    case 'truck':
    case 'lorry':
      return 0xff8040; // Orange
    case 'bus':
      return 0xffff40; // Yellow
    case 'motorcycle':
    case 'motorbike':
      return 0xff4040; // Red
    case 'bicycle':
      return 0x40ff40; // Green
    case 'van':
      return 0x8040ff; // Purple
    case 'trailer':
      return 0x808080; // Gray
    default:
      return 0x4080ff; // Default blue
  }
}

function calculateVehicleTransformAtTime(
  vehicle: VehicleElement,
  currentTime: number
): { position: THREE.Vector3; rotation: THREE.Euler } {
  // If no trajectory, use static position
  if (!vehicle.trajectory || vehicle.trajectory.length === 0) {
    return {
      position: vehicle.position.clone(),
      rotation: vehicle.rotation.clone()
    };
  }
  
  // Calculate position along trajectory based on time
  const totalTime = 10; // Assume 10 second trajectory for now
  const progress = MathUtils.clamp(currentTime / totalTime, 0, 1);
  const trajectoryIndex = progress * (vehicle.trajectory.length - 1);
  
  let position: THREE.Vector3;
  let rotation: THREE.Euler;
  
  if (trajectoryIndex >= vehicle.trajectory.length - 1) {
    // At end of trajectory
    position = vehicle.trajectory[vehicle.trajectory.length - 1].clone();
    rotation = calculateRotationFromTrajectory(vehicle.trajectory, vehicle.trajectory.length - 2);
  } else {
    // Interpolate between trajectory points
    const currentIndex = Math.floor(trajectoryIndex);
    const nextIndex = Math.min(currentIndex + 1, vehicle.trajectory.length - 1);
    const t = trajectoryIndex - currentIndex;
    
    const currentPoint = vehicle.trajectory[currentIndex];
    const nextPoint = vehicle.trajectory[nextIndex];
    
    position = currentPoint.clone().lerp(nextPoint, t);
    rotation = calculateRotationFromTrajectory(vehicle.trajectory, currentIndex);
  }
  
  return { position, rotation };
}

function calculateRotationFromTrajectory(trajectory: THREE.Vector3[], index: number): THREE.Euler {
  if (index < 0 || index >= trajectory.length - 1) {
    return new THREE.Euler(0, 0, 0);
  }
  
  const current = trajectory[index];
  const next = trajectory[index + 1];
  const direction = next.clone().sub(current).normalize();
  
  const yaw = Math.atan2(direction.y, direction.x);
  
  return new THREE.Euler(0, 0, yaw);
}

function calculateTrajectoryProgress(vehicle: VehicleElement, currentTime: number): number {
  const totalTime = 10; // Assume 10 second trajectory
  return MathUtils.clamp(currentTime / totalTime, 0, 1);
}

/**
 * Vehicle performance monitor
 */
function VehiclePerformanceMonitor({ vehicleCount }: { vehicleCount: number }) {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  
  useFrame(() => {
    frameCount.current++;
    
    if (frameCount.current % 60 === 0) {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime.current;
      const fps = 60 / (deltaTime / 1000);
      
      if (fps < 30 && vehicleCount > 10) {
        console.warn(`Low FPS detected: ${fps.toFixed(1)} with ${vehicleCount} vehicles`);
      }
      
      lastTime.current = currentTime;
    }
  });
  
  return null;
}

/**
 * Main vehicle renderer component
 */
export default function VehicleRenderer({
  vehicles,
  timeline,
  currentTime,
  showTrajectories = true,
  showVehicleLabels = false,
  playbackSpeed = 1.0,
  visible = true,
  onVehicleClick
}: VehicleRendererProps) {
  const vehicleGroupRef = useRef<THREE.Group>(null);
  
  // Filter visible vehicles based on timeline
  const visibleVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      // Check if vehicle should be visible at current time
      return vehicle.timestamp <= currentTime;
    });
  }, [vehicles, currentTime]);
  
  // Level of Detail management based on vehicle count
  const [lodEnabled, setLodEnabled] = React.useState(false);
  
  useEffect(() => {
    setLodEnabled(visibleVehicles.length > 20);
  }, [visibleVehicles.length]);
  
  // Update visibility
  useFrame(() => {
    if (vehicleGroupRef.current) {
      vehicleGroupRef.current.visible = visible;
    }
  });
  
  return (
    <group ref={vehicleGroupRef} name="vehicles">
      {/* Performance monitor */}
      <VehiclePerformanceMonitor vehicleCount={visibleVehicles.length} />
      
      {/* Individual vehicles */}
      {visibleVehicles.map((vehicle) => (
        <Vehicle
          key={vehicle.id}
          vehicle={vehicle}
          currentTime={currentTime}
          showTrajectory={showTrajectories && (!lodEnabled || visibleVehicles.length < 50)}
          showLabel={showVehicleLabels && (!lodEnabled || visibleVehicles.length < 30)}
          onClick={() => onVehicleClick?.(vehicle.id)}
        />
      ))}
      
      {/* Vehicle count display for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <mesh position={[10, 10, 5]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={0xff0000} />
        </mesh>
      )}
    </group>
  );
}

// Export individual components for testing
export { Vehicle, Trajectory, VehicleLabel, DirectionIndicator };