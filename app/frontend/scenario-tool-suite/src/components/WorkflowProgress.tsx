import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  FileText, 
  Shield, 
  Eye,
  Download,
  RefreshCw,
  Clock
} from 'lucide-react';
import { useWorkflow, getStatusColor, getStatusText, getStepText, WorkflowStep } from './WorkflowManager';

interface WorkflowProgressProps {
  onFilesGenerated?: (files: Record<string, string>) => void;
  onValidationComplete?: (results: Record<string, any>) => void;
  onVisualizationReady?: (metadata: any) => void;
}

export default function WorkflowProgress({ 
  onFilesGenerated, 
  onValidationComplete, 
  onVisualizationReady 
}: WorkflowProgressProps) {
  const { state, getWorkflowFiles: _getWorkflowFiles, getValidationResults: _getValidationResults, resetWorkflow } = useWorkflow();
  const [showDetails, setShowDetails] = useState(false);

  // Notify parent components of workflow progress
  useEffect(() => {
    if (state.status === 'generated' && Object.keys(state.scenarioFiles).length > 0) {
      onFilesGenerated?.(state.scenarioFiles);
    }
    
    if (state.status === 'validated' && Object.keys(state.validationResults).length > 0) {
      onValidationComplete?.(state.validationResults);
    }
    
    if (state.status === 'ready' && state.visualizationMetadata) {
      onVisualizationReady?.(state.visualizationMetadata);
    }
  }, [state.status, state.scenarioFiles, state.validationResults, state.visualizationMetadata, 
      onFilesGenerated, onValidationComplete, onVisualizationReady]);

  // Don't render if no workflow is active
  if (!state.sessionId) {
    return null;
  }

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getProgressSteps = () => {
    const steps = [
      { 
        name: 'Generation', 
        key: 'generation' as WorkflowStep,
        icon: FileText,
        description: 'Creating scenario files'
      },
      { 
        name: 'Validation', 
        key: 'validation' as WorkflowStep,
        icon: Shield,
        description: 'Validating file integrity'
      },
      { 
        name: 'Visualization', 
        key: 'visualization_prep' as WorkflowStep,
        icon: Eye,
        description: 'Preparing 3D data'
      }
    ];

    return steps.map((step, index) => {
      let stepStatus: 'pending' | 'active' | 'completed' | 'error' = 'pending';
      
      if (state.status === 'failed' && state.errorStep === step.key) {
        stepStatus = 'error';
      } else if (state.currentStep === step.key) {
        stepStatus = 'active';
      } else if (
        (step.key === 'generation' && ['generated', 'validating', 'validated', 'ready', 'completed'].includes(state.status)) ||
        (step.key === 'validation' && ['validated', 'ready', 'completed'].includes(state.status)) ||
        (step.key === 'visualization_prep' && ['ready', 'completed'].includes(state.status))
      ) {
        stepStatus = 'completed';
      }

      return { ...step, status: stepStatus, index };
    });
  };

  const progressSteps = getProgressSteps();

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {state.isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Workflow Progress
            <Badge variant="secondary" className={getStatusColor(state.status)}>
              {getStatusText(state.status)}
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
            
            {(state.status === 'completed' || state.status === 'failed') && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetWorkflow}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>
        
        {state.currentStep && (
          <p className="text-sm text-muted-foreground">
            {getStepText(state.currentStep)}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(state.progress * 100)}%</span>
          </div>
          <Progress value={state.progress * 100} className="w-full" />
        </div>

        {/* Progress Steps */}
        <div className="space-y-3">
          {progressSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-center gap-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  step.status === 'completed' ? 'bg-green-100 text-green-600' :
                  step.status === 'active' ? 'bg-blue-100 text-blue-600' :
                  step.status === 'error' ? 'bg-red-100 text-red-600' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {step.status === 'completed' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : step.status === 'active' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : step.status === 'error' ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className={`font-medium ${
                    step.status === 'completed' ? 'text-green-600' :
                    step.status === 'active' ? 'text-blue-600' :
                    step.status === 'error' ? 'text-red-600' :
                    'text-gray-500'
                  }`}>
                    {step.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {step.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Display */}
        {state.status === 'failed' && state.errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error in {state.errorStep}:</strong> {state.errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Generated Files */}
        {Object.keys(state.scenarioFiles).length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Generated Files</h4>
            <div className="space-y-2">
              {Object.entries(state.scenarioFiles).map(([filename, content]) => (
                <div key={filename} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">{filename}</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(content.length / 1024)}KB
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadFile(filename, content)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation Results Summary */}
        {Object.keys(state.validationResults).length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Validation Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {Object.entries(state.validationResults).map(([filename, result]) => {
                if (typeof result !== 'object' || !result) return null;
                
                const hasErrors = result.total_errors > 0;
                const hasWarnings = result.total_warnings > 0;
                
                return (
                  <div key={filename} className={`p-2 rounded-md border ${
                    hasErrors ? 'border-red-200 bg-red-50' :
                    hasWarnings ? 'border-yellow-200 bg-yellow-50' :
                    'border-green-200 bg-green-50'
                  }`}>
                    <div className="font-medium text-xs">{filename}</div>
                    <div className="text-xs text-muted-foreground">
                      {result.total_errors > 0 && <span className="text-red-600">{result.total_errors} errors</span>}
                      {result.total_warnings > 0 && <span className="text-yellow-600 ml-1">{result.total_warnings} warnings</span>}
                      {result.total_errors === 0 && result.total_warnings === 0 && (
                        <span className="text-green-600">Valid</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Information */}
        {showDetails && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <strong>Session ID:</strong>
                <div className="font-mono text-muted-foreground break-all">
                  {state.sessionId}
                </div>
              </div>
              
              {state.createdAt && (
                <div>
                  <strong>Created:</strong>
                  <div className="text-muted-foreground">
                    {new Date(state.createdAt).toLocaleString()}
                  </div>
                </div>
              )}
              
              {state.updatedAt && (
                <div>
                  <strong>Last Updated:</strong>
                  <div className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(state.updatedAt).toLocaleString()}
                  </div>
                </div>
              )}
              
              <div>
                <strong>Files Generated:</strong>
                <div className="text-muted-foreground">
                  {Object.keys(state.scenarioFiles).length}
                </div>
              </div>
            </div>
            
            {/* Validation Details */}
            {Object.keys(state.validationResults).length > 0 && (
              <div className="space-y-2">
                <strong className="text-sm">Validation Details:</strong>
                {Object.entries(state.validationResults).map(([filename, result]) => {
                  if (typeof result !== 'object' || !result || !result.issues) return null;
                  
                  return (
                    <div key={filename} className="text-xs space-y-1">
                      <div className="font-medium">{filename}:</div>
                      {result.issues.slice(0, 3).map((issue: any, index: number) => (
                        <div key={index} className={`pl-2 ${
                          issue.level === 'ERROR' ? 'text-red-600' :
                          issue.level === 'WARNING' ? 'text-yellow-600' :
                          'text-blue-600'
                        }`}>
                          {issue.level}: {issue.message}
                        </div>
                      ))}
                      {result.issues.length > 3 && (
                        <div className="pl-2 text-muted-foreground">
                          ... and {result.issues.length - 3} more issues
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}