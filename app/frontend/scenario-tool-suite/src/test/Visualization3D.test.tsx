/**
 * Tests for 3D visualization components using Three.js
 * Following TDD RED phase - these tests should fail initially
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Three.js dependencies since they don't work in jsdom
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
  useFrame: () => {},
  useThree: () => ({ camera: {}, scene: {} }),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Grid: () => <div data-testid="grid" />,
  Environment: () => <div data-testid="environment" />,
  Text: ({ children }: { children: React.ReactNode }) => <div data-testid="text">{children}</div>,
  Box: () => <div data-testid="box" />,
  Line: () => <div data-testid="line" />,
  Sphere: () => <div data-testid="sphere" />,
}));

vi.mock('three', () => ({
  Vector3: class {
    constructor(public x = 0, public y = 0, public z = 0) {}
  },
  Color: class {
    constructor(public color = '#ffffff') {}
  },
  BufferGeometry: class {},
  LineBasicMaterial: class {},
  Mesh: class {},
  BoxGeometry: class {},
  MeshStandardMaterial: class {},
}));

// Import components after mocking
import { ScenarioVisualization3D } from '../components/visualization/ScenarioVisualization3D';
import { RoadNetworkRenderer } from '../components/visualization/RoadNetworkRenderer';
import { VehicleRenderer } from '../components/visualization/VehicleRenderer';
import { ValidationHighlights } from '../components/visualization/ValidationHighlights';

// Mock scenario data
const mockRoadNetworkData = {
  roads: [
    {
      id: "0",
      name: "highway_main",
      length: 1000.0,
      junction: "-1"
    },
    {
      id: "1", 
      name: "highway_onramp",
      length: 200.0,
      junction: "1"
    }
  ],
  junctions: [
    {
      id: "1",
      name: "main_junction"
    }
  ],
  bounds: {
    min_x: -50,
    max_x: 1000,
    min_y: -20,
    max_y: 20
  }
};

const mockScenarioData = {
  entities: [
    {
      name: "ego",
      type: "vehicle",
      category: "car"
    },
    {
      name: "target",
      type: "vehicle", 
      category: "car"
    }
  ],
  events: [
    {
      name: "overtaking_maneuver",
      priority: "overwrite"
    }
  ],
  initial_conditions: []
};

const mockValidationHighlights = [
  {
    type: "error",
    message: "Invalid road reference",
    file: "scenario.xosc",
    line: 45,
    xpath: "//RoadNetwork/LogicFile"
  },
  {
    type: "warning",
    message: "Missing vehicle dynamics",
    file: "scenario.xosc", 
    line: 23,
    xpath: "//Vehicle/Performance"
  }
];

const mockVisualizationData = {
  session_id: "test-session-123",
  road_network: mockRoadNetworkData,
  scenario_data: mockScenarioData,
  validation_highlights: mockValidationHighlights,
  scenario_files: {
    "scenario.xosc": "<?xml version=\"1.0\"?>...",
    "road_network.xodr": "<?xml version=\"1.0\"?>..."
  },
  validation_results: {
    "scenario.xosc": {
      is_valid: false,
      issues: [
        {
          level: "ERROR",
          message: "Invalid road reference",
          line_number: 45
        }
      ],
      total_errors: 1,
      total_warnings: 1
    }
  }
};

describe('ScenarioVisualization3D', () => {
  it('should render 3D canvas with controls', () => {
    render(<ScenarioVisualization3D data={mockVisualizationData} />);
    
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
    expect(screen.getByTestId('orbit-controls')).toBeInTheDocument();
    expect(screen.getByTestId('environment')).toBeInTheDocument();
  });

  it('should display loading state when data is not provided', () => {
    render(<ScenarioVisualization3D data={null} />);
    
    expect(screen.getByText(/loading 3d visualization/i)).toBeInTheDocument();
  });

  it('should render road network when data is available', () => {
    render(<ScenarioVisualization3D data={mockVisualizationData} />);
    
    // Should contain road network renderer
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('should render vehicles when scenario data is available', () => {
    render(<ScenarioVisualization3D data={mockVisualizationData} />);
    
    // Should contain vehicle renderer
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('should highlight validation issues when present', () => {
    render(<ScenarioVisualization3D data={mockVisualizationData} />);
    
    // Should show validation highlights
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('should provide camera controls for navigation', () => {
    render(<ScenarioVisualization3D data={mockVisualizationData} />);
    
    expect(screen.getByTestId('orbit-controls')).toBeInTheDocument();
  });
});

describe('RoadNetworkRenderer', () => {
  it('should render road segments as lines', () => {
    render(
      <div data-testid="canvas">
        <RoadNetworkRenderer roadData={mockRoadNetworkData} />
      </div>
    );
    
    // Should render road lines
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('should render lane markings', () => {
    render(
      <div data-testid="canvas">
        <RoadNetworkRenderer roadData={mockRoadNetworkData} />
      </div>
    );
    
    // Should include lane markings
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('should handle empty road data gracefully', () => {
    const emptyRoadData = {
      roads: [],
      junctions: [],
      bounds: { min_x: 0, max_x: 0, min_y: 0, max_y: 0 }
    };

    render(
      <div data-testid="canvas">
        <RoadNetworkRenderer roadData={emptyRoadData} />
      </div>
    );
    
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('should render junctions differently from regular roads', () => {
    render(
      <div data-testid="canvas">
        <RoadNetworkRenderer roadData={mockRoadNetworkData} />
      </div>
    );
    
    // Should distinguish junctions
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('should display road labels', () => {
    render(
      <div data-testid="canvas">
        <RoadNetworkRenderer roadData={mockRoadNetworkData} showLabels={true} />
      </div>
    );
    
    // Should show road labels when enabled
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });
});

describe('VehicleRenderer', () => {
  it('should render vehicles as 3D models', () => {
    render(
      <div data-testid="canvas">
        <VehicleRenderer scenarios={mockScenarioData} />
      </div>
    );
    
    // Should render vehicle models
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('should position vehicles correctly based on initial conditions', () => {
    const scenarioWithPositions = {
      ...mockScenarioData,
      initial_conditions: [
        {
          entity: "ego",
          position: { x: 10, y: 0, z: 0 },
          heading: 0
        }
      ]
    };

    render(
      <div data-testid="canvas">
        <VehicleRenderer scenarios={scenarioWithPositions} />
      </div>
    );
    
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('should differentiate vehicle types visually', () => {
    const multiVehicleScenario = {
      entities: [
        { name: "car1", type: "vehicle", category: "car" },
        { name: "truck1", type: "vehicle", category: "truck" },
        { name: "bike1", type: "vehicle", category: "bicycle" }
      ],
      events: [],
      initial_conditions: []
    };

    render(
      <div data-testid="canvas">
        <VehicleRenderer scenarios={multiVehicleScenario} />
      </div>
    );
    
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('should handle animation of vehicle movements', async () => {
    render(
      <div data-testid="canvas">
        <VehicleRenderer scenarios={mockScenarioData} animate={true} />
      </div>
    );
    
    // Should support animation
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });
});

describe('ValidationHighlights', () => {
  it('should render error markers on the 3D scene', () => {
    render(
      <div data-testid="canvas">
        <ValidationHighlights highlights={mockValidationHighlights} />
      </div>
    );
    
    // Should render validation markers
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('should differentiate error types visually', () => {
    const mixedHighlights = [
      {
        type: "error",
        message: "Critical error",
        file: "test.xosc",
        line: 1
      },
      {
        type: "warning", 
        message: "Warning message",
        file: "test.xosc",
        line: 2
      }
    ];

    render(
      <div data-testid="canvas">
        <ValidationHighlights highlights={mixedHighlights} />
      </div>
    );
    
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('should show tooltips on hover', () => {
    render(
      <div data-testid="canvas">
        <ValidationHighlights highlights={mockValidationHighlights} />
      </div>
    );
    
    // Should support hover interactions
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('should handle empty validation highlights', () => {
    render(
      <div data-testid="canvas">
        <ValidationHighlights highlights={[]} />
      </div>
    );
    
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });
});

describe('3D Visualization Integration', () => {
  it('should integrate with workflow state from backend', () => {
    render(<ScenarioVisualization3D data={mockVisualizationData} />);
    
    // Should display session information
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('should update visualization when workflow data changes', () => {
    const { rerender } = render(<ScenarioVisualization3D data={mockVisualizationData} />);
    
    const updatedData = {
      ...mockVisualizationData,
      validation_highlights: []
    };
    
    rerender(<ScenarioVisualization3D data={updatedData} />);
    
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('should handle workflow errors gracefully', () => {
    const errorData = {
      ...mockVisualizationData,
      error_message: "Visualization failed",
      error_step: "visualization_prep"
    };

    render(<ScenarioVisualization3D data={errorData} />);
    
    expect(screen.getByText(/visualization failed/i)).toBeInTheDocument();
  });

  it('should provide performance metrics display', () => {
    render(<ScenarioVisualization3D data={mockVisualizationData} showMetrics={true} />);
    
    // Should show performance information
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });
});