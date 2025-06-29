/**
 * TDD GREEN Phase - Batch Generation Interface Component
 * 
 * Main interface for batch scenario generation with parameter variations,
 * NCAP tests, templates, and results viewing.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Loader2, Play, Square, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ParameterVariationForm } from './ParameterVariationForm';
import { NCAPTestGenerator } from './NCAPTestGenerator';
import { TemplateManager } from './TemplateManager';
import { BatchResultsViewer } from './BatchResultsViewer';
import { 
  generateBatchScenarios, 
  BatchGenerationConfig, 
  BatchGenerationResult,
  cancelBatchGeneration
} from '../services/batchApi';

interface GenerationState {
  status: 'idle' | 'generating' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentScenario: number;
  totalScenarios: number;
  error?: string;
  results?: BatchGenerationResult;
  sessionId?: string;
}

export const BatchGenerationInterface: React.FC = () => {
  const [activeTab, setActiveTab] = useState('variations');
  const [generationState, setGenerationState] = useState<GenerationState>({
    status: 'idle',
    progress: 0,
    currentScenario: 0,
    totalScenarios: 0
  });
  
  const [batchConfig, setBatchConfig] = useState<Partial<BatchGenerationConfig>>({});
  const [hasValidConfig, setHasValidConfig] = useState(false);

  // Validate configuration whenever it changes
  useEffect(() => {
    const isValid = Boolean(
      batchConfig.base_params && 
      batchConfig.variation_config &&
      (batchConfig.variation_config.parameter_ranges || 
       batchConfig.variation_config.parameter_sets ||
       batchConfig.variation_config.parameter_distributions)
    );
    setHasValidConfig(isValid);
  }, [batchConfig]);

  const handleParameterVariationSubmit = useCallback((config: BatchGenerationConfig) => {
    setBatchConfig(config);
    setActiveTab('results');
  }, []);

  const handleNCAPGenerate = useCallback((config: BatchGenerationConfig) => {
    setBatchConfig(config);
    setActiveTab('results');
  }, []);

  const handleTemplateGenerate = useCallback((config: BatchGenerationConfig) => {
    setBatchConfig(config);
    setActiveTab('results');
  }, []);

  const startBatchGeneration = useCallback(async () => {
    if (!hasValidConfig || !batchConfig.base_params || !batchConfig.variation_config) {
      setGenerationState(prev => ({
        ...prev,
        status: 'failed',
        error: 'Please configure parameters before starting generation'
      }));
      return;
    }

    const sessionId = `batch_${Date.now()}`;
    setGenerationState({
      status: 'generating',
      progress: 0,
      currentScenario: 0,
      totalScenarios: batchConfig.max_scenarios || 10,
      sessionId
    });

    try {
      // Simulate progress updates for better UX
      const progressInterval = setInterval(() => {
        setGenerationState(prev => {
          if (prev.status !== 'generating') {
            clearInterval(progressInterval);
            return prev;
          }
          
          const newProgress = Math.min(prev.progress + 10, 95);
          return {
            ...prev,
            progress: newProgress,
            currentScenario: Math.floor(newProgress / 100 * prev.totalScenarios)
          };
        });
      }, 1000);

      const results = await generateBatchScenarios(batchConfig as BatchGenerationConfig);
      
      clearInterval(progressInterval);
      
      setGenerationState({
        status: 'completed',
        progress: 100,
        currentScenario: results.total_scenarios,
        totalScenarios: results.total_scenarios,
        results,
        sessionId
      });

    } catch (error) {
      setGenerationState(prev => ({
        ...prev,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
    }
  }, [batchConfig, hasValidConfig]);

  const cancelGeneration = useCallback(async () => {
    if (generationState.sessionId) {
      try {
        await cancelBatchGeneration(generationState.sessionId);
      } catch (error) {
        console.error('Failed to cancel generation:', error);
      }
    }
    
    setGenerationState(prev => ({
      ...prev,
      status: 'cancelled'
    }));
  }, [generationState.sessionId]);

  const resetGeneration = useCallback(() => {
    setGenerationState({
      status: 'idle',
      progress: 0,
      currentScenario: 0,
      totalScenarios: 0
    });
  }, []);

  const getStatusColor = (status: GenerationState['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-yellow-500';
      case 'generating': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: GenerationState['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'failed': return <AlertTriangle className="h-4 w-4" />;
      case 'generating': return <Loader2 className="h-4 w-4 animate-spin" />;
      default: return null;
    }
  };

  return (
    <div 
      className="w-full max-w-6xl mx-auto p-6 space-y-6"
      role="main"
      aria-label="Batch Generation Interface"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Batch Scenario Generation
            <Badge variant="secondary">Advanced</Badge>
          </CardTitle>
          <CardDescription>
            Generate multiple scenario variations using parameter ranges, NCAP test templates, 
            or custom scenario templates.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Generation Status */}
          {generationState.status !== 'idle' && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(generationState.status)}
                  <span className="font-medium">
                    {generationState.status === 'generating' && 'Generating scenarios...'}
                    {generationState.status === 'completed' && 'Batch generation complete'}
                    {generationState.status === 'failed' && 'Generation failed'}
                    {generationState.status === 'cancelled' && 'Generation cancelled'}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  {generationState.status === 'generating' && (
                    <Button
                      onClick={cancelGeneration}
                      variant="outline"
                      size="sm"
                    >
                      <Square className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                  
                  {(generationState.status === 'completed' || 
                    generationState.status === 'failed' || 
                    generationState.status === 'cancelled') && (
                    <Button
                      onClick={resetGeneration}
                      variant="outline"
                      size="sm"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
              
              {generationState.status === 'generating' && (
                <div className="space-y-2">
                  <Progress 
                    value={generationState.progress} 
                    className="w-full"
                    role="progressbar"
                    aria-valuenow={generationState.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                  <div className="text-sm text-gray-600">
                    {generationState.currentScenario} of {generationState.totalScenarios} scenarios
                  </div>
                </div>
              )}
              
              {generationState.status === 'completed' && generationState.results && (
                <div className="text-sm text-green-700">
                  {generationState.results.total_scenarios} scenarios generated successfully
                </div>
              )}
              
              {generationState.status === 'failed' && generationState.error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{generationState.error}</AlertDescription>
                </Alert>
              )}
              
              <div 
                role="status" 
                aria-live="polite"
                className="sr-only"
              >
                {generationState.status === 'generating' && 'Generating scenarios'}
                {generationState.status === 'completed' && 'Generation completed'}
                {generationState.status === 'failed' && 'Generation failed'}
              </div>
            </div>
          )}

          {/* Main Generation Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                onClick={startBatchGeneration}
                disabled={!hasValidConfig || generationState.status === 'generating'}
                className="flex items-center gap-2"
                aria-describedby="generate-help"
              >
                {generationState.status === 'generating' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Generate Batch
              </Button>
              
              <div id="generate-help" className="text-sm text-gray-600">
                {!hasValidConfig && 'Configure parameters in the tabs below to enable generation'}
                {hasValidConfig && 'Ready to generate batch scenarios'}
              </div>
            </div>
            
            {generationState.results && (
              <Button
                variant="outline"
                onClick={() => {/* Download implementation */}}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download All
              </Button>
            )}
          </div>

          {/* Tab Interface */}
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList 
              className="grid w-full grid-cols-4"
              aria-label="Batch Generation Options"
            >
              <TabsTrigger value="variations">Parameter Variations</TabsTrigger>
              <TabsTrigger value="ncap">NCAP Tests</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>

            <TabsContent value="variations" className="mt-6">
              <ParameterVariationForm onSubmit={handleParameterVariationSubmit} />
            </TabsContent>

            <TabsContent value="ncap" className="mt-6">
              <NCAPTestGenerator onGenerate={handleNCAPGenerate} />
            </TabsContent>

            <TabsContent value="templates" className="mt-6">
              <TemplateManager onGenerate={handleTemplateGenerate} />
            </TabsContent>

            <TabsContent value="results" className="mt-6">
              {generationState.results ? (
                <BatchResultsViewer results={generationState.results} />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-lg font-medium mb-2">No results yet</div>
                  <div>Configure parameters and generate scenarios to see results here</div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchGenerationInterface;