/**
 * Trajectory Interpolation Tests - TDD RED Phase
 * These tests define the expected behavior for trajectory interpolation in scene playback
 * All tests should initially FAIL until we implement the functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';

// Mock Three.js for testing
vi.mock('three', () => ({
  Vector3: class {
    constructor(public x = 0, public y = 0, public z = 0) {}
    clone() { return new this.constructor(this.x, this.y, this.z); }
    lerp(target: any, t: number) { 
      this.x += (target.x - this.x) * t;
      this.y += (target.y - this.y) * t;
      this.z += (target.z - this.z) * t;
      return this;
    }
    sub(v: any) { return new this.constructor(this.x - v.x, this.y - v.y, this.z - v.z); }
    normalize() { 
      const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
      return new this.constructor(this.x / len, this.y / len, this.z / len);
    }
    length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
    distanceTo(v: any) { 
      const dx = this.x - v.x;
      const dy = this.y - v.y;
      const dz = this.z - v.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  },
  Euler: class {
    constructor(public x = 0, public y = 0, public z = 0) {}
  },
  Matrix4: class {
    compose() { return this; }
    setMatrixAt() {}
  },
  Quaternion: class {
    setFromEuler() { return this; }
  }
}));

// Import the trajectory interpolation utilities that we need to implement
import { 
  interpolateTrajectory, 
  calculateVehicleTransformAtTime,
  TrajectoryPoint,
  VehicleTrajectoryData 
} from '../components/visualization/utils/TrajectoryInterpolation';

// Mock vehicle data for testing
const createMockVehicle = (trajectory: TrajectoryPoint[]): VehicleTrajectoryData => ({
  id: 'test-vehicle-1',
  name: 'ego',
  type: 'car',
  trajectory,
  startTime: 0,
  endTime: trajectory.length > 0 ? trajectory[trajectory.length - 1].time : 0,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  timestamp: 0
});

const createStraightLineTrajectory = (): TrajectoryPoint[] => [
  { time: 0, position: new THREE.Vector3(0, 0, 0), velocity: 10 },
  { time: 1, position: new THREE.Vector3(10, 0, 0), velocity: 10 },
  { time: 2, position: new THREE.Vector3(20, 0, 0), velocity: 10 },
  { time: 3, position: new THREE.Vector3(30, 0, 0), velocity: 10 }
];

const createCurvedTrajectory = (): TrajectoryPoint[] => [
  { time: 0, position: new THREE.Vector3(0, 0, 0), velocity: 10 },
  { time: 1, position: new THREE.Vector3(10, 0, 5), velocity: 10 },
  { time: 2, position: new THREE.Vector3(20, 0, 8), velocity: 10 },
  { time: 3, position: new THREE.Vector3(30, 0, 10), velocity: 10 }
];

describe('TrajectoryInterpolation - Core Functionality', () => {
  describe('interpolateTrajectory', () => {
    it('should interpolate position between two trajectory points', () => {
      const trajectory = createStraightLineTrajectory();
      const result = interpolateTrajectory(trajectory, 0.5);
      
      // At time 0.5, should be halfway between point 0 and point 1
      expect(result.position.x).toBeCloseTo(5, 2);
      expect(result.position.y).toBeCloseTo(0, 2);
      expect(result.position.z).toBeCloseTo(0, 2);
    });

    it('should calculate correct rotation based on movement direction', () => {
      const trajectory = createStraightLineTrajectory();
      const result = interpolateTrajectory(trajectory, 0.5);
      
      // Should face forward (positive X direction)
      expect(result.rotation.y).toBeCloseTo(0, 2);
    });

    it('should handle curved trajectories with correct rotation', () => {
      const trajectory = createCurvedTrajectory();
      const result = interpolateTrajectory(trajectory, 1.5);
      
      // Should have non-zero rotation for curved path
      expect(result.rotation.y).not.toBeCloseTo(0, 2);
    });

    it('should return first point when time is before start', () => {
      const trajectory = createStraightLineTrajectory();
      const result = interpolateTrajectory(trajectory, -1);
      
      expect(result.position.x).toBe(0);
      expect(result.position.y).toBe(0);
      expect(result.position.z).toBe(0);
    });

    it('should return last point when time is after end', () => {
      const trajectory = createStraightLineTrajectory();
      const result = interpolateTrajectory(trajectory, 10);
      
      expect(result.position.x).toBe(30);
      expect(result.position.y).toBe(0);
      expect(result.position.z).toBe(0);
    });

    it('should handle empty trajectory gracefully', () => {
      const result = interpolateTrajectory([], 1);
      
      expect(result.position.x).toBe(0);
      expect(result.position.y).toBe(0);
      expect(result.position.z).toBe(0);
    });

    it('should handle single point trajectory', () => {
      const trajectory = [{ time: 1, position: new THREE.Vector3(5, 0, 0), velocity: 0 }];
      const result = interpolateTrajectory(trajectory, 1);
      
      expect(result.position.x).toBe(5);
      expect(result.position.y).toBe(0);
      expect(result.position.z).toBe(0);
    });
  });

  describe('calculateVehicleTransformAtTime', () => {
    it('should return correct transform for vehicle at specific time', () => {
      const vehicle = createMockVehicle(createStraightLineTrajectory());
      const transform = calculateVehicleTransformAtTime(vehicle, 1.5);
      
      // Should be interpolated position at time 1.5
      expect(transform.position.x).toBeCloseTo(15, 2);
      expect(transform.position.y).toBeCloseTo(0, 2);
      expect(transform.position.z).toBeCloseTo(0, 2);
    });

    it('should handle vehicle with no trajectory', () => {
      const vehicle = createMockVehicle([]);
      const transform = calculateVehicleTransformAtTime(vehicle, 1);
      
      // Should return vehicle's static position
      expect(transform.position.x).toBe(0);
      expect(transform.position.y).toBe(0);
      expect(transform.position.z).toBe(0);
    });

    it('should calculate smooth transitions between trajectory points', () => {
      const vehicle = createMockVehicle(createStraightLineTrajectory());
      
      const transform1 = calculateVehicleTransformAtTime(vehicle, 0.25);
      const transform2 = calculateVehicleTransformAtTime(vehicle, 0.75);
      
      // Should show smooth progression
      expect(transform1.position.x).toBeLessThan(transform2.position.x);
      expect(transform2.position.x).toBeLessThan(15); // Should be before midpoint
    });
  });
});

describe('TrajectoryInterpolation - Advanced Features', () => {
  describe('Velocity-based interpolation', () => {
    it('should consider velocity when interpolating position', () => {
      const trajectory: TrajectoryPoint[] = [
        { time: 0, position: new THREE.Vector3(0, 0, 0), velocity: 5 },
        { time: 2, position: new THREE.Vector3(10, 0, 0), velocity: 15 }
      ];
      
      const result = interpolateTrajectory(trajectory, 1);
      
      // With accelerating velocity, position should not be exactly at midpoint
      expect(result.position.x).not.toBeCloseTo(5, 1);
    });

    it('should handle constant velocity correctly', () => {
      const trajectory: TrajectoryPoint[] = [
        { time: 0, position: new THREE.Vector3(0, 0, 0), velocity: 10 },
        { time: 1, position: new THREE.Vector3(10, 0, 0), velocity: 10 }
      ];
      
      const result = interpolateTrajectory(trajectory, 0.5);
      
      // With constant velocity, should be at midpoint
      expect(result.position.x).toBeCloseTo(5, 2);
    });
  });

  describe('Spline interpolation', () => {
    it('should provide smooth curves for complex trajectories', () => {
      const trajectory = createCurvedTrajectory();
      
      const result1 = interpolateTrajectory(trajectory, 0.5);
      const result2 = interpolateTrajectory(trajectory, 1.0);
      const result3 = interpolateTrajectory(trajectory, 1.5);
      
      // Should show smooth curve progression
      expect(result1.position.z).toBeLessThan(result2.position.z);
      expect(result2.position.z).toBeLessThan(result3.position.z);
    });

    it('should maintain continuity in rotation changes', () => {
      const trajectory = createCurvedTrajectory();
      
      const result1 = interpolateTrajectory(trajectory, 1.0);
      const result2 = interpolateTrajectory(trajectory, 1.1);
      
      // Rotation should change smoothly
      const rotationDiff = Math.abs(result2.rotation.y - result1.rotation.y);
      expect(rotationDiff).toBeLessThan(0.5); // Should not have sudden jumps
    });
  });

  describe('Performance optimization', () => {
    it('should efficiently handle large trajectory datasets', () => {
      // Create a large trajectory with 1000 points
      const largeTrajectory: TrajectoryPoint[] = [];
      for (let i = 0; i < 1000; i++) {
        largeTrajectory.push({
          time: i * 0.1,
          position: new THREE.Vector3(i * 0.5, 0, Math.sin(i * 0.1) * 5),
          velocity: 5
        });
      }
      
      const startTime = performance.now();
      const result = interpolateTrajectory(largeTrajectory, 50);
      const endTime = performance.now();
      
      // Should complete within reasonable time (< 10ms)
      expect(endTime - startTime).toBeLessThan(10);
      expect(result.position.x).toBeCloseTo(250, 1);
    });

    it('should cache interpolation results for repeated queries', () => {
      const trajectory = createStraightLineTrajectory();
      
      // First call
      const start1 = performance.now();
      interpolateTrajectory(trajectory, 1.5);
      const end1 = performance.now();
      
      // Second call with same parameters
      const start2 = performance.now();
      interpolateTrajectory(trajectory, 1.5);
      const end2 = performance.now();
      
      // Second call should be faster (cached)
      expect(end2 - start2).toBeLessThanOrEqual(end1 - start1);
    });
  });
});

describe('TrajectoryInterpolation - Integration with Timeline', () => {
  it('should synchronize vehicle visibility with timeline events', () => {
    const vehicle = createMockVehicle(createStraightLineTrajectory());
    vehicle.startTime = 1;
    vehicle.endTime = 3;
    
    // Before start time
    const transform1 = calculateVehicleTransformAtTime(vehicle, 0.5);
    expect(transform1.visible).toBe(false);
    
    // During active time
    const transform2 = calculateVehicleTransformAtTime(vehicle, 2);
    expect(transform2.visible).toBe(true);
    
    // After end time
    const transform3 = calculateVehicleTransformAtTime(vehicle, 4);
    expect(transform3.visible).toBe(false);
  });

  it('should handle timeline events that affect trajectory', () => {
    const vehicle = createMockVehicle(createStraightLineTrajectory());
    
    // Mock lane change event at time 1.5
    const laneChangeEvent = {
      time: 1.5,
      type: 'lane_change',
      parameters: { targetLane: 1, duration: 0.5 }
    };
    
    vehicle.events = [laneChangeEvent];
    
    const transform = calculateVehicleTransformAtTime(vehicle, 1.75);
    
    // Should show lane change in progress
    expect(transform.position.y).not.toBe(0);
  });

  it('should provide progress indicators for trajectory visualization', () => {
    const trajectory = createStraightLineTrajectory();
    const vehicle = createMockVehicle(trajectory);
    
    const transform = calculateVehicleTransformAtTime(vehicle, 1.5);
    
    // Should include progress information
    expect(transform.progress).toBeCloseTo(0.5, 2); // 50% through trajectory
    expect(transform.remainingDistance).toBeGreaterThan(0);
  });
});

describe('TrajectoryInterpolation - Error Handling', () => {
  it('should handle corrupted trajectory data gracefully', () => {
    const corruptedTrajectory = [
      { time: 0, position: new THREE.Vector3(0, 0, 0), velocity: 10 },
      { time: NaN, position: new THREE.Vector3(10, 0, 0), velocity: 10 },
      { time: 2, position: new THREE.Vector3(20, 0, 0), velocity: 10 }
    ];
    
    expect(() => {
      interpolateTrajectory(corruptedTrajectory, 1);
    }).not.toThrow();
  });

  it('should handle missing velocity data', () => {
    const trajectory = [
      { time: 0, position: new THREE.Vector3(0, 0, 0) },
      { time: 1, position: new THREE.Vector3(10, 0, 0) }
    ];
    
    const result = interpolateTrajectory(trajectory, 0.5);
    
    expect(result.position.x).toBeCloseTo(5, 2);
  });

  it('should handle out-of-order trajectory points', () => {
    const unorderedTrajectory = [
      { time: 2, position: new THREE.Vector3(20, 0, 0), velocity: 10 },
      { time: 0, position: new THREE.Vector3(0, 0, 0), velocity: 10 },
      { time: 1, position: new THREE.Vector3(10, 0, 0), velocity: 10 }
    ];
    
    const result = interpolateTrajectory(unorderedTrajectory, 1);
    
    // Should handle reordering internally
    expect(result.position.x).toBeCloseTo(10, 2);
  });
});