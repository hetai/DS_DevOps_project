/**
 * Scenario State Tracker Component
 * 
 * Tracks and displays the state of scenarios throughout the integrated workflow
 * Provides visual feedback on scenario progress and status
 * 
 * Features:
 * - Real-time scenario state updates
 * - Visual status indicators with colors
 * - File association tracking
 * - Error state display
 * - Validation result integration
 */

import React from 'react';
import { CheckCircle, XCircle, Clock, FileText, AlertTriangle } from 'lucide-react';
import { ScenarioState } from './IntegratedWorkflowInterface';

export interface ScenarioStateTrackerProps {
  scenarios: ScenarioState[];
  className?: string;
  onScenarioSelect?: (scenarioId: string) => void;
}

const getStatusColor = (status: ScenarioState['status']): string => {
  switch (status) {
    case 'Generated':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Validated':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Validation Failed':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'Ready for Visualization':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Visualized':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (status: ScenarioState['status']) => {
  switch (status) {
    case 'Generated':
      return <FileText className="w-4 h-4" />;
    case 'Validated':
      return <CheckCircle className="w-4 h-4" />;
    case 'Validation Failed':
      return <XCircle className="w-4 h-4" />;
    case 'Ready for Visualization':
      return <CheckCircle className="w-4 h-4" />;
    case 'Visualized':
      return <CheckCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

const getStatusDescription = (status: ScenarioState['status']): string => {
  switch (status) {
    case 'Generated':
      return 'Scenario files have been generated successfully';
    case 'Validated':
      return 'Scenario files have passed validation';
    case 'Validation Failed':
      return 'Scenario files failed validation checks';
    case 'Ready for Visualization':
      return 'Scenario is ready for 3D visualization';
    case 'Visualized':
      return 'Scenario has been visualized in 3D';
    default:
      return 'Scenario status unknown';
  }
};

export const ScenarioStateTracker: React.FC<ScenarioStateTrackerProps> = ({
  scenarios,
  className = '',
  onScenarioSelect,
}) => {
  if (scenarios.length === 0) {
    return (
      <div className={`scenario-state-tracker ${className}`} data-testid="scenario-state-tracker">
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No scenarios to track yet</p>
          <p className="text-xs mt-1">Start a workflow to see scenario states</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`scenario-state-tracker ${className}`} data-testid="scenario-state-tracker">
      <div className="space-y-3">
        {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            data-testid={`scenario-${scenario.id}`}
            className={`border rounded-lg p-4 transition-all duration-200 ${
              onScenarioSelect ? 'cursor-pointer hover:shadow-md' : ''
            } ${getStatusColor(scenario.status)}`}
            onClick={() => onScenarioSelect?.(scenario.id)}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {getStatusIcon(scenario.status)}
                <h4 className="font-medium text-sm">
                  Scenario {scenario.id.slice(-8)}
                </h4>
              </div>
              
              <span 
                data-testid={`scenario-status-${scenario.id}`}
                className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(scenario.status)}`}
              >
                {scenario.status}
              </span>
            </div>

            {/* Description */}
            <p className="text-xs opacity-75 mb-3">
              {getStatusDescription(scenario.status)}
            </p>

            {/* Files */}
            {scenario.files && Object.keys(scenario.files).length > 0 && (
              <div className="mb-3">
                <h5 className="text-xs font-medium mb-2 opacity-75">Generated Files:</h5>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(scenario.files).map(([filename, content]) => (
                    <div
                      key={filename}
                      className="inline-flex items-center px-2 py-1 bg-white bg-opacity-50 rounded text-xs"
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      <span>{filename}</span>
                      <span className="ml-1 opacity-50">({content.length} chars)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validation Results */}
            {scenario.validationResults && Object.keys(scenario.validationResults).length > 0 && (
              <div className="mb-3">
                <h5 className="text-xs font-medium mb-2 opacity-75">Validation Results:</h5>
                <div className="space-y-1">
                  {Object.entries(scenario.validationResults).map(([filename, result]: [string, any]) => (
                    <div key={filename} className="flex items-center justify-between text-xs">
                      <span className="flex items-center">
                        <FileText className="w-3 h-3 mr-1" />
                        {filename}
                      </span>
                      <span className={`flex items-center ${
                        result.is_valid ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {result.is_valid ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {result.is_valid ? 'Valid' : 'Invalid'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {scenario.errorMessage && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                <div className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <h6 className="text-xs font-medium text-red-900 mb-1">Error</h6>
                    <p className="text-xs text-red-700">{scenario.errorMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Indicator for Active Scenarios */}
            {['Generated', 'Validated'].includes(scenario.status) && !scenario.errorMessage && (
              <div className="mt-3">
                <div className="flex items-center text-xs opacity-75">
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse mr-2" />
                  <span>
                    {scenario.status === 'Generated' ? 'Ready for validation' : 'Ready for visualization'}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      {scenarios.length > 1 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h5 className="text-sm font-medium text-gray-900 mb-2">Summary</h5>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-600">Total Scenarios:</span>
              <span className="ml-2 font-medium">{scenarios.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Completed:</span>
              <span className="ml-2 font-medium">
                {scenarios.filter(s => ['Validated', 'Ready for Visualization', 'Visualized'].includes(s.status)).length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Failed:</span>
              <span className="ml-2 font-medium text-red-600">
                {scenarios.filter(s => s.status === 'Validation Failed').length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">In Progress:</span>
              <span className="ml-2 font-medium text-blue-600">
                {scenarios.filter(s => s.status === 'Generated').length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioStateTracker;