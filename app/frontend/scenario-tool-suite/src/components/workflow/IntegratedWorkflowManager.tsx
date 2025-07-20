/**
 * Integrated Workflow Manager
 * 
 * Provides context and state management for integrated workflow operations
 * Handles API communication with backend workflow endpoints
 * Manages workflow state transitions and error handling
 * 
 * This extends the existing WorkflowManager with integrated workflow capabilities
 */

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import axios from 'axios';

// Re-export types from existing WorkflowManager
export type {
  WorkflowState,
  WorkflowStatus,
  WorkflowStep,
  ScenarioParameters,
  WorkflowRequest,
  WorkflowResponse,
} from '../WorkflowManager';

// Import existing workflow types and utilities
import {
  WorkflowState,
  WorkflowStatus,
  WorkflowStep,
  ScenarioParameters,
  WorkflowRequest,
  WorkflowResponse,
  workflowReducer,
  initialState,
} from '../WorkflowManager';

// Extended interfaces for integrated workflow
export interface IntegratedWorkflowRequest extends WorkflowRequest {
  auto_validate?: boolean;
  prepare_visualization?: boolean;
  validation_level?: 'basic' | 'enhanced' | 'comprehensive';
}

export interface IntegratedWorkflowResponse extends WorkflowResponse {
  visualization_metadata: {
    road_network?: {
      roads: any[];
      junctions: any[];
    };
    vehicles?: any[];
    events?: any[];
  } | null;
}

// Extended workflow actions
export type IntegratedWorkflowAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'START_WORKFLOW'; payload: { sessionId: string; status: WorkflowStatus } }
  | { type: 'UPDATE_WORKFLOW'; payload: Partial<WorkflowState> }
  | { type: 'SET_ERROR'; payload: { message: string; step?: string } }
  | { type: 'RESET_WORKFLOW' }
  | { type: 'SET_VISUALIZATION_METADATA'; payload: any }
  | { type: 'UPDATE_PROGRESS'; payload: { progress: number; currentStep?: WorkflowStep } };

// Extended workflow context
export interface IntegratedWorkflowContextType {
  state: WorkflowState;
  
  // Core workflow operations
  startCompleteWorkflow: (request: IntegratedWorkflowRequest) => Promise<void>;
  getWorkflowStatus: (sessionId: string) => Promise<void>;
  resetWorkflow: () => void;
  
  // File operations
  getWorkflowFiles: (sessionId: string) => Promise<Record<string, string>>;
  getValidationResults: (sessionId: string) => Promise<Record<string, any>>;
  
  // Visualization operations
  prepareVisualization: (sessionId: string) => Promise<any>;
  getVisualizationMetadata: (sessionId: string) => Promise<any>;
}

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Extended reducer for integrated workflow
const integratedWorkflowReducer = (state: WorkflowState, action: IntegratedWorkflowAction): WorkflowState => {
  switch (action.type) {
    case 'SET_VISUALIZATION_METADATA':
      return {
        ...state,
        visualizationMetadata: action.payload,
      };
    
    case 'UPDATE_PROGRESS':
      return {
        ...state,
        progress: action.payload.progress,
        currentStep: action.payload.currentStep || state.currentStep,
      };
    
    default:
      return workflowReducer(state, action as any);
  }
};

// Create context
const IntegratedWorkflowContext = createContext<IntegratedWorkflowContextType | undefined>(undefined);

// Provider component
export const IntegratedWorkflowManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(integratedWorkflowReducer, initialState);

  // Start complete workflow (generation + validation + visualization prep)
  const startCompleteWorkflow = useCallback(async (request: IntegratedWorkflowRequest) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'RESET_WORKFLOW' });

      const response = await axios({
        url: `${API_BASE_URL}/api/workflow/complete`,
        method: 'POST',
        data: {
          parameters: request.parameters,
          auto_validate: request.auto_validate ?? true,
          prepare_visualization: request.prepare_visualization ?? true,
          validation_level: request.validation_level ?? 'enhanced',
        },
        timeout: 30000, // 30 second timeout as per requirements
      });

      const workflowResponse: IntegratedWorkflowResponse = response.data;

      dispatch({
        type: 'START_WORKFLOW',
        payload: {
          sessionId: workflowResponse.session_id,
          status: workflowResponse.status,
        },
      });

      dispatch({
        type: 'UPDATE_WORKFLOW',
        payload: {
          currentStep: workflowResponse.current_step,
          progress: workflowResponse.progress,
          scenarioFiles: workflowResponse.scenario_files,
          validationResults: workflowResponse.validation_results,
          visualizationMetadata: workflowResponse.visualization_metadata,
          createdAt: workflowResponse.created_at,
          updatedAt: workflowResponse.updated_at,
        },
      });

      // If workflow is not completed, start polling
      if (!['completed', 'failed'].includes(workflowResponse.status)) {
        // Polling will be handled by the component
      }

    } catch (error: any) {
      console.error('Failed to start complete workflow:', error);
      
      let errorMessage = 'Failed to start workflow';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }

      dispatch({
        type: 'SET_ERROR',
        payload: {
          message: errorMessage,
          step: 'initialization',
        },
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Get workflow status
  const getWorkflowStatus = useCallback(async (sessionId: string) => {
    try {
      const response = await axios({
        url: `${API_BASE_URL}/api/workflow/${sessionId}`,
        method: 'GET',
        timeout: 10000,
      });

      const workflowResponse: IntegratedWorkflowResponse = response.data;

      dispatch({
        type: 'UPDATE_WORKFLOW',
        payload: {
          status: workflowResponse.status,
          currentStep: workflowResponse.current_step,
          progress: workflowResponse.progress,
          scenarioFiles: workflowResponse.scenario_files,
          validationResults: workflowResponse.validation_results,
          visualizationMetadata: workflowResponse.visualization_metadata,
          updatedAt: workflowResponse.updated_at,
          errorMessage: workflowResponse.error_message,
          errorStep: workflowResponse.error_step,
        },
      });

    } catch (error: any) {
      console.error('Failed to get workflow status:', error);
      
      // Don't update error state for polling failures unless it's a critical error
      if (error.response?.status === 404) {
        dispatch({
          type: 'SET_ERROR',
          payload: {
            message: 'Workflow session not found',
            step: 'status_check',
          },
        });
      }
    }
  }, []);

  // Reset workflow
  const resetWorkflow = useCallback(() => {
    dispatch({ type: 'RESET_WORKFLOW' });
  }, []);

  // Get workflow files
  const getWorkflowFiles = useCallback(async (sessionId: string): Promise<Record<string, string>> => {
    try {
      const response = await axios({
        url: `${API_BASE_URL}/api/workflow/${sessionId}/files`,
        method: 'GET',
        timeout: 10000,
      });

      return response.data.files || {};
    } catch (error) {
      console.error('Failed to get workflow files:', error);
      return {};
    }
  }, []);

  // Get validation results
  const getValidationResults = useCallback(async (sessionId: string): Promise<Record<string, any>> => {
    try {
      const response = await axios({
        url: `${API_BASE_URL}/api/workflow/${sessionId}/validation`,
        method: 'GET',
        timeout: 10000,
      });

      return response.data.validation_results || {};
    } catch (error) {
      console.error('Failed to get validation results:', error);
      return {};
    }
  }, []);

  // Prepare visualization
  const prepareVisualization = useCallback(async (sessionId: string): Promise<any> => {
    try {
      const response = await axios({
        url: `${API_BASE_URL}/api/workflow/${sessionId}/visualization/prepare`,
        method: 'POST',
        timeout: 15000,
      });

      const metadata = response.data.visualization_metadata;
      
      dispatch({
        type: 'SET_VISUALIZATION_METADATA',
        payload: metadata,
      });

      return metadata;
    } catch (error) {
      console.error('Failed to prepare visualization:', error);
      throw error;
    }
  }, []);

  // Get visualization metadata
  const getVisualizationMetadata = useCallback(async (sessionId: string): Promise<any> => {
    try {
      const response = await axios({
        url: `${API_BASE_URL}/api/workflow/${sessionId}/visualization/metadata`,
        method: 'GET',
        timeout: 10000,
      });

      return response.data.visualization_metadata || {};
    } catch (error) {
      console.error('Failed to get visualization metadata:', error);
      return {};
    }
  }, []);

  const contextValue: IntegratedWorkflowContextType = {
    state,
    startCompleteWorkflow,
    getWorkflowStatus,
    resetWorkflow,
    getWorkflowFiles,
    getValidationResults,
    prepareVisualization,
    getVisualizationMetadata,
  };

  return (
    <IntegratedWorkflowContext.Provider value={contextValue}>
      {children}
    </IntegratedWorkflowContext.Provider>
  );
};

// Hook to use integrated workflow context
export const useIntegratedWorkflow = (): IntegratedWorkflowContextType => {
  const context = useContext(IntegratedWorkflowContext);
  if (!context) {
    throw new Error('useIntegratedWorkflow must be used within an IntegratedWorkflowManager');
  }
  return context;
};

export default IntegratedWorkflowManager;