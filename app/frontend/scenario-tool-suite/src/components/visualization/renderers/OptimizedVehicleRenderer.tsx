/**
 * Optimized Vehicle Renderer with Level of Detail (LOD) and instancing
 * Uses performance optimizations for large numbers of vehicles
 */

import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instance } from '@react-three/drei';
import * as THREE from 'three';
import { VehicleElement, TimelineEvent } from '../types/VisualizationTypes';

interface OptimizedVehicleRendererProps {
  vehicles: VehicleElement[];
  timeline: TimelineEvent[];
  currentTime: number;
  showTrajectories?: boolean;
  showVehicleLabels?: boolean;
  playbackSpeed?: number;
  visible?: boolean;
  onVehicleClick?: (vehicleId: string) => void;
}

interface VehicleInstanceProps {
  vehicle: VehicleElement;
  currentTime: number;
  showTrajectory: boolean;
  lodLevel: 'high' | 'medium' | 'low';
  onClick?: () => void;
}

/**
 * High detail vehicle component
 */
function HighDetailVehicle({ vehicle, currentTime, onClick }: { 
  vehicle: VehicleElement; 
  currentTime: number; 
  onClick?: () => void;
}) {
  const currentTransform = useMemo(() => {
    return calculateVehicleTransformAtTime(vehicle, currentTime);
  }, [vehicle, currentTime]);

  const dimensions = getVehicleDimensions(vehicle.type);
  const color = getVehicleColor(vehicle.type, vehicle.isEgo);
  
  return (
    <group position={currentTransform.position} rotation={currentTransform.rotation}>
      {/* Detailed vehicle body */}
      <mesh onClick={onClick} castShadow receiveShadow>
        <boxGeometry args={[dimensions.length, dimensions.width, dimensions.height]} />
        <meshLambertMaterial color={color} />
      </mesh>
      
      {/* Wheels */}
      <group name="wheels">
        {/* Front wheels */}
        <mesh position={[dimensions.length * 0.3, dimensions.width * 0.4, -dimensions.height * 0.3]}>
          <cylinderGeometry args={[0.3, 0.3, 0.2]} />
          <meshLambertMaterial color={0x222222} />
        </mesh>
        <mesh position={[dimensions.length * 0.3, -dimensions.width * 0.4, -dimensions.height * 0.3]}>
          <cylinderGeometry args={[0.3, 0.3, 0.2]} />
          <meshLambertMaterial color={0x222222} />
        </mesh>
        
        {/* Rear wheels */}
        <mesh position={[-dimensions.length * 0.3, dimensions.width * 0.4, -dimensions.height * 0.3]}>
          <cylinderGeometry args={[0.3, 0.3, 0.2]} />
          <meshLambertMaterial color={0x222222} />
        </mesh>
        <mesh position={[-dimensions.length * 0.3, -dimensions.width * 0.4, -dimensions.height * 0.3]}>
          <cylinderGeometry args={[0.3, 0.3, 0.2]} />
          <meshLambertMaterial color={0x222222} />
        </mesh>
      </group>
      
      {/* Windows */}
      <mesh position={[0, 0, dimensions.height * 0.3]}>
        <boxGeometry args={[dimensions.length * 0.8, dimensions.width * 0.9, dimensions.height * 0.3]} />
        <meshLambertMaterial color={0x87CEEB} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

/**
 * Medium detail vehicle component
 */
function MediumDetailVehicle({ vehicle, currentTime, onClick }: { 
  vehicle: VehicleElement; 
  currentTime: number; 
  onClick?: () => void;
}) {
  const currentTransform = useMemo(() => {
    return calculateVehicleTransformAtTime(vehicle, currentTime);
  }, [vehicle, currentTime]);

  const dimensions = getVehicleDimensions(vehicle.type);
  const color = getVehicleColor(vehicle.type, vehicle.isEgo);
  
  return (
    <group position={currentTransform.position} rotation={currentTransform.rotation}>
      {/* Simplified vehicle body */}
      <mesh onClick={onClick}>
        <boxGeometry args={[dimensions.length, dimensions.width, dimensions.height]} />
        <meshLambertMaterial color={color} />
      </mesh>
    </group>
  );
}

/**
 * Low detail vehicle component - using instancing for performance
 */
function LowDetailVehicle({ vehicle, currentTime }: { 
  vehicle: VehicleElement; 
  currentTime: number;
}) {
  const currentTransform = useMemo(() => {
    return calculateVehicleTransformAtTime(vehicle, currentTime);
  }, [vehicle, currentTime]);

  return (
    <Instance
      position={currentTransform.position}
      rotation={currentTransform.rotation}
      scale={1}
    />
  );
}

/**
 * Individual vehicle with LOD
 */
function VehicleWithLOD({ vehicle, currentTime, showTrajectory, lodLevel, onClick }: VehicleInstanceProps) {
  const [hovered, setHovered] = useState(false);
  
  // Trajectory component for high/medium LOD
  const trajectoryComponent = useMemo(() => {
    if (!showTrajectory || !vehicle.trajectory || vehicle.trajectory.length < 2 || lodLevel === 'low') {
      return null;
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(vehicle.trajectory);
    
    return (
      <primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.6 }))} />
    );
  }, [vehicle.trajectory, showTrajectory, lodLevel]);

  // Hover effect for high detail only
  const handleClick = () => {
    if (lodLevel === 'high') {
      onClick?.();
    }
  };

  const vehicleComponent = useMemo(() => {
    switch (lodLevel) {
      case 'high':
        return (
          <HighDetailVehicle 
            vehicle={vehicle} 
            currentTime={currentTime} 
            onClick={handleClick}
          />
        );
      case 'medium':
        return (
          <MediumDetailVehicle 
            vehicle={vehicle} 
            currentTime={currentTime} 
            onClick={handleClick}
          />
        );
      case 'low':
        return (
          <LowDetailVehicle 
            vehicle={vehicle} 
            currentTime={currentTime}
          />
        );
    }
  }, [lodLevel, vehicle, currentTime, handleClick]);

  return (
    <group 
      name={`vehicle-${vehicle.id}`}
      onPointerEnter={() => lodLevel === 'high' && setHovered(true)}
      onPointerLeave={() => lodLevel === 'high' && setHovered(false)}
    >
      {vehicleComponent}
      {trajectoryComponent}
      
      {/* Hover effect for high detail */}
      {hovered && lodLevel === 'high' && (
        <mesh position={[0, 0, 3]}>
          <sphereGeometry args={[0.2]} />
          <meshBasicMaterial color={0xffff00} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Instanced vehicles for performance with many objects
 */
function InstancedVehicles({ 
  vehicles, 
  currentTime, 
  lodLevel 
}: { 
  vehicles: VehicleElement[]; 
  currentTime: number;
  lodLevel: 'low' | 'medium' | 'high';
}) {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  
  // Group vehicles by type for instancing
  const vehiclesByType = useMemo(() => {
    const groups: Record<string, VehicleElement[]> = {};
    vehicles.forEach(vehicle => {
      const type = vehicle.type || 'car';
      if (!groups[type]) groups[type] = [];
      groups[type].push(vehicle);
    });
    return groups;
  }, [vehicles]);
  
  // Update instance matrices
  useFrame(() => {
    if (!instancedMeshRef.current) return;
    
    let instanceIndex = 0;
    const matrix = new THREE.Matrix4();
    
    Object.values(vehiclesByType).forEach(typeVehicles => {
      typeVehicles.forEach(vehicle => {
        const transform = calculateVehicleTransformAtTime(vehicle, currentTime);
        
        matrix.compose(
          transform.position,
          new THREE.Quaternion().setFromEuler(transform.rotation),
          new THREE.Vector3(1, 1, 1)
        );
        
        instancedMeshRef.current?.setMatrixAt(instanceIndex, matrix);
        instanceIndex++;
      });
    });
    
    if (instancedMeshRef.current) {
      instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });
  
  const totalVehicles = vehicles.length;
  const dimensions = getVehicleDimensions('car'); // Default dimensions
  
  if (totalVehicles === 0) return null;
  
  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[undefined, undefined, totalVehicles]}
      castShadow
    >
      <boxGeometry args={[dimensions.length, dimensions.width, dimensions.height]} />
      <meshLambertMaterial color={getVehicleColor('car', false)} />
    </instancedMesh>
  );
}

/**
 * Vehicle performance analyzer
 */
function VehiclePerformanceAnalyzer({ 
  vehicleCount, 
  onPerformanceChange 
}: { 
  vehicleCount: number;
  onPerformanceChange: (metrics: { fps: number; recommendedLOD: 'high' | 'medium' | 'low' }) => void;
}) {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const [currentFPS, setCurrentFPS] = useState(60);
  
  useFrame(() => {
    frameCount.current++;
    
    if (frameCount.current % 60 === 0) {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime.current;
      const fps = Math.round(60000 / deltaTime);
      
      setCurrentFPS(fps);
      
      // Recommend LOD based on performance
      let recommendedLOD: 'high' | 'medium' | 'low' = 'high';
      
      if (fps < 30 || vehicleCount > 100) {
        recommendedLOD = 'low';
      } else if (fps < 45 || vehicleCount > 50) {
        recommendedLOD = 'medium';
      }
      
      onPerformanceChange({ fps, recommendedLOD });
      lastTime.current = currentTime;
    }
  });
  
  return null;
}

/**
 * Main optimized vehicle renderer
 */
export default function OptimizedVehicleRenderer({
  vehicles,
  timeline,
  currentTime,
  showTrajectories = true,
  showVehicleLabels = false,
  playbackSpeed = 1.0,
  visible = true,
  onVehicleClick
}: OptimizedVehicleRendererProps) {
  const [lodLevel, setLodLevel] = useState<'high' | 'medium' | 'low'>('high');
  const [useInstancing, setUseInstancing] = useState(false);
  const vehicleGroupRef = useRef<THREE.Group>(null);
  
  // Filter visible vehicles
  const visibleVehicles = useMemo(() => {
    return vehicles.filter(vehicle => vehicle.timestamp <= currentTime);
  }, [vehicles, currentTime]);
  
  // Performance-based LOD adjustment
  const handlePerformanceChange = (metrics: { fps: number; recommendedLOD: 'high' | 'medium' | 'low' }) => {
    setLodLevel(metrics.recommendedLOD);
    setUseInstancing(visibleVehicles.length > 200 || metrics.fps < 25);
  };
  
  // Camera distance-based LOD
  useFrame(({ camera }) => {
    if (!vehicleGroupRef.current) return;
    
    // Calculate average distance to vehicles
    let totalDistance = 0;
    visibleVehicles.forEach(vehicle => {
      totalDistance += camera.position.distanceTo(vehicle.position);
    });
    
    const avgDistance = totalDistance / Math.max(visibleVehicles.length, 1);
    
    // Adjust LOD based on distance
    if (avgDistance > 100 && lodLevel !== 'low') {
      setLodLevel('low');
    } else if (avgDistance > 50 && avgDistance <= 100 && lodLevel !== 'medium') {
      setLodLevel('medium');
    } else if (avgDistance <= 50 && lodLevel !== 'high') {
      setLodLevel('high');
    }
  });
  
  // Update visibility
  useFrame(() => {
    if (vehicleGroupRef.current) {
      vehicleGroupRef.current.visible = visible;
    }
  });
  
  if (visibleVehicles.length === 0) return null;
  
  return (
    <group ref={vehicleGroupRef} name="optimized-vehicles">
      {/* Performance analyzer */}
      <VehiclePerformanceAnalyzer
        vehicleCount={visibleVehicles.length}
        onPerformanceChange={handlePerformanceChange}
      />
      
      {/* Use instancing for very large numbers or low performance */}
      {useInstancing ? (
        <InstancedVehicles
          vehicles={visibleVehicles}
          currentTime={currentTime}
          lodLevel={lodLevel}
        />
      ) : (
        /* Individual vehicles with LOD */
        visibleVehicles.map((vehicle) => (
          <VehicleWithLOD
            key={vehicle.id}
            vehicle={vehicle}
            currentTime={currentTime}
            showTrajectory={showTrajectories}
            lodLevel={lodLevel}
            onClick={() => onVehicleClick?.(vehicle.id)}
          />
        ))
      )}
      
      {/* Debug info - removed textGeometry due to font loading issues */}
      {process.env.NODE_ENV === 'development' && (
        <group position={[0, 0, 10]}>
          {/* Debug info will be shown in console instead */}
          {(() => {
            console.log(`Vehicles: ${visibleVehicles.length}, LOD: ${lodLevel}, Instancing: ${useInstancing}`);
            return null;
          })()}
        </group>
      )}
    </group>
  );
}

// Utility functions (same as before)
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
    default:
      return { length: 4.5, width: 2.0, height: 1.5 };
  }
}

function getVehicleColor(vehicleType: string, isEgo: boolean = false): number {
  // 自车使用特殊颜色（绿色）
  if (isEgo) {
    return 0x00ff00; // 亮绿色表示自车
  }
  
  // 其他车辆根据类型使用不同颜色
  switch (vehicleType.toLowerCase()) {
    case 'car':
    case 'sedan':
      return 0x4080ff; // 蓝色
    case 'truck':
    case 'lorry':
      return 0xff8040; // 橙色
    case 'bus':
      return 0xffff40; // 黄色
    case 'motorcycle':
    case 'motorbike':
      return 0xff4040; // 红色
    default:
      return 0x4080ff; // 默认蓝色
  }
}

function calculateVehicleTransformAtTime(
  vehicle: VehicleElement,
  currentTime: number
): { position: THREE.Vector3; rotation: THREE.Euler; visible: boolean } {
  // If no trajectory, use static position
  if (!vehicle.trajectory || vehicle.trajectory.length === 0) {
    return {
      position: vehicle.position.clone(),
      rotation: vehicle.rotation.clone(),
      visible: true
    };
  }
  
  // Calculate position along trajectory based on time
  const totalTime = 10; // Assume 10 second trajectory
  const progress = THREE.MathUtils.clamp(currentTime / totalTime, 0, 1);
  const trajectoryIndex = progress * (vehicle.trajectory.length - 1);
  
  if (trajectoryIndex >= vehicle.trajectory.length - 1) {
    return {
      position: vehicle.trajectory[vehicle.trajectory.length - 1].clone(),
      rotation: vehicle.rotation.clone(),
      visible: true
    };
  }
  
  // Interpolate between trajectory points
  const currentIndex = Math.floor(trajectoryIndex);
  const nextIndex = Math.min(currentIndex + 1, vehicle.trajectory.length - 1);
  const t = trajectoryIndex - currentIndex;
  
  const currentPoint = vehicle.trajectory[currentIndex];
  const nextPoint = vehicle.trajectory[nextIndex];
  const position = currentPoint.clone().lerp(nextPoint, t);
  
  return { position, rotation: vehicle.rotation.clone(), visible: true };
}