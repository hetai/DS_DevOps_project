/**
 * Tests for Integrated Scenario Workflow
 * Following TDD RED phase - these tests should fail initially
 * 
 * Tests the seamless workflow: generation → validation → visualization
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock API calls
const mockApiCall = vi.fn();
vi.mock('axios', () => ({
  default: mockApiCall,
}));

// Mock workflow components that don't exist yet
vi.mock('../components/workflow/IntegratedWorkflowManager', () => ({
  IntegratedWorkflowManager: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="integrated-workflow-manager">{children}</div>
  ),
  useIntegratedWorkflow: () => ({
    state: {
      sessionId: null,
      status: 'pending',
      currentStep: null,
      progress: 0,
      scenarioFiles: {},
      validationResults: {},
      isLoading: false,
      errorMessage: null,
    },
    startCompleteWorkflow: vi.fn(),
    getWorkflowStatus: vi.fn(),
    resetWorkflow: vi.fn(),
  }),
}));

vi.mock('../components/workflow/WorkflowProgressIndicator', () => ({
  WorkflowProgressIndicator: ({ status, currentStep, progress }: any) => (
    <div data-testid="workflow-progress">
      <span data-testid="workflow-status">{status}</span>
      <span data-testid="workflow-step">{currentStep}</span>
      <span data-testid="workflow-progress">{progress}</span>
    </div>
  ),
}));

vi.mock('../components/workflow/ScenarioStateTracker', () => ({
  ScenarioStateTracker: ({ scenarios }: any) => (
    <div data-testid="scenario-state-tracker">
      {scenarios.map((scenario: any, index: number) => (
        <div key={index} data-testid={`scenario-${scenario.id}`}>
          <span data-testid={`scenario-status-${scenario.id}`}>{scenario.status}</span>
        </div>
      ))}
    </div>
  ),
}));

// Import the component that should be created
import { IntegratedWorkflowInterface } from '../components/workflow/IntegratedWorkflowInterface';

// Mock scenario parameters
const mockScenarioParameters = {
  scenario_name: "Highway Overtaking Test",
  description: "Test scenario for highway overtaking maneuver",
  road_network: {
    road_description: "3-lane highway with 120 km/h speed limit",
    generate_simple_road: true,
  },
  vehicles: [
    {
      name: "ego_vehicle",
      category: "car",
      bounding_box: { width: 2.0, length: 4.5, height: 1.8 },
      performance: {
        max_speed: 50.0,
        max_acceleration: 3.0,
        max_deceleration: 8.0,
      },
      initial_speed: 30.0,
    },
  ],
  events: [],
  environment: {
    weather: "clear",
    time_of_day: "day",
    precipitation: 0,
    visibility: 1000,
    wind_speed: 0,
  },
  openscenario_version: "1.2",
  ncap_compliance: true,
  parameter_variations: {},
};

// Mock workflow responses
const mockWorkflowResponse = {
  session_id: "test-session-123",
  status: "completed",
  current_step: null,
  progress: 1.0,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:05:00Z",
  scenario_files: {
    "scenario.xosc": "<?xml version=\"1.0\"?>\n<OpenSCENARIO>...</OpenSCENARIO>",
    "road.xodr": "<?xml version=\"1.0\"?>\n<OpenDRIVE>...</OpenDRIVE>",
  },
  validation_results: {
    "scenario.xosc": {
      is_valid: true,
      validation_level: "enhanced",
      errors: [],
      warnings: [],
    },
    "road.xodr": {
      is_valid: true,
      validation_level: "enhanced",
      errors: [],
      warnings: [],
    },
  },
  visualization_metadata: {
    road_network: { roads: [], junctions: [] },
    vehicles: [],
    events: [],
  },
  error_message: null,
  error_step: null,
};

describe('Integrated Workflow Interface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiCall.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the integrated workflow interface', () => {
      render(<IntegratedWorkflowInterface />);
      
      expect(screen.getByTestId('integrated-workflow-manager')).toBeInTheDocument();
      expect(screen.getByTestId('workflow-progress')).toBeInTheDocument();
      expect(screen.getByTestId('scenario-state-tracker')).toBeInTheDocument();
    });

    it('should display workflow progress indicator', () => {
      render(<IntegratedWorkflowInterface />);
      
      expect(screen.getByTestId('workflow-status')).toBeInTheDocument();
      expect(screen.getByTestId('workflow-step')).toBeInTheDocument();
      expect(screen.getByTestId('workflow-progress')).toBeInTheDocument();
    });

    it('should display scenario state tracker', () => {
      render(<IntegratedWorkflowInterface />);
      
      expect(screen.getByTestId('scenario-state-tracker')).toBeInTheDocument();
    });
  });

  describe('Workflow Execution', () => {
    it('should start complete workflow when triggered', async () => {
      const user = userEvent.setup();
      
      render(<IntegratedWorkflowInterface />);
      
      const startButton = screen.getByRole('button', { name: /start complete workflow/i });
      expect(startButton).toBeInTheDocument();
      
      await user.click(startButton);
      
      // Should trigger workflow start
      await waitFor(() => {
        expect(screen.getByTestId('workflow-status')).toHaveTextContent('generating');
      });
    });

    it('should progress through workflow steps automatically', async () => {
      mockApiCall.mockResolvedValueOnce({ data: mockWorkflowResponse });
      
      render(<IntegratedWorkflowInterface />);
      
      // Simulate workflow progression
      const progressSteps = ['generating', 'validating', 'ready', 'completed'];
      
      for (const step of progressSteps) {
        await waitFor(() => {
          expect(screen.getByTestId('workflow-status')).toHaveTextContent(step);
        });
      }
    });

    it('should handle workflow errors gracefully', async () => {
      const errorResponse = {
        ...mockWorkflowResponse,
        status: 'failed',
        error_message: 'Generation failed: Invalid parameters',
        error_step: 'generation',
      };
      
      mockApiCall.mockResolvedValueOnce({ data: errorResponse });
      
      render(<IntegratedWorkflowInterface />);
      
      await waitFor(() => {
        expect(screen.getByTestId('workflow-status')).toHaveTextContent('failed');
        expect(screen.getByText(/generation failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Scenario State Tracking', () => {
    it('should track scenario states correctly', async () => {
      const scenarioStates = [
        { id: 'scenario-1', status: 'Generated' },
        { id: 'scenario-2', status: 'Validated' },
        { id: 'scenario-3', status: 'Validation Failed' },
      ];
      
      render(
        <IntegratedWorkflowInterface 
          initialScenarios={scenarioStates}
        />
      );
      
      for (const scenario of scenarioStates) {
        expect(screen.getByTestId(`scenario-${scenario.id}`)).toBeInTheDocument();
        expect(screen.getByTestId(`scenario-status-${scenario.id}`)).toHaveTextContent(scenario.status);
      }
    });

    it('should update scenario states during workflow', async () => {
      render(<IntegratedWorkflowInterface />);
      
      // Start workflow
      const startButton = screen.getByRole('button', { name: /start complete workflow/i });
      await userEvent.click(startButton);
      
      // Should show scenario in "Generated" state after generation
      await waitFor(() => {
        expect(screen.getByTestId('scenario-status-test-session-123')).toHaveTextContent('Generated');
      });
      
      // Should show scenario in "Validated" state after validation
      await waitFor(() => {
        expect(screen.getByTestId('scenario-status-test-session-123')).toHaveTextContent('Validated');
      });
    });
  });

  describe('File Management', () => {
    it('should manage files internally without manual upload/download', async () => {
      render(<IntegratedWorkflowInterface />);
      
      // Start workflow
      const startButton = screen.getByRole('button', { name: /start complete workflow/i });
      await userEvent.click(startButton);
      
      // Should not show file upload components during workflow
      expect(screen.queryByText(/upload file/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/download file/i)).not.toBeInTheDocument();
      
      // Should show internal file status
      await waitFor(() => {
        expect(screen.getByText(/scenario.xosc/i)).toBeInTheDocument();
        expect(screen.getByText(/road.xodr/i)).toBeInTheDocument();
      });
    });

    it('should provide one-click progression between workflow steps', async () => {
      render(<IntegratedWorkflowInterface />);
      
      // Should have single button for complete workflow
      const completeWorkflowButton = screen.getByRole('button', { name: /start complete workflow/i });
      expect(completeWorkflowButton).toBeInTheDocument();
      
      // Should not have separate buttons for each step
      expect(screen.queryByRole('button', { name: /generate only/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /validate only/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /visualize only/i })).not.toBeInTheDocument();
    });
  });

  describe('Automated Validation', () => {
    it('should automatically validate after generation', async () => {
      mockApiCall.mockResolvedValueOnce({ data: mockWorkflowResponse });
      
      render(<IntegratedWorkflowInterface />);
      
      const startButton = screen.getByRole('button', { name: /start complete workflow/i });
      await userEvent.click(startButton);
      
      // Should automatically progress from generation to validation
      await waitFor(() => {
        expect(screen.getByTestId('workflow-step')).toHaveTextContent('validation');
      });
      
      // Should complete validation automatically
      await waitFor(() => {
        expect(screen.getByTestId('workflow-status')).toHaveTextContent('validated');
      });
    });

    it('should handle validation failures in automated workflow', async () => {
      const failedValidationResponse = {
        ...mockWorkflowResponse,
        status: 'failed',
        error_step: 'validation',
        error_message: 'Validation failed: Invalid XML structure',
        validation_results: {
          "scenario.xosc": {
            is_valid: false,
            validation_level: "basic",
            errors: ["Invalid XML structure at line 10"],
            warnings: [],
          },
        },
      };
      
      mockApiCall.mockResolvedValueOnce({ data: failedValidationResponse });
      
      render(<IntegratedWorkflowInterface />);
      
      const startButton = screen.getByRole('button', { name: /start complete workflow/i });
      await userEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('workflow-status')).toHaveTextContent('failed');
        expect(screen.getByText(/validation failed/i)).toBeInTheDocument();
        expect(screen.getByText(/invalid xml structure/i)).toBeInTheDocument();
      });
    });
  });

  describe('Direct Visualization', () => {
    it('should enable direct visualization from validation results', async () => {
      mockApiCall.mockResolvedValueOnce({ data: mockWorkflowResponse });
      
      render(<IntegratedWorkflowInterface />);
      
      const startButton = screen.getByRole('button', { name: /start complete workflow/i });
      await userEvent.click(startButton);
      
      // Should show visualization option after successful validation
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /view 3d visualization/i })).toBeInTheDocument();
      });
    });

    it('should integrate validation results with visualization', async () => {
      mockApiCall.mockResolvedValueOnce({ data: mockWorkflowResponse });
      
      render(<IntegratedWorkflowInterface />);
      
      const startButton = screen.getByRole('button', { name: /start complete workflow/i });
      await userEvent.click(startButton);
      
      const visualizeButton = await screen.findByRole('button', { name: /view 3d visualization/i });
      await userEvent.click(visualizeButton);
      
      // Should show visualization with validation highlights
      await waitFor(() => {
        expect(screen.getByTestId('scenario-visualization-3d')).toBeInTheDocument();
        expect(screen.getByTestId('validation-highlights')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('Network error'));
      
      render(<IntegratedWorkflowInterface />);
      
      const startButton = screen.getByRole('button', { name: /start complete workflow/i });
      await userEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByTestId('workflow-status')).toHaveTextContent('failed');
      });
    });

    it('should provide retry functionality for failed workflows', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('Temporary error'));
      
      render(<IntegratedWorkflowInterface />);
      
      const startButton = screen.getByRole('button', { name: /start complete workflow/i });
      await userEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry workflow/i })).toBeInTheDocument();
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should complete workflow within acceptable time limits', async () => {
      const startTime = Date.now();
      
      mockApiCall.mockResolvedValueOnce({ data: mockWorkflowResponse });
      
      render(<IntegratedWorkflowInterface />);
      
      const startButton = screen.getByRole('button', { name: /start complete workflow/i });
      await userEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('workflow-status')).toHaveTextContent('completed');
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 30 seconds (as per PRD requirements)
      expect(duration).toBeLessThan(30000);
    });

    it('should show progress indicators during long operations', async () => {
      render(<IntegratedWorkflowInterface />);
      
      const startButton = screen.getByRole('button', { name: /start complete workflow/i });
      await userEvent.click(startButton);
      
      // Should show loading indicators
      expect(screen.getByTestId('workflow-progress')).toBeInTheDocument();
      expect(screen.getByText(/generating/i)).toBeInTheDocument();
    });
  });
});

describe('Workflow Integration API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiCall.mockReset();
  });

  it('should call correct API endpoints for complete workflow', async () => {
    mockApiCall.mockResolvedValueOnce({ data: mockWorkflowResponse });
    
    render(<IntegratedWorkflowInterface />);
    
    const startButton = screen.getByRole('button', { name: /start complete workflow/i });
    await userEvent.click(startButton);
    
    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith({
        url: 'http://192.168.0.193:8080/api/workflow/complete',
        method: 'POST',
        data: expect.objectContaining({
          parameters: expect.any(Object),
          auto_validate: true,
          prepare_visualization: true,
        }),
      });
    });
  });

  it('should poll for workflow status updates', async () => {
    const inProgressResponse = {
      ...mockWorkflowResponse,
      status: 'generating',
      progress: 0.3,
    };
    
    mockApiCall
      .mockResolvedValueOnce({ data: inProgressResponse })
      .mockResolvedValueOnce({ data: mockWorkflowResponse });
    
    render(<IntegratedWorkflowInterface />);
    
    const startButton = screen.getByRole('button', { name: /start complete workflow/i });
    await userEvent.click(startButton);
    
    // Should poll for status updates
    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith({
        url: expect.stringContaining('/api/workflow/'),
        method: 'GET',
      });
    });
  });
});