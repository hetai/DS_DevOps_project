import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useVisualizationStore, useVisualizationActions, usePerformanceMetrics } from '../stores/visualizationStore';
import { useScenarioData } from '../hooks/useScenarioData';

// Test the refactored 3D visualization components
export default function RefactorTest() {
  const [testStep, setTestStep] = useState(0);
  const [testResults, setTestResults] = useState<string[]>([]);
  const { fps, renderTime } = usePerformanceMetrics();
  const { setData, play, pause, toggleVehicles, updatePerformance } = useVisualizationActions();
  const store = useVisualizationStore();
  const scenarioData = useScenarioData();

  // Test data for validation
  const testScenarioFiles = {
    'test.xosc': `<?xml version="1.0"?>
<OpenSCENARIO>
  <FileHeader description="Test Scenario" author="RefactorTest" />
  <Entity name="ego_vehicle">
    <Position>
      <WorldPosition x="0" y="0" z="0" h="0" />
    </Position>
  </Entity>
  <Entity name="target_vehicle">
    <Position>
      <WorldPosition x="10" y="0" z="0" h="1.57" />
    </Position>
  </Entity>
</OpenSCENARIO>`,
    'test.xodr': `<?xml version="1.0"?>
<OpenDRIVE>
  <header name="Test Road" revMajor="1" revMinor="6" />
  <road id="1" length="100" junction="-1" />
</OpenDRIVE>`
  };

  const testValidationResults = {
    'test.xosc': {
      is_valid: true,
      issues: [],
      total_errors: 0,
      total_warnings: 0
    }
  };

  const runTests = async () => {
    const results: string[] = [];
    
    try {
      // Test 1: Store initialization
      setTestStep(1);
      const initialState = useVisualizationStore.getState();
      if (initialState.vehicles.length === 0 && !initialState.loading) {
        results.push('✅ Store initialized correctly');
      } else {
        results.push('❌ Store initialization failed');
      }

      // Test 2: Web Worker data parsing
      setTestStep(2);
      try {
        await scenarioData.parseData(testScenarioFiles, testValidationResults);
        if (scenarioData.data) {
          results.push('✅ Web Worker parsing successful');
          
          // Test 3: Store data update
          setTestStep(3);
          setData({
            vehicles: scenarioData.data.vehicles,
            timeline: scenarioData.data.timeline,
            openDriveData: scenarioData.data.openDriveData,
            openScenarioData: scenarioData.data.openScenarioData,
            validationIssues: scenarioData.data.validationIssues
          });
          
          const updatedState = useVisualizationStore.getState();
          if (updatedState.vehicles.length > 0) {
            results.push('✅ Store data update successful');
          } else {
            results.push('❌ Store data update failed');
          }
        } else {
          results.push('❌ Web Worker parsing returned no data');
        }
      } catch (error) {
        results.push(`❌ Web Worker parsing failed: ${error}`);
      }

      // Test 4: Playback controls
      setTestStep(4);
      play();
      setTimeout(() => {
        const state = useVisualizationStore.getState();
        if (state.isPlaying) {
          results.push('✅ Playback controls working');
          pause();
        } else {
          results.push('❌ Playback controls failed');
        }
      }, 100);

      // Test 5: Performance monitoring
      setTestStep(5);
      updatePerformance(60, 16.7);
      setTimeout(() => {
        const state = useVisualizationStore.getState();
        if (state.fps === 60 && state.renderTime === 16.7) {
          results.push('✅ Performance monitoring working');
        } else {
          results.push('❌ Performance monitoring failed');
        }
      }, 100);

      // Test 6: View toggles
      setTestStep(6);
      const beforeToggle = useVisualizationStore.getState().showVehicles;
      toggleVehicles();
      const afterToggle = useVisualizationStore.getState().showVehicles;
      if (beforeToggle !== afterToggle) {
        results.push('✅ View toggles working');
      } else {
        results.push('❌ View toggles failed');
      }

      setTestStep(7);
      results.push('🎉 All tests completed!');
      
    } catch (error) {
      results.push(`❌ Test suite failed: ${error}`);
    }

    setTestResults(results);
  };

  const getStepName = (step: number) => {
    const steps = [
      'Ready to test',
      'Testing store initialization',
      'Testing Web Worker parsing',
      'Testing store data updates',
      'Testing playback controls',
      'Testing performance monitoring',
      'Testing view toggles',
      'Tests completed'
    ];
    return steps[step] || 'Unknown step';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">3D Visualization Refactor Test</h1>
        <p className="text-gray-600">Testing the refactored components and architecture</p>
      </div>

      {/* Test Status */}
      <Card>
        <CardHeader>
          <CardTitle>Test Status</CardTitle>
          <CardDescription>Current test progress and results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Current Step:</span>
              <Badge variant={testStep === 7 ? 'default' : 'secondary'}>
                {getStepName(testStep)}
              </Badge>
            </div>
            
            <Button 
              onClick={runTests} 
              disabled={scenarioData.loading}
              className="w-full"
            >
              {scenarioData.loading ? 'Testing...' : 'Run Tests'}
            </Button>

            {testResults.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Test Results:</h3>
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Store State Display */}
      <Card>
        <CardHeader>
          <CardTitle>Current Store State</CardTitle>
          <CardDescription>Live view of the Zustand store state</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Vehicles:</strong> {store.vehicles.length}
            </div>
            <div>
              <strong>Timeline Events:</strong> {store.timeline.length}
            </div>
            <div>
              <strong>Playing:</strong> {store.isPlaying ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Current Time:</strong> {store.currentTime.toFixed(1)}s
            </div>
            <div>
              <strong>Show Vehicles:</strong> {store.showVehicles ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Show Roads:</strong> {store.showRoads ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>FPS:</strong> {fps}
            </div>
            <div>
              <strong>Render Time:</strong> {renderTime.toFixed(1)}ms
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Web Worker Status */}
      <Card>
        <CardHeader>
          <CardTitle>Web Worker Status</CardTitle>
          <CardDescription>Status of background data parsing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Status:</span>
              <Badge variant={scenarioData.loading ? 'secondary' : scenarioData.error ? 'destructive' : 'default'}>
                {scenarioData.loading ? 'Loading' : scenarioData.error ? 'Error' : 'Ready'}
              </Badge>
            </div>
            
            {scenarioData.error && (
              <Alert>
                <AlertDescription>
                  {scenarioData.error}
                </AlertDescription>
              </Alert>
            )}

            {scenarioData.data && (
              <div className="text-sm space-y-1">
                <div>Vehicles parsed: {scenarioData.data.vehicles.length}</div>
                <div>Timeline events: {scenarioData.data.timeline.length}</div>
                <div>OpenDRIVE data: {scenarioData.data.openDriveData ? 'Available' : 'None'}</div>
                <div>OpenSCENARIO data: {scenarioData.data.openScenarioData ? 'Available' : 'None'}</div>
                <div>Validation issues: {scenarioData.data.validationIssues.length}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Architecture Info */}
      <Card>
        <CardHeader>
          <CardTitle>Refactor Architecture</CardTitle>
          <CardDescription>Key improvements in the refactored system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>✅ <strong>Web Worker:</strong> Background XML parsing prevents UI blocking</div>
            <div>✅ <strong>Zustand Store:</strong> Centralized state management</div>
            <div>✅ <strong>React Three Fiber:</strong> Declarative 3D rendering</div>
            <div>✅ <strong>LOD System:</strong> Performance-based quality adjustment</div>
            <div>✅ <strong>Instancing:</strong> Efficient rendering for large vehicle counts</div>
            <div>✅ <strong>Error Handling:</strong> Graceful degradation and recovery</div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Testing Instructions</CardTitle>
          <CardDescription>Additional tests you can perform manually</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>1. <strong>Performance:</strong> Monitor FPS while loading large scenarios</div>
            <div>2. <strong>LOD System:</strong> Check quality adjustment with camera distance</div>
            <div>3. <strong>Error Handling:</strong> Try uploading invalid files</div>
            <div>4. <strong>Playback:</strong> Test play/pause/timeline controls</div>
            <div>5. <strong>View Controls:</strong> Toggle visibility options</div>
            <div>6. <strong>Responsiveness:</strong> UI should remain responsive during data processing</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}