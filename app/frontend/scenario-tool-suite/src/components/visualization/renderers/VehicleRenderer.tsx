/**
 * Vehicle Renderer - Creates 3D visualization of vehicles and their trajectories
 * Handles vehicle animations, trajectory paths, and dynamic positioning using InstancedMesh for performance.
 */
import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VehicleElement, TimelineEvent } from '../types/VisualizationTypes';
import { GeometryUtils } from '../utils/GeometryUtils';
import { MeshLineUtils } from '../utils/MeshLineUtils';
import { MaterialUtils, MaterialPresets } from '../utils/MaterialUtils';
import { 
  calculateVehicleTransformAtTime, 
  VehicleTrajectoryData, 
  TrajectoryPoint 
} from '../utils/TrajectoryInterpolation';

// Helper function to convert VehicleElement to VehicleTrajectoryData
function convertToTrajectoryData(vehicle: VehicleElement): VehicleTrajectoryData {
  // Convert trajectory points if they exist
  // Handle both Vector3[] and trajectory objects with position/timestamp
  const trajectory: TrajectoryPoint[] = vehicle.trajectory?.map((point, index) => {
    // Check if point is a trajectory object with position and timestamp
    if (typeof point === 'object' && 'position' in point && 'timestamp' in point) {
      const trajectoryPoint = point as any;
      return {
        time: trajectoryPoint.timestamp || index * 0.1,
        position: trajectoryPoint.position instanceof THREE.Vector3 ? 
          trajectoryPoint.position : 
          new THREE.Vector3(trajectoryPoint.position.x, trajectoryPoint.position.y, trajectoryPoint.position.z),
        velocity: trajectoryPoint.speed || vehicle.speed || 10
      };
    }
    // Handle simple Vector3 points
    else if (point instanceof THREE.Vector3) {
      return {
        time: index * 0.1,
        position: point,
        velocity: vehicle.speed || 10
      };
    }
    // Handle plain objects with x, y, z coordinates
     else if (typeof point === 'object' && point !== null && 'x' in point && 'y' in point && 'z' in point) {
       const coordPoint = point as { x: number; y: number; z: number };
       return {
         time: index * 0.1,
         position: new THREE.Vector3(coordPoint.x, coordPoint.y, coordPoint.z),
         velocity: vehicle.speed || 10
       };
     }
    // Fallback
    else {
      return {
        time: index * 0.1,
        position: new THREE.Vector3(0, 0, 0),
        velocity: vehicle.speed || 10
      };
    }
  }) || [];

  return {
    id: vehicle.id,
    name: vehicle.id, // Use ID as name since VehicleElement doesn't have name
    type: vehicle.type || 'car',
    trajectory,
    startTime: 0, // Default start time
    endTime: vehicle.timestamp || Math.max(trajectory.length * 0.1, 1), // Use timestamp or calculated end time
    position: { x: vehicle.position.x, y: vehicle.position.y, z: vehicle.position.z },
    rotation: { x: vehicle.rotation.x, y: vehicle.rotation.y, z: vehicle.rotation.z },
    timestamp: vehicle.timestamp || 0
  };
}


// Performance monitor component
function VehiclePerformanceMonitor({ vehicleCount }: { vehicleCount: number }) {
  // Use the parameter to avoid unused variable warning
  console.log(`Rendering ${vehicleCount} vehicles`);
  return null; // Placeholder for performance monitoring
}

interface VehicleRendererProps {
  vehicles: VehicleElement[];
  timeline: TimelineEvent[];
  currentTime: number;
  showTrajectories?: boolean;
  showVehicleLabels?: boolean;
  playbackSpeed?: number;
  visible?: boolean;
  performanceMode?: boolean;
  onVehicleClick?: (vehicleId: string) => void;
}

/**
 * Main vehicle renderer component using InstancedMesh
 */
export default function VehicleRenderer({
  vehicles,
  currentTime,
  showTrajectories = true,
  showVehicleLabels = false,
  visible = true,
  performanceMode = false,
}: VehicleRendererProps) {
  const egoInstancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const otherInstancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const vehicleGroupRef = useRef<THREE.Group>(null);

  // Use fallback geometry directly for now to avoid GLB loading issues
  const vehicleGeometry = useMemo(() => {
    console.log('Using fallback box geometry for vehicles due to GLB loading issues');
    return new THREE.BoxGeometry(4.5, 2.0, 1.5);
  }, []);

  // Create materials for different vehicle types
  const vehicleMaterials = useMemo(() => {
    const egoMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00, // 鲜艳绿色表示自车
      metalness: 0.1, // 降低金属感，增加颜色鲜艳度
      roughness: 0.3, // 降低粗糙度，增加光泽
      emissive: 0x002200, // 添加自发光效果
      emissiveIntensity: 0.3,
      transparent: false,
      side: THREE.FrontSide
    });
    
    const otherMaterial = new THREE.MeshStandardMaterial({
      color: 0x0066ff, // 鲜艳蓝色表示其他车辆
      metalness: 0.1, // 降低金属感，增加颜色鲜艳度
      roughness: 0.3, // 降低粗糙度，增加光泽
      emissive: 0x000022, // 添加自发光效果
      emissiveIntensity: 0.3,
      transparent: false,
      side: THREE.FrontSide
    });
    
    return { ego: egoMaterial, other: otherMaterial };
  }, []);

  // Helper function to get vehicle color based on isEgo flag
  const getVehicleColor = (vehicle: VehicleElement): number => {
    return vehicle.isEgo ? 0x00ff00 : 0x0066ff;
  };

  // Convert vehicles to trajectory data for interpolation
  const vehicleTrajectoryData = useMemo(() => {
    return vehicles.map(convertToTrajectoryData);
  }, [vehicles]);

  // Filter and separate visible vehicles into ego and other vehicles
  const { egoVehicles, otherVehicles } = useMemo(() => {
    const allVisible = vehicleTrajectoryData.filter(vehicle => {
      const transform = calculateVehicleTransformAtTime(vehicle, currentTime);
      return transform.visible;
    });
    
    console.log('All visible vehicles:', allVisible.map(v => v.id));
    console.log('Original vehicles with isEgo:', vehicles.map(v => ({ id: v.id, isEgo: v.isEgo })));
    
    // Find corresponding original vehicle data to check isEgo flag
    const egoVehicles = allVisible.filter(vehicle => {
      const originalVehicle = vehicles.find(v => v.id === vehicle.id);
      const isEgo = originalVehicle?.isEgo === true;
      console.log(`Vehicle ${vehicle.id}: isEgo=${isEgo}`);
      return isEgo;
    });
    
    const otherVehicles = allVisible.filter(vehicle => {
      const originalVehicle = vehicles.find(v => v.id === vehicle.id);
      return originalVehicle?.isEgo !== true;
    });
    
    console.log('Ego vehicles:', egoVehicles.map(v => v.id));
    console.log('Other vehicles:', otherVehicles.map(v => v.id));
    
    return { egoVehicles, otherVehicles };
  }, [vehicleTrajectoryData, currentTime, vehicles]);

  // Update instance matrices each frame using trajectory interpolation
  useFrame(() => {
    if (!visible) {
      return;
    }

    // Update ego vehicles
    if (egoInstancedMeshRef.current) {
      egoVehicles.forEach((vehicle, i) => {
        const transform = calculateVehicleTransformAtTime(vehicle, currentTime);
        const matrix = new THREE.Matrix4();
        const position = transform.position;
        const rotation = transform.rotation;
        const scale = new THREE.Vector3(1, 1, 1);

        matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
        egoInstancedMeshRef.current!.setMatrixAt(i, matrix);
      });

      egoInstancedMeshRef.current.instanceMatrix.needsUpdate = true;
      egoInstancedMeshRef.current.count = egoVehicles.length;
    }

    // Update other vehicles
    if (otherInstancedMeshRef.current) {
      otherVehicles.forEach((vehicle, i) => {
        const transform = calculateVehicleTransformAtTime(vehicle, currentTime);
        const matrix = new THREE.Matrix4();
        const position = transform.position;
        const rotation = transform.rotation;
        const scale = new THREE.Vector3(1, 1, 1);

        matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
        otherInstancedMeshRef.current!.setMatrixAt(i, matrix);
      });

      otherInstancedMeshRef.current.instanceMatrix.needsUpdate = true;
      otherInstancedMeshRef.current.count = otherVehicles.length;
    }
    
    if (vehicleGroupRef.current) {
      vehicleGroupRef.current.visible = visible;
    }
  });
  
  // Cleanup
  useEffect(() => {
    return () => {
      vehicleGeometry.dispose();
      vehicleMaterials.ego.dispose();
      vehicleMaterials.other.dispose();
    };
  }, [vehicleGeometry, vehicleMaterials]);

  return (
    <group ref={vehicleGroupRef} name="vehicles">
      {/* Performance monitor */}
      <VehiclePerformanceMonitor vehicleCount={egoVehicles.length + otherVehicles.length} />

      {/* Ego vehicles (green) */}
      <instancedMesh
        ref={egoInstancedMeshRef}
        args={[vehicleGeometry, vehicleMaterials.ego, Math.max(egoVehicles.length, 1)]}
        castShadow
        receiveShadow
      />

      {/* Other vehicles (blue) */}
      <instancedMesh
        ref={otherInstancedMeshRef}
        args={[vehicleGeometry, vehicleMaterials.other, Math.max(otherVehicles.length, 1)]}
        castShadow
        receiveShadow
      />

      {/* Trajectories and labels are still rendered individually */}
      {[...egoVehicles, ...otherVehicles].map((vehicle) => {
        const transform = calculateVehicleTransformAtTime(vehicle, currentTime);
        const originalVehicle = vehicles.find(v => v.id === vehicle.id);
        const isEgo = originalVehicle?.isEgo === true;
        return (
          <React.Fragment key={vehicle.id}>
            {showTrajectories && !performanceMode && (
              <Trajectory
                points={vehicle.trajectory.map(p => p.position)}
                color={isEgo ? 0x00ff00 : 0x0066ff} // 自车轨迹绿色，其他车辆蓝色
                opacity={0.6}
                currentProgress={transform.progress}
              />
            )}
            {showVehicleLabels && !performanceMode && (
              <VehicleLabel
                vehicleId={vehicle.id}
                position={transform.position.clone().add(new THREE.Vector3(0, 0, 2))}
                visible={transform.visible}
              />
            )}
          </React.Fragment>
        );
      })}
    </group>
  );
}

// --- Helper components and functions (mostly unchanged) ---

interface TrajectoryProps {
  points: THREE.Vector3[];
  color?: number;
  opacity?: number;
  currentProgress?: number;
}

function Trajectory({ points, color = 0x00ff00, opacity = 0.6, currentProgress = 0 }: TrajectoryProps) {
  // ... (Implementation remains the same as before)
  const trajectoryRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef<THREE.Mesh>(null);
  
  // Enhanced trajectory using MeshLine for smoother rendering
  const { trajectoryGeometry, trajectoryMaterial } = useMemo(() => {
    if (points.length < 2) return { trajectoryGeometry: null, trajectoryMaterial: null };
    
    const geometry = MeshLineUtils.createTrajectoryMeshLine(points, 0.1);
    
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      opacity: opacity * 0.7,
      transparent: true
    });
    
    return { trajectoryGeometry: geometry, trajectoryMaterial: material };
  }, [points, color, opacity]);
  
  // Enhanced progress indicator using MeshLine
  const { progressGeometry, progressMaterial } = useMemo(() => {
    if (points.length < 2 || currentProgress <= 0) {
      return { progressGeometry: null, progressMaterial: null };
    }
    
    const progressIndex = Math.floor(currentProgress * (points.length - 1));
    const progressPoints = points.slice(0, Math.max(1, progressIndex + 1));
    
    const geometry = MeshLineUtils.createProgressMeshLine(progressPoints, currentProgress, 0.15);
    
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xffff00),
      opacity: opacity,
      transparent: true
    });
    
    return { progressGeometry: geometry, progressMaterial: material };
  }, [points, currentProgress, opacity]);
  
  // Fallback to basic geometry if MeshLine fails
  const fallbackTrajectoryGeometry = useMemo(() => {
    if (trajectoryGeometry || points.length < 2) return null;
    return GeometryUtils.createTrajectoryGeometry(points, 0.05);
  }, [points, trajectoryGeometry]);
  
  const fallbackTrajectoryMaterial = useMemo(() => {
    if (trajectoryMaterial) return null;
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: opacity * 0.5
    });
  }, [color, opacity, trajectoryMaterial]);
  
  if (!trajectoryGeometry && !fallbackTrajectoryGeometry) return null;
  
  return (
    <group name="trajectory">
      {trajectoryGeometry && trajectoryMaterial && (
        <mesh
          ref={trajectoryRef}
          geometry={trajectoryGeometry}
          material={trajectoryMaterial}
        />
      )}
      {!trajectoryGeometry && fallbackTrajectoryGeometry && fallbackTrajectoryMaterial && (
        <mesh
          ref={trajectoryRef}
          geometry={fallbackTrajectoryGeometry}
          material={fallbackTrajectoryMaterial}
        />
      )}
      {progressGeometry && progressMaterial && (
        <mesh
          ref={progressRef}
          geometry={progressGeometry}
          material={progressMaterial}
        />
      )}
    </group>
  );
}

interface VehicleLabelProps {
  vehicleId: string;
  position: THREE.Vector3;
  visible: boolean;
}

function VehicleLabel({ vehicleId, position, visible }: VehicleLabelProps) {
  // ... (Implementation remains the same as before)
  const labelRef = useRef<THREE.Sprite>(null);
  
  const labelTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;
    
    canvas.width = 256;
    canvas.height = 64;
    
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
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


