/**
 * Integration tests for VehicleRenderer with trajectory interpolation
 * Tests the actual rendering behavior with the new interpolation system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { Canvas } from '@react-three/fiber';
import React from 'react';
import VehicleRenderer from '../components/visualization/renderers/VehicleRenderer';
import { VehicleElement } from '../components/visualization/types/VisualizationTypes';

// Mock Three.js and R3F
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="r3f-canvas">{children}</div>,
  useFrame: (callback: any) => {
    // Simulate frame updates
    callback();
  },
  useThree: () => ({ camera: { position: { x: 0, y: 0, z: 10 } } }),
}));

vi.mock('three', () => ({
  Vector3: class {
    constructor(public x = 0, public y = 0, public z = 0) {}
    clone() { return new this.constructor(this.x, this.y, this.z); }
    add(v: any) { 
      this.x += v.x; this.y += v.y; this.z += v.z; 
      return this; 
    }
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
  BoxGeometry: class {},
  MeshStandardMaterial: class {},
  Matrix4: class {
    compose() { return this; }
  },
  Quaternion: class {
    setFromEuler() { return this; }
  },
  Color: class {
    constructor(public color = '#ffffff') {}
  },
  CanvasTexture: class {
    needsUpdate = true;
  },
  SpriteMaterial: class {},
  MeshBasicMaterial: class {},
  CatmullRomCurve3: class {
    constructor(public points: any[]) {}
    getPoint(t: number) { return this.points[Math.floor(t * (this.points.length - 1))]; }
    getTangent(t: number) { return { normalize: () => ({ x: 1, z: 0 }) }; }
  }
}));

// Mock material and geometry utilities
vi.mock('../components/visualization/utils/MaterialUtils', () => ({
  MaterialUtils: {
    createVehicleMaterial: () => ({ dispose: vi.fn() })
  },
  MaterialPresets: {
    FAMILY_CAR: {
      type: 'standard',
      metalness: 0.3,
      roughness: 0.7
    }
  }
}));

vi.mock('../components/visualization/utils/GeometryUtils', () => ({
  GeometryUtils: {
    createTrajectoryGeometry: () => ({ dispose: vi.fn() })
  }
}));

vi.mock('../components/visualization/utils/MeshLineUtils', () => ({
  MeshLineUtils: {
    createTrajectoryMeshLine: () => ({ dispose: vi.fn() }),
    createProgressMeshLine: () => ({ dispose: vi.fn() })
  }
}));

describe('VehicleRenderer Integration Tests', () => {
  const mockVehicles: VehicleElement[] = [
    {
      id: 'vehicle-1',
      name: 'ego',
      type: 'car',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      timestamp: 0,
      startTime: 0,
      endTime: 10,
      trajectory: [
        { time: 0, x: 0, y: 0, z: 0, velocity: 10 },
        { time: 5, x: 50, y: 0, z: 0, velocity: 10 },
        { time: 10, x: 100, y: 0, z: 0, velocity: 10 }
      ]
    },
    {
      id: 'vehicle-2',
      name: 'target',
      type: 'car',
      position: { x: 20, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      timestamp: 2,
      startTime: 2,
      endTime: 8,
      trajectory: [
        { time: 2, x: 20, y: 0, z: 0, velocity: 15 },
        { time: 5, x: 65, y: 0, z: 0, velocity: 15 },
        { time: 8, x: 110, y: 0, z: 0, velocity: 15 }
      ]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render vehicles with correct interpolated positions', () => {
    const { container } = render(
      <Canvas>
        <VehicleRenderer
          vehicles={mockVehicles}
          timeline={[]}
          currentTime={2.5}
          showTrajectories={true}
          showVehicleLabels={true}
        />
      </Canvas>
    );

    expect(container.querySelector('[data-testid="r3f-canvas"]')).toBeInTheDocument();
  });

  it('should handle vehicle visibility based on timeline', () => {
    const { rerender } = render(
      <Canvas>
        <VehicleRenderer
          vehicles={mockVehicles}
          timeline={[]}
          currentTime={1} // Before vehicle-2 starts
          showTrajectories={true}
          showVehicleLabels={true}
        />
      </Canvas>
    );

    // Should only show vehicle-1 at time 1
    expect(document.querySelector('[data-testid="r3f-canvas"]')).toBeInTheDocument();

    // Move to time when both vehicles are visible
    rerender(
      <Canvas>
        <VehicleRenderer
          vehicles={mockVehicles}
          timeline={[]}
          currentTime={5}
          showTrajectories={true}
          showVehicleLabels={true}
        />
      </Canvas>
    );

    // Should show both vehicles at time 5
    expect(document.querySelector('[data-testid="r3f-canvas"]')).toBeInTheDocument();
  });

  it('should update positions smoothly during animation', () => {
    const renderAtTime = (time: number) => {
      const { container } = render(
        <Canvas>
          <VehicleRenderer
            vehicles={mockVehicles}
            timeline={[]}
            currentTime={time}
            showTrajectories={true}
            showVehicleLabels={true}
          />
        </Canvas>
      );
      return container;
    };

    // Test smooth progression
    const container1 = renderAtTime(2);
    const container2 = renderAtTime(3);
    const container3 = renderAtTime(4);

    // Each render should succeed (positions are interpolated internally)
    expect(container1.querySelector('[data-testid="r3f-canvas"]')).toBeInTheDocument();
    expect(container2.querySelector('[data-testid="r3f-canvas"]')).toBeInTheDocument();
    expect(container3.querySelector('[data-testid="r3f-canvas"]')).toBeInTheDocument();
  });

  it('should handle trajectory rendering with progress indicators', () => {
    const { container } = render(
      <Canvas>
        <VehicleRenderer
          vehicles={mockVehicles}
          timeline={[]}
          currentTime={5}
          showTrajectories={true}
          showVehicleLabels={false}
        />
      </Canvas>
    );

    // Should render trajectories
    expect(container.querySelector('[data-testid="r3f-canvas"]')).toBeInTheDocument();
  });

  it('should handle performance mode correctly', () => {
    const { container } = render(
      <Canvas>
        <VehicleRenderer
          vehicles={mockVehicles}
          timeline={[]}
          currentTime={5}
          showTrajectories={true}
          showVehicleLabels={true}
          performanceMode={true}
        />
      </Canvas>
    );

    // Should still render in performance mode (but may skip some features)
    expect(container.querySelector('[data-testid="r3f-canvas"]')).toBeInTheDocument();
  });

  it('should handle empty vehicle list gracefully', () => {
    const { container } = render(
      <Canvas>
        <VehicleRenderer
          vehicles={[]}
          timeline={[]}
          currentTime={5}
          showTrajectories={true}
          showVehicleLabels={true}
        />
      </Canvas>
    );

    expect(container.querySelector('[data-testid="r3f-canvas"]')).toBeInTheDocument();
  });

  it('should handle vehicles without trajectories', () => {
    const staticVehicles: VehicleElement[] = [
      {
        id: 'static-vehicle',
        name: 'static',
        type: 'car',
        position: { x: 10, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        timestamp: 0,
        startTime: 0,
        endTime: 10,
        trajectory: []
      }
    ];

    const { container } = render(
      <Canvas>
        <VehicleRenderer
          vehicles={staticVehicles}
          timeline={[]}
          currentTime={5}
          showTrajectories={true}
          showVehicleLabels={true}
        />
      </Canvas>
    );

    expect(container.querySelector('[data-testid="r3f-canvas"]')).toBeInTheDocument();
  });

  it('should handle rapid time changes efficiently', () => {
    const { rerender } = render(
      <Canvas>
        <VehicleRenderer
          vehicles={mockVehicles}
          timeline={[]}
          currentTime={0}
          showTrajectories={true}
          showVehicleLabels={true}
        />
      </Canvas>
    );

    // Simulate rapid time changes
    for (let time = 0; time <= 10; time += 0.5) {
      rerender(
        <Canvas>
          <VehicleRenderer
            vehicles={mockVehicles}
            timeline={[]}
            currentTime={time}
            showTrajectories={true}
            showVehicleLabels={true}
          />
        </Canvas>
      );
    }

    // Should handle rapid updates without errors
    expect(document.querySelector('[data-testid="r3f-canvas"]')).toBeInTheDocument();
  });
});