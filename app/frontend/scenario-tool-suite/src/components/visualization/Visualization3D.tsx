/**
 * 3D Visualization Component
 * 
 * Renders OpenSCENARIO and OpenDRIVE files in 3D using Three.js
 * Integrates with validation results to highlight issues
 * 
 * This is a basic implementation for TDD RED phase
 * Will be enhanced in GREEN phase to pass all tests
 */

import React, { useEffect, useRef, useState } from 'react';
import { Alert } from '../ui/Alert';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import { Eye, EyeOff, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

export interface Visualization3DProps {
  scenarioFiles?: Record<string, string>;
  validationResults?: Record<string, any>;
  visualizationMetadata?: {
    road_network?: {
      roads: any[];
      junctions: any[];
    };
    vehicles?: any[];
    events?: any[];
  };
  className?: string;
  onError?: (error: string) => void;
}

interface ViewerState {
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  showValidationHighlights: boolean;
  cameraPosition: { x: number; y: number; z: number };
  zoom: number;
}

export const Visualization3D: React.FC<Visualization3DProps> = ({
  scenarioFiles = {},
  validationResults = {},
  visualizationMetadata,
  className = '',
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const animationFrameRef = useRef<number>();

  const [state, setState] = useState<ViewerState>({
    isLoading: true,
    error: null,
    isInitialized: false,
    showValidationHighlights: true,
    cameraPosition: { x: 0, y: 10, z: 20 },
    zoom: 1,
  });

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const initializeViewer = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        // Mock Three.js initialization for TDD RED phase
        // In GREEN phase, this will be replaced with actual Three.js code
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading

        // Check if we have files to visualize
        if (Object.keys(scenarioFiles).length === 0) {
          throw new Error('No scenario files provided for visualization');
        }

        // Mock scene creation
        const mockScene = {
          add: () => {},
          remove: () => {},
          children: [],
        };

        const mockRenderer = {
          setSize: () => {},
          render: () => {},
          domElement: document.createElement('canvas'),
        };

        const mockCamera = {
          position: { set: () => {}, x: 0, y: 10, z: 20 },
          lookAt: () => {},
          updateProjectionMatrix: () => {},
        };

        sceneRef.current = mockScene;
        rendererRef.current = mockRenderer;
        cameraRef.current = mockCamera;

        // Append canvas to container
        if (containerRef.current) {
          containerRef.current.appendChild(mockRenderer.domElement);
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          isInitialized: true,
        }));

        // Start render loop
        startRenderLoop();

      } catch (error: any) {
        const errorMessage = error.message || 'Failed to initialize 3D viewer';
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        onError?.(errorMessage);
      }
    };

    initializeViewer();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [scenarioFiles, onError]);

  // Render loop
  const startRenderLoop = () => {
    const animate = () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
  };

  // Load scenario data into 3D scene
  useEffect(() => {
    if (!state.isInitialized || !sceneRef.current) return;

    const loadScenarioData = async () => {
      try {
        // Mock scenario loading for TDD RED phase
        // In GREEN phase, this will parse XOSC/XODR files and create 3D objects
        
        // Clear existing scene objects
        // sceneRef.current.children = [];

        // Load road network from XODR
        if (scenarioFiles['road.xodr'] || scenarioFiles['scenario.xodr']) {
          // Mock road loading
          console.log('Loading road network...');
        }

        // Load scenario from XOSC
        if (scenarioFiles['scenario.xosc']) {
          // Mock scenario loading
          console.log('Loading scenario...');
        }

        // Apply validation highlights if enabled
        if (state.showValidationHighlights) {
          applyValidationHighlights();
        }

      } catch (error: any) {
        const errorMessage = `Failed to load scenario data: ${error.message}`;
        setState(prev => ({ ...prev, error: errorMessage }));
        onError?.(errorMessage);
      }
    };

    loadScenarioData();
  }, [scenarioFiles, state.isInitialized, state.showValidationHighlights, validationResults, onError]);

  // Apply validation highlights to 3D objects
  const applyValidationHighlights = () => {
    if (!validationResults || Object.keys(validationResults).length === 0) return;

    // Mock validation highlighting for TDD RED phase
    Object.entries(validationResults).forEach(([filename, result]: [string, any]) => {
      if (!result.is_valid && result.errors) {
        console.log(`Highlighting validation errors for ${filename}:`, result.errors);
        // In GREEN phase, this will highlight problematic 3D objects
      }
    });
  };

  // Camera controls
  const resetCamera = () => {
    if (cameraRef.current) {
      setState(prev => ({
        ...prev,
        cameraPosition: { x: 0, y: 10, z: 20 },
        zoom: 1,
      }));
      // Apply camera reset in GREEN phase
    }
  };

  const zoomIn = () => {
    setState(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 5) }));
  };

  const zoomOut = () => {
    setState(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.2, 0.1) }));
  };

  const toggleValidationHighlights = () => {
    setState(prev => ({ ...prev, showValidationHighlights: !prev.showValidationHighlights }));
  };

  if (state.error) {
    return (
      <div className={`visualization-3d ${className}`}>
        <Alert variant="destructive">
          <div>
            <h4 className="font-semibold">Visualization Error</h4>
            <p className="text-sm mt-1">{state.error}</p>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`visualization-3d relative ${className}`}>
      {/* Loading State */}
      {state.isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-10">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mb-2" />
            <p className="text-sm text-gray-600">Initializing 3D viewer...</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col space-y-2">
        <Button
          size="sm"
          variant="outline"
          onClick={toggleValidationHighlights}
          className="bg-white shadow-md"
        >
          {state.showValidationHighlights ? (
            <>
              <EyeOff className="w-4 h-4 mr-1" />
              Hide Highlights
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-1" />
              Show Highlights
            </>
          )}
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={resetCamera}
          className="bg-white shadow-md"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset View
        </Button>
        
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="outline"
            onClick={zoomIn}
            className="bg-white shadow-md px-2"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={zoomOut}
            className="bg-white shadow-md px-2"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Validation Highlights Panel */}
      {state.showValidationHighlights && validationResults && Object.keys(validationResults).length > 0 && (
        <div data-testid="validation-highlights" className="absolute bottom-4 left-4 z-20 max-w-sm">
          <div className="bg-white rounded-lg shadow-lg p-3 border">
            <h5 className="text-sm font-semibold mb-2">Validation Issues</h5>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {Object.entries(validationResults).map(([filename, result]: [string, any]) => (
                <div key={filename}>
                  {!result.is_valid && result.errors && result.errors.length > 0 && (
                    <div className="text-xs">
                      <div className="font-medium text-red-700">{filename}</div>
                      {result.errors.slice(0, 2).map((error: string, index: number) => (
                        <div key={index} className="text-red-600 ml-2">
                          • {error}
                        </div>
                      ))}
                      {result.errors.length > 2 && (
                        <div className="text-red-500 ml-2 italic">
                          +{result.errors.length - 2} more errors
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full bg-gray-100 rounded"
        style={{ minHeight: '400px' }}
      >
        {/* Canvas will be inserted here by Three.js */}
      </div>

      {/* Info Panel */}
      <div className="absolute bottom-4 right-4 z-20">
        <div className="bg-white rounded-lg shadow-lg p-3 border text-xs">
          <div className="space-y-1">
            <div><strong>Files:</strong> {Object.keys(scenarioFiles).length}</div>
            <div><strong>Zoom:</strong> {Math.round(state.zoom * 100)}%</div>
            <div><strong>Camera:</strong> ({state.cameraPosition.x}, {state.cameraPosition.y}, {state.cameraPosition.z})</div>
            {visualizationMetadata?.road_network && (
              <div><strong>Roads:</strong> {visualizationMetadata.road_network.roads?.length || 0}</div>
            )}
            {visualizationMetadata?.vehicles && (
              <div><strong>Vehicles:</strong> {visualizationMetadata.vehicles.length}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visualization3D;