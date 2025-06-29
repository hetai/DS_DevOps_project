import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import axios from 'axios';

// Workflow types and interfaces
export interface WorkflowState {
  sessionId: string | null;
  status: WorkflowStatus;
  currentStep: WorkflowStep | null;
  progress: number;
  createdAt: string | null;
  updatedAt: string | null;
  scenarioFiles: Record<string, string>;
  validationResults: Record<string, any>;
  visualizationMetadata: any | null;
  errorMessage: string | null;
  errorStep: WorkflowStep | null;
  isLoading: boolean;
}

export type WorkflowStatus = 
  | 'pending'
  | 'generating' 
  | 'generated'
  | 'validating'
  | 'validated'
  | 'ready'
  | 'failed'
  | 'completed';

export type WorkflowStep = 
  | 'generation'
  | 'validation'
  | 'visualization_prep';

interface ScenarioParameters {
  scenario_name: string;
  description: string;
  road_network: {
    road_description: string;
    generate_simple_road: boolean;
  };
  vehicles: Array<{
    name: string;
    category: string;
    bounding_box: {
      width: number;
      length: number;
      height: number;
    };
    performance: {
      max_speed: number;
      max_acceleration: number;
      max_deceleration: number;
    };
    initial_speed: number;
  }>;
  events: any[];
  environment: {
    weather: string;
    time_of_day: string;
    precipitation: number;
    visibility: number;
    wind_speed: number;
  };
  openscenario_version: string;
  ncap_compliance: boolean;
  parameter_variations: Record<string, any>;
}

interface WorkflowRequest {
  parameters: ScenarioParameters;
  auto_validate?: boolean;
  prepare_visualization?: boolean;
}

interface WorkflowResponse {
  session_id: string;
  status: WorkflowStatus;
  current_step: WorkflowStep | null;
  progress: number;
  created_at: string;
  updated_at: string;
  scenario_files: Record<string, string>;
  validation_results: Record<string, any>;
  visualization_metadata: any | null;
  error_message: string | null;
  error_step: WorkflowStep | null;
}

// Workflow actions
type WorkflowAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'START_WORKFLOW'; payload: { sessionId: string } }
  | { type: 'UPDATE_WORKFLOW'; payload: Partial<WorkflowState> }
  | { type: 'SET_ERROR'; payload: { message: string; step?: WorkflowStep } }
  | { type: 'RESET_WORKFLOW' };

// Initial state
const initialState: WorkflowState = {
  sessionId: null,
  status: 'pending',
  currentStep: null,
  progress: 0,
  createdAt: null,
  updatedAt: null,
  scenarioFiles: {},
  validationResults: {},
  visualizationMetadata: null,
  errorMessage: null,
  errorStep: null,
  isLoading: false,
};

// Workflow reducer
function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'START_WORKFLOW':
      return {
        ...state,
        sessionId: action.payload.sessionId,
        status: 'pending',
        currentStep: null,
        progress: 0,
        errorMessage: null,
        errorStep: null,
        isLoading: true,
      };
    
    case 'UPDATE_WORKFLOW':
      return { ...state, ...action.payload, isLoading: false };
    
    case 'SET_ERROR':
      return {
        ...state,
        status: 'failed',
        errorMessage: action.payload.message,
        errorStep: action.payload.step || null,
        isLoading: false,
      };
    
    case 'RESET_WORKFLOW':
      return initialState;
    
    default:
      return state;
  }
}

// Workflow context
interface WorkflowContextType {
  state: WorkflowState;
  startGenerateAndValidate: (parameters: ScenarioParameters) => Promise<void>;
  startCompleteWorkflow: (parameters: ScenarioParameters) => Promise<void>;
  checkWorkflowStatus: (sessionId: string) => Promise<void>;
  getWorkflowFiles: (sessionId: string) => Promise<Record<string, string>>;
  getValidationResults: (sessionId: string) => Promise<Record<string, any>>;
  resetWorkflow: () => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

// API base URL
const API_BASE_URL = process.env.VITE_API_URL || 'http://192.168.0.193:8080';

// Workflow provider component
interface WorkflowProviderProps {
  children: ReactNode;
}

export function WorkflowProvider({ children }: WorkflowProviderProps) {
  const [state, dispatch] = useReducer(workflowReducer, initialState);

  // API call helper
  const apiCall = useCallback(async (url: string, options: any = {}) => {
    try {
      const response = await axios({
        url: `${API_BASE_URL}${url}`,
        ...options,
      });
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.detail || error.message || 'Unknown error occurred';
      throw new Error(message);
    }
  }, []);

  // Start generate and validate workflow
  const startGenerateAndValidate = useCallback(async (parameters: ScenarioParameters) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const request: WorkflowRequest = {
        parameters,
        auto_validate: true,
        prepare_visualization: false,
      };

      const response: WorkflowResponse = await apiCall('/api/workflow/generate-and-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: request,
      });

      dispatch({ type: 'START_WORKFLOW', payload: { sessionId: response.session_id } });
      dispatch({ 
        type: 'UPDATE_WORKFLOW', 
        payload: {
          status: response.status,
          currentStep: response.current_step,
          progress: response.progress,
          createdAt: response.created_at,
          updatedAt: response.updated_at,
          scenarioFiles: response.scenario_files,
          validationResults: response.validation_results,
          visualizationMetadata: response.visualization_metadata,
          errorMessage: response.error_message,
          errorStep: response.error_step,
        }
      });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { message: error.message } });
    }
  }, [apiCall]);

  // Start complete workflow
  const startCompleteWorkflow = useCallback(async (parameters: ScenarioParameters) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const request: WorkflowRequest = {
        parameters,
        auto_validate: true,
        prepare_visualization: true,
      };

      const response: WorkflowResponse = await apiCall('/api/workflow/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: request,
      });

      dispatch({ type: 'START_WORKFLOW', payload: { sessionId: response.session_id } });
      dispatch({ 
        type: 'UPDATE_WORKFLOW', 
        payload: {
          status: response.status,
          currentStep: response.current_step,
          progress: response.progress,
          createdAt: response.created_at,
          updatedAt: response.updated_at,
          scenarioFiles: response.scenario_files,
          validationResults: response.validation_results,
          visualizationMetadata: response.visualization_metadata,
          errorMessage: response.error_message,
          errorStep: response.error_step,
        }
      });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { message: error.message } });
    }
  }, [apiCall]);

  // Check workflow status
  const checkWorkflowStatus = useCallback(async (sessionId: string) => {
    try {
      const response = await apiCall(`/api/workflow/${sessionId}/status`);
      
      dispatch({ 
        type: 'UPDATE_WORKFLOW', 
        payload: {
          status: response.status,
          currentStep: response.current_step,
          progress: response.progress,
          updatedAt: response.updated_at,
          errorMessage: response.error_message,
          errorStep: response.error_step,
        }
      });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { message: error.message } });
    }
  }, [apiCall]);

  // Get workflow files
  const getWorkflowFiles = useCallback(async (sessionId: string): Promise<Record<string, string>> => {
    try {
      const response = await apiCall(`/api/workflow/${sessionId}/files`);
      
      dispatch({ 
        type: 'UPDATE_WORKFLOW', 
        payload: { scenarioFiles: response.files }
      });
      
      return response.files;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { message: error.message } });
      return {};
    }
  }, [apiCall]);

  // Get validation results
  const getValidationResults = useCallback(async (sessionId: string): Promise<Record<string, any>> => {
    try {
      const response = await apiCall(`/api/workflow/${sessionId}/validation`);
      
      dispatch({ 
        type: 'UPDATE_WORKFLOW', 
        payload: { validationResults: response.validation_results }
      });
      
      return response.validation_results;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { message: error.message } });
      return {};
    }
  }, [apiCall]);

  // Reset workflow
  const resetWorkflow = useCallback(() => {
    dispatch({ type: 'RESET_WORKFLOW' });
  }, []);

  // Auto-refresh workflow status when session is active
  useEffect(() => {
    if (!state.sessionId || state.status === 'completed' || state.status === 'failed') {
      return;
    }

    const interval = setInterval(async () => {
      await checkWorkflowStatus(state.sessionId!);
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [state.sessionId, state.status, checkWorkflowStatus]);

  const contextValue: WorkflowContextType = {
    state,
    startGenerateAndValidate,
    startCompleteWorkflow,
    checkWorkflowStatus,
    getWorkflowFiles,
    getValidationResults,
    resetWorkflow,
  };

  return (
    <WorkflowContext.Provider value={contextValue}>
      {children}
    </WorkflowContext.Provider>
  );
}

// Custom hook to use workflow context
export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}

// Utility functions
export const getStatusColor = (status: WorkflowStatus): string => {
  switch (status) {
    case 'pending':
      return 'text-gray-500';
    case 'generating':
    case 'validating':
      return 'text-blue-500';
    case 'generated':
    case 'validated':
      return 'text-green-500';
    case 'ready':
    case 'completed':
      return 'text-emerald-500';
    case 'failed':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
};

export const getStatusText = (status: WorkflowStatus): string => {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'generating':
      return 'Generating Scenario...';
    case 'generated':
      return 'Scenario Generated';
    case 'validating':
      return 'Validating Files...';
    case 'validated':
      return 'Files Validated';
    case 'ready':
      return 'Ready for Visualization';
    case 'completed':
      return 'Workflow Completed';
    case 'failed':
      return 'Workflow Failed';
    default:
      return 'Unknown Status';
  }
};

export const getStepText = (step: WorkflowStep | null): string => {
  if (!step) return '';
  
  switch (step) {
    case 'generation':
      return 'Generating scenario files';
    case 'validation':
      return 'Validating scenario files';
    case 'visualization_prep':
      return 'Preparing visualization data';
    default:
      return '';
  }
};