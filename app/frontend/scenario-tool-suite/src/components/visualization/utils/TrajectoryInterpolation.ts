/**
 * Trajectory Interpolation Utilities
 * Implements smooth vehicle movement along predefined trajectories
 * Used for scene playback functionality
 */

import * as THREE from 'three';

export interface TrajectoryPoint {
  time: number;
  position: THREE.Vector3;
  velocity?: number;
}

export interface VehicleTrajectoryData {
  id: string;
  name: string;
  type: string;
  trajectory: TrajectoryPoint[];
  startTime: number;
  endTime: number;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  timestamp: number;
  events?: Array<{
    time: number;
    type: string;
    parameters: any;
  }>;
}

export interface VehicleTransform {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  visible: boolean;
  progress: number;
  remainingDistance: number;
}

// Cache for interpolation results to improve performance
const interpolationCache = new Map<string, VehicleTransform>();

/**
 * Interpolates vehicle position and rotation along a trajectory at a specific time
 * Implements linear interpolation with velocity consideration
 */
export function interpolateTrajectory(
  trajectory: TrajectoryPoint[],
  currentTime: number
): { position: THREE.Vector3; rotation: THREE.Euler } {
  // Handle empty or invalid trajectory
  if (!trajectory || trajectory.length === 0) {
    return {
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0)
    };
  }

  // Handle single point trajectory
  if (trajectory.length === 1) {
    return {
      position: trajectory[0].position.clone(),
      rotation: new THREE.Euler(0, 0, 0)
    };
  }

  // Sort trajectory by time to handle out-of-order points
  const sortedTrajectory = [...trajectory].sort((a, b) => a.time - b.time);

  // Handle time before start
  if (currentTime <= sortedTrajectory[0].time) {
    return {
      position: sortedTrajectory[0].position.clone(),
      rotation: new THREE.Euler(0, 0, 0)
    };
  }

  // Handle time after end
  if (currentTime >= sortedTrajectory[sortedTrajectory.length - 1].time) {
    const lastPoint = sortedTrajectory[sortedTrajectory.length - 1];
    return {
      position: lastPoint.position.clone(),
      rotation: new THREE.Euler(0, 0, 0)
    };
  }

  // Find the two points to interpolate between
  let nextIndex = sortedTrajectory.findIndex(p => p.time > currentTime);
  if (nextIndex === -1) nextIndex = sortedTrajectory.length - 1;
  if (nextIndex === 0) nextIndex = 1;

  const prev = sortedTrajectory[nextIndex - 1];
  const next = sortedTrajectory[nextIndex];

  // Handle NaN or invalid time values
  if (isNaN(prev.time) || isNaN(next.time)) {
    return {
      position: prev.position.clone(),
      rotation: new THREE.Euler(0, 0, 0)
    };
  }

  // Calculate interpolation factor
  const t = (currentTime - prev.time) / (next.time - prev.time);

  // Consider velocity in interpolation if available
  let position: THREE.Vector3;
  
  if (prev.velocity !== undefined && next.velocity !== undefined) {
    // Velocity-based interpolation (simple physics-based approach)
    const avgVelocity = (prev.velocity + next.velocity) / 2;
    const distance = prev.position.distanceTo(next.position);
    const expectedDistance = avgVelocity * (next.time - prev.time);
    
    // If velocity suggests different distance, adjust interpolation
    if (Math.abs(distance - expectedDistance) > 0.1) {
      const velocityFactor = expectedDistance / distance;
      const adjustedT = t * velocityFactor;
      position = prev.position.clone().lerp(next.position, Math.max(0, Math.min(1, adjustedT)));
    } else {
      position = prev.position.clone().lerp(next.position, t);
    }
  } else {
    // Linear interpolation of position
    position = prev.position.clone().lerp(next.position, t);
  }

  // Calculate rotation based on movement direction
  const direction = next.position.clone().sub(prev.position).normalize();
  // For forward movement in positive X direction, rotation should be 0
  const rotation = new THREE.Euler(0, Math.atan2(direction.z, direction.x), 0);

  return { position, rotation };
}

/**
 * Calculates the complete transform for a vehicle at a specific time
 * Includes position, rotation, visibility, and progress information
 */
export function calculateVehicleTransformAtTime(
  vehicle: VehicleTrajectoryData,
  currentTime: number
): VehicleTransform {
  // Check cache first
  const cacheKey = `${vehicle.id}_${currentTime}`;
  if (interpolationCache.has(cacheKey)) {
    return interpolationCache.get(cacheKey)!;
  }

  // Check if vehicle should be visible based on timeline
  const visible = currentTime >= vehicle.startTime && currentTime <= vehicle.endTime;

  // If vehicle has no trajectory, return static position
  if (!vehicle.trajectory || vehicle.trajectory.length === 0) {
    const transform: VehicleTransform = {
      position: new THREE.Vector3(vehicle.position.x, vehicle.position.y, vehicle.position.z),
      rotation: new THREE.Euler(vehicle.rotation.x, vehicle.rotation.y, vehicle.rotation.z),
      visible,
      progress: 0,
      remainingDistance: 0
    };
    
    interpolationCache.set(cacheKey, transform);
    return transform;
  }

  // Get interpolated position and rotation
  const interpolated = interpolateTrajectory(vehicle.trajectory, currentTime);

  // Calculate progress through trajectory
  const totalTime = vehicle.endTime - vehicle.startTime;
  const progress = totalTime > 0 ? Math.max(0, Math.min(1, (currentTime - vehicle.startTime) / totalTime)) : 0;

  // Calculate remaining distance (simplified)
  const remainingDistance = vehicle.trajectory.length > 0 ? 
    (1 - progress) * vehicle.trajectory[vehicle.trajectory.length - 1].position.clone().sub(vehicle.trajectory[0].position).length() : 0;

  // Handle timeline events that affect trajectory
  let adjustedPosition = interpolated.position;
  let adjustedRotation = interpolated.rotation;

  if (vehicle.events) {
    for (const event of vehicle.events) {
      if (event.time <= currentTime && currentTime <= event.time + (event.parameters.duration || 0)) {
        // Apply event effects (e.g., lane change)
        if (event.type === 'lane_change') {
          const laneOffset = event.parameters.targetLane * 3.5; // 3.5m lane width
          const eventProgress = (currentTime - event.time) / (event.parameters.duration || 1);
          adjustedPosition = adjustedPosition.clone();
          adjustedPosition.y += laneOffset * eventProgress;
        }
      }
    }
  }

  const transform: VehicleTransform = {
    position: adjustedPosition,
    rotation: adjustedRotation,
    visible,
    progress,
    remainingDistance
  };

  // Cache the result
  interpolationCache.set(cacheKey, transform);
  
  return transform;
}

/**
 * Clears the interpolation cache to free memory
 */
export function clearInterpolationCache(): void {
  interpolationCache.clear();
}

/**
 * Creates a smooth spline interpolation for complex trajectories
 * More advanced than linear interpolation for curved paths
 */
export function createSplineInterpolation(
  trajectory: TrajectoryPoint[]
): (time: number) => { position: THREE.Vector3; rotation: THREE.Euler } {
  if (trajectory.length < 2) {
    return (time: number) => ({
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0)
    });
  }

  // Create spline curve from trajectory points
  const points = trajectory.map(p => p.position);
  const curve = new THREE.CatmullRomCurve3(points);

  return (time: number) => {
    const startTime = trajectory[0].time;
    const endTime = trajectory[trajectory.length - 1].time;
    
    if (time <= startTime) {
      return {
        position: trajectory[0].position.clone(),
        rotation: new THREE.Euler(0, 0, 0)
      };
    }
    
    if (time >= endTime) {
      return {
        position: trajectory[trajectory.length - 1].position.clone(),
        rotation: new THREE.Euler(0, 0, 0)
      };
    }

    // Map time to curve parameter (0 to 1)
    const t = (time - startTime) / (endTime - startTime);
    
    // Get position from spline
    const position = curve.getPoint(t);
    
    // Get tangent for rotation
    const tangent = curve.getTangent(t).normalize();
    const rotation = new THREE.Euler(0, Math.atan2(tangent.x, tangent.z), 0);

    return { position, rotation };
  };
}