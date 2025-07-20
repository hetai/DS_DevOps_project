/**
 * Integrated Workflow Interface Component
 * 
 * Provides seamless workflow: generation → validation → visualization
 * Features:
 * - One-click complete workflow execution
 * - Internal file management (no manual upload/download)
 * - Scenario state tracking
 * - Automated validation after generation
 * - Direct visualization from validation results
 * 
 * This is part of TDD RED phase - initial implementation to make tests pass
 */

import React, { useState, useEffect, useCallback } from 'react';
import { IntegratedWorkflowManager, useIntegratedWorkflow } from './IntegratedWorkflowManager';
import { WorkflowProgressIndicator } from './WorkflowProgressIndicator';
import { ScenarioStateTracker } from './ScenarioStateTracker';
import { Visualization3D } from '../visualization/Visualization3D';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Alert } from '../ui/alert';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export interface ScenarioState {
  id: string;
  status: 'Generated' | 'Validated' | 'Validation Failed' | 'Ready for Visualization' | 'Visualized';
  files?: {
    xosc?: string;
    xodr?: string;
  };
  validationResults?: any;
  errorMessage?: string;
}

export interface IntegratedWorkflowInterfaceProps {
  initialScenarios?: ScenarioState[];
  onWorkflowComplete?: (sessionId: string, results: any) => void;
  onWorkflowError?: (error: string, step: string) => void;
}

export const IntegratedWorkflowInterface: React.FC<IntegratedWorkflowInterfaceProps> = ({
  initialScenarios = [],
  onWorkflowComplete,
  onWorkflowError,
}) => {
  const {
    state,
    startCompleteWorkflow,
    getWorkflowStatus,
    resetWorkflow,
  } = useIntegratedWorkflow();

  const [scenarios, setScenarios] = useState<ScenarioState[]>(initialScenarios);
  const [showVisualization, setShowVisualization] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Default scenario parameters for testing
  const defaultParameters = {
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

  // Update scenarios based on workflow state
  useEffect(() => {
    if (state.sessionId) {
      const scenarioState: ScenarioState = {
        id: state.sessionId,
        status: getScenarioStatusFromWorkflow(state.status),
        files: state.scenarioFiles,
        validationResults: state.validationResults,
        errorMessage: state.errorMessage || undefined,
      };

      setScenarios(prev => {
        const existing = prev.find(s => s.id === state.sessionId);
        if (existing) {
          return prev.map(s => s.id === state.sessionId ? scenarioState : s);
        } else {
          return [...prev, scenarioState];
        }
      });
    }
  }, [state]);

  // Poll for workflow status updates
  useEffect(() => {
    if (state.sessionId && ['generating', 'validating', 'ready'].includes(state.status)) {
      const interval = setInterval(async () => {
        try {
          await getWorkflowStatus(state.sessionId!);
        } catch (error) {
          console.error('Failed to poll workflow status:', error);
        }
      }, 2000);

      setPollingInterval(interval);

      return () => {
        clearInterval(interval);
        setPollingInterval(null);
      };
    }
  }, [state.sessionId, state.status, getWorkflowStatus]);

  // Handle workflow completion
  useEffect(() => {
    if (state.status === 'completed' && state.sessionId) {
      onWorkflowComplete?.(state.sessionId, {
        scenarioFiles: state.scenarioFiles,
        validationResults: state.validationResults,
        visualizationMetadata: state.visualizationMetadata,
      });
    }
  }, [state.status, state.sessionId, onWorkflowComplete]);

  // Handle workflow errors
  useEffect(() => {
    if (state.status === 'failed' && state.errorMessage) {
      onWorkflowError?.(state.errorMessage, state.errorStep || 'unknown');
    }
  }, [state.status, state.errorMessage, state.errorStep, onWorkflowError]);

  const getScenarioStatusFromWorkflow = (workflowStatus: string): ScenarioState['status'] => {
    switch (workflowStatus) {
      case 'generated':
        return 'Generated';
      case 'validated':
        return 'Validated';
      case 'failed':
        return state.errorStep === 'validation' ? 'Validation Failed' : 'Generated';
      case 'ready':
      case 'completed':
        return 'Ready for Visualization';
      default:
        return 'Generated';
    }
  };

  const handleStartCompleteWorkflow = useCallback(async () => {
    try {
      setRetryCount(0);
      await startCompleteWorkflow({
        parameters: defaultParameters,
        auto_validate: true,
        prepare_visualization: true,
      });
    } catch (error) {
      console.error('Failed to start workflow:', error);
    }
  }, [startCompleteWorkflow]);

  const handleRetryWorkflow = useCallback(async () => {
    try {
      setRetryCount(prev => prev + 1);
      resetWorkflow();
      await startCompleteWorkflow({
        parameters: defaultParameters,
        auto_validate: true,
        prepare_visualization: true,
      });
    } catch (error) {
      console.error('Failed to retry workflow:', error);
    }
  }, [startCompleteWorkflow, resetWorkflow]);

  const handleViewVisualization = useCallback(() => {
    setShowVisualization(true);
  }, []);

  const canStartWorkflow = !state.isLoading && !['generating', 'validating', 'ready'].includes(state.status);
  const canViewVisualization = state.status === 'completed' && 
    state.scenarioFiles && 
    Object.keys(state.scenarioFiles).length > 0;
  const showRetryButton = state.status === 'failed';

  return (
    <IntegratedWorkflowManager>
      <div className="integrated-workflow-interface p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Integrated Scenario Workflow
          </h2>
          <div className="flex space-x-3">
            {canStartWorkflow && (
              <Button
                onClick={handleStartCompleteWorkflow}
                disabled={state.isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {state.isLoading ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                    Starting...
                  </>
                ) : (
                  'Start Complete Workflow'
                )}
              </Button>
            )}
            
            {showRetryButton && (
              <Button
                onClick={handleRetryWorkflow}
                variant="outline"
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                Retry Workflow
              </Button>
            )}
            
            {canViewVisualization && (
              <Button
                onClick={handleViewVisualization}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                View 3D Visualization
              </Button>
            )}
          </div>
        </div>

        {/* Workflow Progress */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-3">Workflow Progress</h3>
          <WorkflowProgressIndicator
            status={state.status}
            currentStep={state.currentStep}
            progress={state.progress}
          />
        </Card>

        {/* Error Display */}
        {state.errorMessage && (
          <Alert variant="destructive">
            <div>
              <h4 className="font-semibold">Workflow Error</h4>
              <p className="text-sm mt-1">{state.errorMessage}</p>
              {state.errorStep && (
                <p className="text-xs mt-1 opacity-75">
                  Failed at step: {state.errorStep}
                </p>
              )}
              {retryCount > 0 && (
                <p className="text-xs mt-1 opacity-75">
                  Retry attempts: {retryCount}
                </p>
              )}
            </div>
          </Alert>
        )}

        {/* Scenario State Tracking */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-3">Scenario States</h3>
          <ScenarioStateTracker scenarios={scenarios} />
        </Card>

        {/* File Status */}
        {state.scenarioFiles && Object.keys(state.scenarioFiles).length > 0 && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-3">Generated Files</h3>
            <div className="space-y-2">
              {Object.entries(state.scenarioFiles).map(([filename, content]) => (
                <div key={filename} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="font-medium">{filename}</span>
                  <span className="text-sm text-gray-600">
                    {content.length} characters
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Validation Results */}
        {state.validationResults && Object.keys(state.validationResults).length > 0 && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-3">Validation Results</h3>
            <div className="space-y-3">
              {Object.entries(state.validationResults).map(([filename, result]: [string, any]) => (
                <div key={filename} className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{filename}</span>
                    <span className={`px-2 py-1 rounded text-sm ${
                      result.is_valid 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {result.is_valid ? 'Valid' : 'Invalid'}
                    </span>
                  </div>
                  {result.errors && result.errors.length > 0 && (
                    <div className="text-sm text-red-600">
                      <strong>Errors:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {result.errors.map((error: string, index: number) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.warnings && result.warnings.length > 0 && (
                    <div className="text-sm text-yellow-600 mt-2">
                      <strong>Warnings:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {result.warnings.map((warning: string, index: number) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 3D Visualization */}
        {showVisualization && state.scenarioFiles && (
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">3D Visualization</h3>
              <Button
                onClick={() => setShowVisualization(false)}
                variant="outline"
                size="sm"
              >
                Close
              </Button>
            </div>
            <div data-testid="scenario-visualization-3d" className="h-96 border rounded">
              <Visualization3D
                scenarioFiles={state.scenarioFiles}
                validationResults={state.validationResults}
                visualizationMetadata={state.visualizationMetadata}
                scenarioDescription={undefined}
              />
              <div data-testid="validation-highlights" className="hidden">
                {/* Validation highlights overlay */}
              </div>
            </div>
          </Card>
        )}

        {/* Development Info */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="p-4 bg-gray-50">
            <h3 className="text-lg font-semibold mb-3">Development Info</h3>
            <div className="text-sm space-y-1">
              <p><strong>Session ID:</strong> {state.sessionId || 'None'}</p>
              <p><strong>Status:</strong> {state.status}</p>
              <p><strong>Current Step:</strong> {state.currentStep || 'None'}</p>
              <p><strong>Progress:</strong> {Math.round(state.progress * 100)}%</p>
              <p><strong>Loading:</strong> {state.isLoading ? 'Yes' : 'No'}</p>
              <p><strong>Polling:</strong> {pollingInterval ? 'Active' : 'Inactive'}</p>
            </div>
          </Card>
        )}
      </div>
    </IntegratedWorkflowManager>
  );
};

export default IntegratedWorkflowInterface;