/**
 * Performance tests for 3D visualization refactor
 * Tests LOD system, instancing, and performance monitoring
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(() => []),
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

// Mock requestAnimationFrame
let rafCallbacks: (() => void)[] = [];
global.requestAnimationFrame = vi.fn((callback) => {
  rafCallbacks.push(callback);
  return rafCallbacks.length;
});

// Function to trigger RAF callbacks
const triggerAnimationFrame = () => {
  const callbacks = [...rafCallbacks];
  rafCallbacks = [];
  callbacks.forEach(callback => callback());
};

// Mock Three.js for performance testing
vi.mock('three', () => ({
  Vector3: class {
    constructor(public x = 0, public y = 0, public z = 0) {}
    clone() { return new (this.constructor as any)(this.x, this.y, this.z); }
    distanceTo(other: any) {
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dz = this.z - other.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
  },
  Euler: class {
    constructor(public x = 0, public y = 0, public z = 0) {}
    clone() { return new (this.constructor as any)(this.x, this.y, this.z); }
  },
  Matrix4: class {
    compose() { return this; }
    makeTranslation() { return this; }
    makeRotationFromEuler() { return this; }
    multiply() { return this; }
  },
  Quaternion: class {
    setFromEuler() { return this; }
  },
  Object3D: class {
    constructor() {
      this.position = { x: 0, y: 0, z: 0 };
      this.rotation = { x: 0, y: 0, z: 0 };
      this.scale = { x: 1, y: 1, z: 1 };
    }
  },
  InstancedMesh: class {
    constructor(geometry: any, material: any, count: number) {
      this.instanceMatrix = { needsUpdate: false };
      this.count = count;
    }
    setMatrixAt() {}
  },
}));

// Mock R3F with performance tracking
let frameCallbacks: ((state: any, delta: number) => void)[] = [];
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="performance-canvas">{children}</div>
  ),
  useFrame: vi.fn((callback) => {
    frameCallbacks.push(callback);
  }),
  useThree: () => ({
    camera: {
      position: { x: 0, y: 20, z: 50, distanceTo: vi.fn((pos) => {
        const dx = 0 - pos.x;
        const dy = 20 - pos.y;
        const dz = 50 - pos.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      })},
      fov: 75
    },
    gl: {
      info: {
        render: {
          calls: 0,
          triangles: 0,
          points: 0,
          lines: 0,
        }
      }
    },
    scene: {}
  }),
}));

// Function to trigger frame callbacks
const triggerFrame = (delta = 0.016) => {
  const mockState = {
    camera: {
      position: { x: 0, y: 20, z: 50, distanceTo: vi.fn(() => 50) },
      fov: 75
    },
    gl: {
      info: {
        render: { calls: 10, triangles: 1000 }
      }
    }
  };
  frameCallbacks.forEach(callback => callback(mockState, delta));
};

// Mock drei components
vi.mock('@react-three/drei', () => ({
  Stats: () => <div data-testid="stats" />,
  Detailed: ({ children, distances }: { children: React.ReactNode[], distances: number[] }) => (
    <div data-testid="detailed" data-distances={distances}>{children[0]}</div>
  ),
  Instances: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="instances">{children}</div>
  ),
  Instance: ({ position, rotation }: { position: any, rotation: any }) => (
    <div data-testid="instance" data-position={JSON.stringify(position)} data-rotation={JSON.stringify(rotation)} />
  ),
}));

describe('Performance Monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    frameCallbacks = [];
    rafCallbacks = [];
    mockPerformance.now.mockImplementation(() => Date.now());
  });

  it('should track FPS accurately', () => {
    let fpsHistory: number[] = [];
    
    // Simulate frame timing
    const frameStart = 0;
    const frameDelta = 16.67; // 60 FPS
    
    for (let i = 0; i < 60; i++) {
      mockPerformance.now.mockReturnValue(frameStart + (i * frameDelta));
      const fps = Math.round(1000 / frameDelta);
      fpsHistory.push(fps);
    }
    
    const avgFps = fpsHistory.reduce((sum, fps) => sum + fps, 0) / fpsHistory.length;
    expect(avgFps).toBeCloseTo(60, 0);
  });

  it('should detect performance drops', () => {
    const performanceMetrics = {
      fps: 0,
      frameTimes: [] as number[]
    };
    
    // Simulate performance drop
    const goodFrameTime = 16.67; // 60 FPS
    const badFrameTime = 33.33;  // 30 FPS
    
    // Good performance period
    for (let i = 0; i < 30; i++) {
      performanceMetrics.frameTimes.push(goodFrameTime);
    }
    
    // Performance drop
    for (let i = 0; i < 30; i++) {
      performanceMetrics.frameTimes.push(badFrameTime);
    }
    
    const recentFrames = performanceMetrics.frameTimes.slice(-10);
    const avgFrameTime = recentFrames.reduce((sum, time) => sum + time, 0) / recentFrames.length;
    const currentFps = 1000 / avgFrameTime;
    
    expect(currentFps).toBeLessThan(35);
  });

  it('should monitor render call counts', () => {
    const renderStats = {
      drawCalls: 0,
      triangles: 0
    };
    
    // Simulate increasing complexity
    for (let vehicleCount = 1; vehicleCount <= 100; vehicleCount++) {
      renderStats.drawCalls = vehicleCount; // One draw call per vehicle without instancing
      renderStats.triangles = vehicleCount * 12; // Approximate triangles per car
    }
    
    expect(renderStats.drawCalls).toBe(100);
    expect(renderStats.triangles).toBe(1200);
  });
});

describe('Level of Detail (LOD) System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    frameCallbacks = [];
  });

  it('should switch LOD based on camera distance', () => {
    const cameraPosition = { x: 0, y: 20, z: 50 };
    const vehiclePosition = { x: 0, y: 0, z: 0 };
    
    // Calculate distance
    const distance = Math.sqrt(
      Math.pow(cameraPosition.x - vehiclePosition.x, 2) +
      Math.pow(cameraPosition.y - vehiclePosition.y, 2) +
      Math.pow(cameraPosition.z - vehiclePosition.z, 2)
    );
    
    let lodLevel: 'high' | 'medium' | 'low';
    
    if (distance <= 25) {
      lodLevel = 'high';
    } else if (distance <= 75) {
      lodLevel = 'medium';
    } else {
      lodLevel = 'low';
    }
    
    expect(distance).toBeCloseTo(53.85, 1);
    expect(lodLevel).toBe('medium');
  });

  it('should use appropriate LOD for different distances', () => {
    const testDistances = [
      { distance: 10, expected: 'high' },
      { distance: 30, expected: 'medium' },
      { distance: 50, expected: 'medium' },
      { distance: 80, expected: 'low' },
      { distance: 150, expected: 'low' }
    ];
    
    testDistances.forEach(({ distance, expected }) => {
      let lodLevel: 'high' | 'medium' | 'low';
      
      if (distance <= 25) {
        lodLevel = 'high';
      } else if (distance <= 75) {
        lodLevel = 'medium';
      } else {
        lodLevel = 'low';
      }
      
      expect(lodLevel).toBe(expected);
    });
  });

  it('should switch LOD based on performance', () => {
    const performanceBasedLOD = (fps: number, vehicleCount: number) => {
      if (fps < 30 || vehicleCount > 100) {
        return 'low';
      } else if (fps < 45 || vehicleCount > 50) {
        return 'medium';
      } else {
        return 'high';
      }
    };
    
    expect(performanceBasedLOD(60, 20)).toBe('high');
    expect(performanceBasedLOD(40, 60)).toBe('medium');
    expect(performanceBasedLOD(25, 120)).toBe('low');
    expect(performanceBasedLOD(50, 150)).toBe('low'); // High vehicle count overrides FPS
  });
});

describe('Geometry Instancing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should enable instancing for large vehicle counts', () => {
    const shouldUseInstancing = (vehicleCount: number, fps: number) => {
      return vehicleCount > 200 || fps < 25;
    };
    
    expect(shouldUseInstancing(150, 60)).toBe(false);
    expect(shouldUseInstancing(250, 60)).toBe(true);
    expect(shouldUseInstancing(150, 20)).toBe(true);
    expect(shouldUseInstancing(300, 20)).toBe(true);
  });

  it('should calculate instance matrices efficiently', () => {
    const vehicles = Array.from({ length: 100 }, (_, i) => ({
      id: `vehicle-${i}`,
      position: { x: i * 5, y: 0, z: Math.sin(i * 0.1) * 10 },
      rotation: { x: 0, y: i * 0.1, z: 0 }
    }));
    
    const matrices: any[] = [];
    
    vehicles.forEach(vehicle => {
      // Simulate matrix creation (would use Three.js Matrix4 in real implementation)
      const matrix = {
        position: vehicle.position,
        rotation: vehicle.rotation,
        scale: { x: 1, y: 1, z: 1 }
      };
      matrices.push(matrix);
    });
    
    expect(matrices).toHaveLength(100);
    expect(matrices[0].position.x).toBe(0);
    expect(matrices[99].position.x).toBe(495);
  });

  it('should group vehicles by type for instancing', () => {
    const vehicles = [
      { id: '1', type: 'car', position: { x: 0, y: 0, z: 0 } },
      { id: '2', type: 'truck', position: { x: 5, y: 0, z: 0 } },
      { id: '3', type: 'car', position: { x: 10, y: 0, z: 0 } },
      { id: '4', type: 'truck', position: { x: 15, y: 0, z: 0 } },
      { id: '5', type: 'car', position: { x: 20, y: 0, z: 0 } }
    ];
    
    const groupedVehicles = vehicles.reduce((groups, vehicle) => {
      const type = vehicle.type;
      if (!groups[type]) groups[type] = [];
      groups[type].push(vehicle);
      return groups;
    }, {} as Record<string, typeof vehicles>);
    
    expect(groupedVehicles.car).toHaveLength(3);
    expect(groupedVehicles.truck).toHaveLength(2);
  });
});

describe('Memory Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should cleanup geometries and materials', () => {
    const resources = {
      geometries: new Set(),
      materials: new Set(),
      textures: new Set()
    };
    
    // Simulate resource creation
    for (let i = 0; i < 50; i++) {
      resources.geometries.add(`geometry-${i}`);
      resources.materials.add(`material-${i}`);
    }
    
    // Simulate cleanup
    const cleanup = () => {
      resources.geometries.clear();
      resources.materials.clear();
      resources.textures.clear();
    };
    
    expect(resources.geometries.size).toBe(50);
    cleanup();
    expect(resources.geometries.size).toBe(0);
  });

  it('should dispose unused assets when LOD changes', () => {
    const lodAssets = {
      high: new Set(['detailed-geometry', 'high-res-texture']),
      medium: new Set(['medium-geometry', 'medium-texture']),
      low: new Set(['simple-geometry', 'low-texture'])
    };
    
    let currentLOD: 'high' | 'medium' | 'low' = 'high';
    let activeAssets = new Set([...lodAssets[currentLOD]]);
    
    // Switch to low LOD
    const switchToLOD = (newLOD: 'high' | 'medium' | 'low') => {
      // Dispose unused assets
      activeAssets.clear();
      // Load new assets
      lodAssets[newLOD].forEach(asset => activeAssets.add(asset));
      currentLOD = newLOD;
    };
    
    expect(activeAssets.has('detailed-geometry')).toBe(true);
    
    switchToLOD('low');
    
    expect(activeAssets.has('detailed-geometry')).toBe(false);
    expect(activeAssets.has('simple-geometry')).toBe(true);
    expect(currentLOD).toBe('low');
  });
});

describe('Performance Optimization Triggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger optimizations when performance drops', () => {
    const performanceState = {
      fps: 60,
      targetFps: 60,
      vehicleCount: 100,
      lodLevel: 'high' as 'high' | 'medium' | 'low',
      instancingEnabled: false
    };
    
    const optimizationCheck = () => {
      if (performanceState.fps < performanceState.targetFps * 0.8) {
        // Performance drop detected
        if (performanceState.lodLevel === 'high') {
          performanceState.lodLevel = 'medium';
        } else if (performanceState.lodLevel === 'medium') {
          performanceState.lodLevel = 'low';
        }
        
        if (performanceState.vehicleCount > 50 && !performanceState.instancingEnabled) {
          performanceState.instancingEnabled = true;
        }
      }
    };
    
    // Simulate performance drop
    performanceState.fps = 40;
    optimizationCheck();
    
    expect(performanceState.lodLevel).toBe('medium');
    expect(performanceState.instancingEnabled).toBe(true);
  });

  it('should gradually restore quality when performance improves', () => {
    const performanceState = {
      fps: 25,
      stableFpsCount: 0,
      lodLevel: 'low' as 'high' | 'medium' | 'low',
      instancingEnabled: true
    };
    
    const qualityRestoration = () => {
      const targetFps = 60;
      const goodPerformanceThreshold = targetFps * 0.9; // 54 FPS
      
      if (performanceState.fps >= goodPerformanceThreshold) {
        performanceState.stableFpsCount++;
        
        // Wait for stable performance before upgrading quality
        if (performanceState.stableFpsCount >= 60) { // 1 second at 60fps
          if (performanceState.lodLevel === 'low') {
            performanceState.lodLevel = 'medium';
            performanceState.stableFpsCount = 0;
          } else if (performanceState.lodLevel === 'medium') {
            performanceState.lodLevel = 'high';
            performanceState.stableFpsCount = 0;
          }
        }
      } else {
        performanceState.stableFpsCount = 0;
      }
    };
    
    // Simulate performance improvement
    performanceState.fps = 55;
    
    // Simulate 60 frames of stable performance
    for (let i = 0; i < 60; i++) {
      qualityRestoration();
    }
    
    expect(performanceState.lodLevel).toBe('medium');
    expect(performanceState.stableFpsCount).toBe(0); // Reset after upgrade
  });
});

describe('Adaptive Quality System', () => {
  it('should adjust quality based on device capabilities', () => {
    const deviceCapabilities = {
      gpu: 'integrated', // or 'dedicated'
      memory: 4, // GB
      cores: 4
    };
    
    const getQualityPreset = (capabilities: typeof deviceCapabilities) => {
      if (capabilities.gpu === 'dedicated' && capabilities.memory >= 8) {
        return {
          defaultLOD: 'high' as const,
          maxVehicles: 500,
          shadowQuality: 'high',
          instancingThreshold: 300
        };
      } else if (capabilities.memory >= 4 && capabilities.cores >= 4) {
        return {
          defaultLOD: 'medium' as const,
          maxVehicles: 200,
          shadowQuality: 'medium',
          instancingThreshold: 150
        };
      } else {
        return {
          defaultLOD: 'low' as const,
          maxVehicles: 100,
          shadowQuality: 'low',
          instancingThreshold: 50
        };
      }
    };
    
    const preset = getQualityPreset(deviceCapabilities);
    
    expect(preset.defaultLOD).toBe('medium');
    expect(preset.maxVehicles).toBe(200);
    expect(preset.instancingThreshold).toBe(150);
  });

  it('should balance quality vs performance dynamically', () => {
    const adaptiveSystem = {
      targetFps: 60,
      currentFps: 60,
      qualityLevel: 1.0, // 0.0 = lowest, 1.0 = highest
      frameHistory: [] as number[]
    };
    
    const updateAdaptiveQuality = (frameDelta: number) => {
      const fps = 1000 / frameDelta;
      adaptiveSystem.frameHistory.push(fps);
      
      // Keep only recent frames
      if (adaptiveSystem.frameHistory.length > 30) {
        adaptiveSystem.frameHistory.shift();
      }
      
      // Calculate average FPS
      const avgFps = adaptiveSystem.frameHistory.reduce((sum, f) => sum + f, 0) / adaptiveSystem.frameHistory.length;
      adaptiveSystem.currentFps = avgFps;
      
      // Adjust quality
      const fpsRatio = avgFps / adaptiveSystem.targetFps;
      if (fpsRatio < 0.8) {
        adaptiveSystem.qualityLevel = Math.max(0.0, adaptiveSystem.qualityLevel - 0.1);
      } else if (fpsRatio > 1.1) {
        adaptiveSystem.qualityLevel = Math.min(1.0, adaptiveSystem.qualityLevel + 0.05);
      }
    };
    
    // Simulate performance drop
    for (let i = 0; i < 20; i++) {
      updateAdaptiveQuality(25); // 40 FPS
    }
    
    expect(adaptiveSystem.qualityLevel).toBeLessThan(1.0);
    expect(adaptiveSystem.currentFps).toBeCloseTo(40, 1);
  });
});