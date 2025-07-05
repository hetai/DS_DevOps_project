/**
 * Workflow Progress Indicator Component
 * 
 * Provides visual progress tracking for workflow operations
 * Features:
 * - Step-by-step progress visualization
 * - Current step highlighting
 * - Progress percentage display
 * - Error state indication
 */

import React from 'react';
import { WorkflowStatus, WorkflowStep } from '../WorkflowManager';

export interface WorkflowProgressIndicatorProps {
  status: WorkflowStatus;
  currentStep: WorkflowStep | null;
  progress: number;
  errorMessage?: string | null;
  className?: string;
}

const workflowSteps = [
  { key: 'generation', label: 'Generation', description: 'Generating scenario files' },
  { key: 'validation', label: 'Validation', description: 'Validating generated files' },
  { key: 'visualization_prep', label: 'Visualization', description: 'Preparing 3D visualization' },
];

export const WorkflowProgressIndicator: React.FC<WorkflowProgressIndicatorProps> = ({
  status,
  currentStep,
  progress,
  errorMessage,
  className = '',
}) => {
  const getStepStatus = (stepKey: string) => {
    if (status === 'failed' && currentStep === stepKey) {
      return 'error';
    }
    if (currentStep === stepKey) {
      return 'active';
    }
    if (status === 'completed' || (currentStep && workflowSteps.findIndex(s => s.key === currentStep) > workflowSteps.findIndex(s => s.key === stepKey))) {
      return 'completed';
    }
    return 'pending';
  };

  const getStatusIcon = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return '';
      case 'active':
        return 'ó';
      case 'error':
        return '';
      default:
        return 'Ë';
    }
  };

  const getStatusColor = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'active':
        return 'text-blue-600 bg-blue-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-400 bg-gray-100';
    }
  };

  return (
    <div className={`workflow-progress-indicator ${className}`}>
      {/* Progress Header */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Workflow Progress</h3>
          <span className="text-sm text-gray-600">{Math.round(progress * 100)}%</span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {workflowSteps.map((step, index) => {
          const stepStatus = getStepStatus(step.key);
          const isLast = index === workflowSteps.length - 1;
          
          return (
            <div key={step.key} className="relative">
              {/* Connector Line */}
              {!isLast && (
                <div className="absolute left-4 top-8 w-0.5 h-6 bg-gray-300" />
              )}
              
              {/* Step Content */}
              <div className="flex items-start space-x-3">
                {/* Step Icon */}
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getStatusColor(
                    stepStatus
                  )}`}
                >
                  {getStatusIcon(stepStatus)}
                </div>
                
                {/* Step Details */}
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{step.label}</div>
                  <div className="text-sm text-gray-600">{step.description}</div>
                  
                  {/* Active Step Progress */}
                  {stepStatus === 'active' && (
                    <div className="mt-1">
                      <div className="text-xs text-blue-600 font-medium">
                        In progress...
                      </div>
                    </div>
                  )}
                  
                  {/* Error Message */}
                  {stepStatus === 'error' && errorMessage && (
                    <div className="mt-1 text-xs text-red-600">
                      {errorMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Summary */}
      <div className="mt-4 p-3 rounded-lg bg-gray-50">
        <div className="text-sm">
          <span className="font-medium">Status: </span>
          <span
            className={`capitalize ${
              status === 'completed'
                ? 'text-green-600'
                : status === 'failed'
                ? 'text-red-600'
                : 'text-blue-600'
            }`}
          >
            {status}
          </span>
        </div>
        
        {currentStep && (
          <div className="text-sm mt-1">
            <span className="font-medium">Current Step: </span>
            <span className="capitalize">{currentStep.replace('_', ' ')}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowProgressIndicator;