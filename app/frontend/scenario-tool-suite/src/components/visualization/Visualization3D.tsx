/**
 * Visualization3D - Professional 3D visualization component
 * Replaces the mock implementation with real Three.js-powered 3D rendering
 * Inspired by Dash self-driving car simulator architecture
 */

import React, { useRef, useEffect, useState, useMemo, Suspense, Component } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Eye, 
  EyeOff,
  Settings,
  Info,
  Monitor,
  AlertTriangle,
  Zap
} from 'lucide-react';
import CoordinateAxes from './components/CoordinateAxes';
import BottomControlBar from './BottomControlBar';
// Import our custom visualization components
import { SceneManager } from './core/SceneManager';
import { OpenDriveParser } from './parsers/OpenDriveParser';
import { OpenScenarioParser } from './parsers/OpenScenarioParser';
import RoadNetworkRenderer from './renderers/RoadNetworkRenderer';
import VehicleRenderer from './renderers/VehicleRenderer';
import ValidationOverlay from './renderers/ValidationOverlay';
import CameraController from './controls/CameraController';
// TimelineController functionality is now integrated into BottomControlBar
// import TimelineController from './controls/TimelineController';
import { DataAdapter } from './utils/DataAdapter';
import { LightingUtils, LightingPresets } from './utils/LightingUtils';

// Import types
import { 
  Visualization3DProps, 
  SceneState, 
  ParsedOpenDrive, 
  ParsedOpenScenario,
  VehicleElement,
  ValidationIssue
} from './types/VisualizationTypes';

// Import timeline synchronization hook
import { useTimelineSync } from './hooks/useTimelineSync';

// Import event processing system
import { EventProcessor } from './utils/EventProcessor';
import { VehicleStateManager } from './utils/VehicleStateManager';
import { ScenarioEvent } from './types/ScenarioEventTypes';

interface Visualization3DState {
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  
  // Parsed data
  openDriveData: ParsedOpenDrive | null;
  openScenarioData: ParsedOpenScenario | null;
  
  // Rendering options
  showRoadNetwork: boolean;
  showVehicles: boolean;
  showValidationHighlights: boolean;
  showVehicleLabels: boolean;
  showTrajectories: boolean;
  
  // Camera state
  autoRotate: boolean;
  
  // Performance metrics
  frameRate?: number;
  renderTime?: number;
  
  // Event processing state
  scenarioEvents: ScenarioEvent[];
  eventProcessor: EventProcessor | null;
  vehicleStateManager: VehicleStateManager | null;
}

/**
 * Loading component
 */
function LoadingOverlay({ progress = 0, message = 'Loading...' }: { progress?: number; message?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-10">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-600">{message}</p>
        {progress > 0 && (
          <div className="mt-2 w-64 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Enhanced Three.js Error Boundary
 */
class ThreeJSErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Three.js Visualization Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * Enhanced Error Fallback Component
 */
function VisualizationErrorFallback({ error, onRetry }: { error?: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      <div className="text-center p-6 max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">3D Visualization Error</h3>
        <p className="text-sm text-gray-600 mb-4">
          {error || 'The 3D visualization encountered an error and cannot be displayed.'}
        </p>
        <div className="space-y-2 text-xs text-gray-500">
          <p>• Check browser WebGL support</p>
          <p>• Verify file formats (.xosc, .xodr)</p>
          <p>• Try refreshing the page</p>
        </div>
        {onRetry && (
          <Button 
            size="sm" 
            variant="outline" 
            className="mt-4"
            onClick={onRetry}
          >
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}

// ControlsPanel has been replaced by BottomControlBar
// The old right-side controls panel is removed to provide more 3D view space

/**
 * Info panel component
 */
function InfoPanel({
  openDriveData,
  openScenarioData,
  visible
}: {
  openDriveData: ParsedOpenDrive | null;
  openScenarioData: ParsedOpenScenario | null;
  visible: boolean;
}) {
  if (!visible) return null;
  
  return (
    <div className="absolute bottom-4 left-4 z-20 bg-white rounded-lg shadow-lg p-3 border max-w-sm">
      <h5 className="text-sm font-semibold mb-2 flex items-center">
        <Info className="w-4 h-4 mr-1" />
        Scene Information
      </h5>
      
      <div className="text-xs space-y-1">
        {openDriveData && (
          <div>
            <strong>Roads:</strong> {openDriveData.roads?.length || 0}
            <br />
            <strong>Junctions:</strong> {openDriveData.junctions?.length || 0}
          </div>
        )}
        
        {openScenarioData && (
          <div>
            <strong>Entities:</strong> {openScenarioData.entities?.length || 0}
            <br />
            <strong>Events:</strong> {openScenarioData.timeline?.length || 0}
            <br />
            <strong>Duration:</strong> {openScenarioData.duration?.toFixed(1)}s
          </div>
        )}
        
        <div className="pt-2 border-t">
          <div className="text-xs text-gray-500">
            Professional 3D visualization powered by Three.js
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Scene content component (inside Canvas)
 */
function SceneContent({
  state,
  openDriveData,
  openScenarioData,
  validationResults,
  onStateChange,
  scenarioFiles,
  performanceMode,
  currentTime
}: {
  state: Visualization3DState;
  openDriveData: ParsedOpenDrive | null;
  openScenarioData: ParsedOpenScenario | null;
  validationResults?: Record<string, any>;
  onStateChange: (updates: Partial<Visualization3DState>) => void;
  scenarioFiles: Record<string, string>;
  performanceMode?: boolean;
  currentTime: number;
}) {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  
  // Performance monitoring with reduced frequency
  useFrame(() => {
    frameCount.current++;
    
    // Update performance stats less frequently to reduce overhead
    if (frameCount.current % 120 === 0) { // Every 2 seconds instead of 1
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime.current;
      const fps = Math.round(120000 / deltaTime); // Adjust calculation for 120 frames
      
      // Only update if there's a significant change
      if (Math.abs(fps - (state.frameRate || 60)) > 5) {
        onStateChange({ 
          frameRate: fps,
          renderTime: deltaTime / 120
        });
      }
      
      lastTime.current = currentTime;
    }
  });
  
  // Generate vehicles from scenario data with event-driven state
  const vehicles = useMemo((): VehicleElement[] => {
    if (Object.keys(scenarioFiles).length === 0) return [];
    
    try {
      // Use DataAdapter to get vehicles
      const adaptedData = DataAdapter.adaptScenarioData(scenarioFiles, validationResults);
      
      // If we have event processor and vehicle state manager, use enhanced vehicles
      if (state.eventProcessor && state.vehicleStateManager) {
        // Process events at current time
        const eventResult = state.eventProcessor.processEventsAtTime(currentTime, adaptedData.vehicles);
        
        // Apply state updates
        state.vehicleStateManager.applyStateUpdates(eventResult.vehicleStateUpdates, currentTime);
        
        // Update vehicle states
        state.vehicleStateManager.updateVehicleStates(currentTime);
        
        // Return enhanced vehicles
        return state.vehicleStateManager.convertAllToVehicleElements();
      }
      
      return adaptedData.vehicles;
    } catch (error) {
      console.warn('Failed to generate vehicles:', error);
      return [];
    }
  }, [scenarioFiles, validationResults, state.eventProcessor, state.vehicleStateManager, currentTime]);
  
  // Enhanced lighting system
  const lighting = useMemo(() => {
    return LightingUtils.createSceneLighting();
  }, []);

  return (
    <>
      {/* Enhanced Lighting System */}
      <primitive object={lighting.ambientLight} />
      <primitive object={lighting.directionalLight} />
      <primitive object={lighting.hemisphereLight} />
      {lighting.pointLights.map((light, index) => (
        <primitive key={`point-light-${index}`} object={light} />
      ))}
      
      {/* Fog for atmospheric effect */}
      <fog attach="fog" args={[0xcccccc, 50, 500]} />
      
      {/* Camera controls */}
      <CameraController
        enabled={true}
        autoRotate={state.autoRotate}
        autoRotateSpeed={1.0}
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        minDistance={1}
        maxDistance={1000}
        maxPolarAngle={Math.PI / 2}
        target={openDriveData?.boundingBox ? 
          openDriveData.boundingBox.min.clone().add(openDriveData.boundingBox.max).multiplyScalar(0.5) :
          undefined
        }
      />
      
      {/* Road network */}
      {state.showRoadNetwork && openDriveData && (
        <RoadNetworkRenderer
          openDriveData={openDriveData}
          showLaneMarkings={true}
          showJunctions={true}
          qualityLevel="medium"
          visible={true}
        />
      )}
      
      {/* Vehicles */}
      {state.showVehicles && vehicles.length > 0 && (
        <VehicleRenderer
          vehicles={vehicles}
          timeline={openScenarioData?.timeline || []}
          currentTime={currentTime}
          showTrajectories={state.showTrajectories}
          showVehicleLabels={state.showVehicleLabels}
          playbackSpeed={1.0}
          visible={true}
          performanceMode={performanceMode}
        />
      )}
      
      {/* Validation overlay */}
      {state.showValidationHighlights && validationResults && (
        <ValidationOverlay
          validationResults={validationResults}
          visible={true}
          highlightIntensity={1.0}
          blinkingEnabled={true}
          performanceMode={performanceMode}
        />
      )}
      
      {/* Ground plane - 水平地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.1]} receiveShadow>
        <planeGeometry args={[1000, 1000]} />
        <meshLambertMaterial color={0x90EE90} transparent opacity={0.3} />
      </mesh>
      
      {/* Debug helpers (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <gridHelper args={[100, 20]} />
          <CoordinateAxes size={10} />
        </>
      )}
    </>
  );
}

/**
 * Main Visualization3D component
 */
export const Visualization3D: React.FC<Visualization3DProps> = ({
  scenarioFiles = {},
  validationResults = {},
  visualizationMetadata,
  className = '',
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Component state
  const [state, setState] = useState<Visualization3DState>({
    isLoading: true,
    error: null,
    isInitialized: false,
    
    openDriveData: null,
    openScenarioData: null,
    
    showRoadNetwork: true,
    showVehicles: true,
    showValidationHighlights: true,
    showVehicleLabels: false,
    showTrajectories: true,
    
    autoRotate: false,
    
    // Initialize event processing state
    scenarioEvents: [],
    eventProcessor: null,
    vehicleStateManager: null,
  });

  // Calculate timeline duration based on scenario data
  const timelineDuration = useMemo(() => {
    return state.openScenarioData?.duration || Math.max(30, (state.openScenarioData?.timeline?.length || 0) * 2);
  }, [state.openScenarioData]);

  // Initialize timeline synchronization
  const timelineSync = useTimelineSync(
    timelineDuration,
    (state.openScenarioData?.timeline || []).map(event => ({
      time: event.timestamp || 0,
      type: event.type || 'unknown',
      data: event
    })),
    (event) => {
      console.log('Timeline event triggered:', event);
      // Handle timeline events here
    }
  );
  
  // Additional state for info panel
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  
  // Performance mode state
  const [performanceMode, setPerformanceMode] = useState(true); // Default to performance mode
  
  // Update state helper
  const updateState = (updates: Partial<Visualization3DState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };
  
  // Parse scenario files using DataAdapter
  useEffect(() => {
    const parseFiles = async () => {
      try {
        console.log('🔄 Starting 3D visualization initialization...');
        console.log('📁 Scenario files:', Object.keys(scenarioFiles));
        console.log('🔍 Validation results:', validationResults);
        
        updateState({ isLoading: true, error: null });
        
        let openDriveData: ParsedOpenDrive | null = null;
        let openScenarioData: ParsedOpenScenario | null = null;
        
        if (Object.keys(scenarioFiles).length > 0) {
          console.log('📊 Using DataAdapter for initial conversion...');
          
          // Use DataAdapter for initial conversion with enhanced error handling
          try {
            const adaptedData = DataAdapter.adaptScenarioData(scenarioFiles, validationResults);
            openDriveData = adaptedData.openDriveData;
            openScenarioData = adaptedData.openScenarioData;
            console.log('✅ DataAdapter conversion successful');
            console.log('🛣️ OpenDRIVE data:', openDriveData);
            console.log('🎬 OpenSCENARIO data:', openScenarioData);
          } catch (adapterError: any) {
            console.error('❌ DataAdapter failed:', adapterError);
            // Continue with null data - we'll create a basic scene
          }
          
          // Try advanced parsing if available
          try {
            for (const [filename, content] of Object.entries(scenarioFiles)) {
              if (filename.endsWith('.xodr') && !openDriveData) {
                console.log('🔧 Advanced parsing OpenDRIVE file:', filename);
                const parser = new OpenDriveParser();
                openDriveData = await parser.parseFromXML(content);
              }
              if (filename.endsWith('.xosc') && !openScenarioData) {
                console.log('🔧 Advanced parsing OpenSCENARIO file:', filename);
                const parser = new OpenScenarioParser();
                openScenarioData = await parser.parseFromXML(content);
              }
            }
          } catch (advancedError) {
            console.warn('⚠️ Advanced parsing failed, using basic adapter:', advancedError);
            // Fall back to adapter data
          }
        }
        
        console.log('🎯 Final parsed data:');
        console.log('  - OpenDRIVE:', openDriveData ? 'Available' : 'None');
        console.log('  - OpenSCENARIO:', openScenarioData ? 'Available' : 'None');
        
        // Initialize event processing system
        let scenarioEvents: ScenarioEvent[] = [];
        let eventProcessor: EventProcessor | null = null;
        let vehicleStateManager: VehicleStateManager | null = null;
        
        if (openScenarioData) {
          try {
            console.log('🎯 Initializing event processing system...');
            
            // Generate scenario events from parsed data
            const parser = new OpenScenarioParser();
            scenarioEvents = parser.generateScenarioEvents(openScenarioData.storyboard);
            
            console.log(`📅 Generated ${scenarioEvents.length} scenario events`);
            
            // Initialize event processor
            eventProcessor = new EventProcessor(scenarioEvents);
            
            // Initialize vehicle state manager
            vehicleStateManager = new VehicleStateManager();
            
            // Get initial vehicles for state manager
            const adaptedData = DataAdapter.adaptScenarioData(scenarioFiles, validationResults);
            vehicleStateManager.initializeVehicles(adaptedData.vehicles);
            
            console.log('✅ Event processing system initialized successfully');
          } catch (eventError) {
            console.warn('⚠️ Event processing system initialization failed:', eventError);
            // Continue without event processing
          }
        }
        
        // Update state with parsed data
        updateState({
          isLoading: false,
          isInitialized: true,
          openDriveData,
          openScenarioData,
          scenarioEvents,
          eventProcessor,
          vehicleStateManager,
          error: null // Always allow initialization, even with no data
        });
        
        console.log('✅ 3D visualization initialization complete');
        
      } catch (error: any) {
        console.error('❌ Critical file parsing error:', error);
        console.error('Stack trace:', error.stack);
        
        // Instead of showing error, initialize with empty scene
        updateState({
          isLoading: false,
          isInitialized: true,
          openDriveData: null,
          openScenarioData: null,
          scenarioEvents: [],
          eventProcessor: null,
          vehicleStateManager: null,
          error: null // Don't show error, just log it
        });
        
        console.log('🔄 Initialized with empty scene due to parsing error');
      }
    };
    
    // Use setTimeout to ensure this runs in the next tick and doesn't block rendering
    setTimeout(() => {
      if (Object.keys(scenarioFiles).length > 0) {
        parseFiles();
      } else {
        console.log('📭 No scenario files provided, initializing empty scene');
        // No files provided - show empty scene with basic setup
        updateState({
          isLoading: false,
          isInitialized: true,
          openDriveData: null,
          openScenarioData: null,
          scenarioEvents: [],
          eventProcessor: null,
          vehicleStateManager: null,
          error: null
        });
      }
    }, 0);
  }, [scenarioFiles, validationResults, onError]);
  
  // Timeline handlers using the new sync hook
  const handleTimeChange = (time: number) => {
    timelineSync.controls.seekTo(time);
  };
  
  const handlePlayPause = (playing: boolean) => {
    if (playing) {
      timelineSync.controls.play();
    } else {
      timelineSync.controls.pause();
    }
  };
  
  const handleSpeedChange = (speed: number) => {
    timelineSync.controls.setPlaybackSpeed(speed);
  };
  
  const handleReset = () => {
    timelineSync.controls.reset();
  };
  
  // Show error state
  if (state.error) {
    return (
      <div className={`visualization-3d ${className}`} style={{ width: '100%', height: '100%', minHeight: '400px' }}>
        <VisualizationErrorFallback 
          error={state.error}
          onRetry={() => updateState({ error: null, isLoading: true })}
        />
      </div>
    );
  }
  
  return (
    <div 
      ref={containerRef}
      className={`visualization-3d relative ${className}`}
      style={{ width: '100%', height: '100%', minHeight: '400px' }}
    >
      {/* Loading overlay */}
      {state.isLoading && (
        <LoadingOverlay 
          message="Initializing 3D visualization..." 
          progress={0}
        />
      )}
      
      {/* 3D Canvas */}
      <ThreeJSErrorBoundary 
        fallback={
          <VisualizationErrorFallback 
            error="3D rendering failed"
            onRetry={() => updateState({ error: null, isLoading: true })}
          />
        }
      >
        <ErrorBoundary 
          onError={(error) => {
            console.error('3D Canvas error:', error);
            updateState({ error: `3D rendering error: ${error.message}` });
          }}
        >
          <Suspense fallback={<LoadingOverlay message="Loading 3D scene..." />}>
            <Canvas
              shadows={!performanceMode}
              camera={{ 
                position: [20, 20, 20], 
                fov: 75,
                near: 0.1,
                far: 1000
              }}
              gl={{ 
                antialias: !performanceMode,
                alpha: true,
                powerPreference: 'high-performance',
                pixelRatio: performanceMode ? 1 : Math.min(window.devicePixelRatio, 1.5)
              }}
              style={{ 
                background: 'linear-gradient(to bottom, #87CEEB 0%, #98FB98 100%)' 
              }}
            >
              <SceneContent
                state={state}
                openDriveData={state.openDriveData}
                openScenarioData={state.openScenarioData}
                validationResults={validationResults}
                onStateChange={updateState}
                scenarioFiles={scenarioFiles}
                performanceMode={performanceMode}
                currentTime={timelineSync.state.currentTime}
              />
            </Canvas>
          </Suspense>
        </ErrorBoundary>
      </ThreeJSErrorBoundary>
      
      {/* Bottom Control Bar */}
       {state.isInitialized && (
         <BottomControlBar
           // Playback controls
           isPlaying={timelineSync.state.isPlaying}
           currentTime={timelineSync.state.currentTime}
           duration={timelineSync.state.duration}
           playbackSpeed={timelineSync.state.playbackSpeed}
           onPlayPause={handlePlayPause}
           onReset={handleReset}
           onTimeChange={handleTimeChange}
           onSpeedChange={handleSpeedChange}
           
           // View controls
           showValidationHighlights={state.showValidationHighlights}
           showVehicleLabels={state.showVehicleLabels}
           autoRotate={state.autoRotate}
           onToggleValidation={() => updateState({ showValidationHighlights: !state.showValidationHighlights })}
           onToggleLabels={() => updateState({ showVehicleLabels: !state.showVehicleLabels })}
           onToggleRotation={() => updateState({ autoRotate: !state.autoRotate })}
           
           // Performance monitoring
           frameRate={timelineSync.state.frameRate}
           renderTime={timelineSync.state.renderTime}
           performanceMode={performanceMode}
           onTogglePerformanceMode={() => setPerformanceMode(!performanceMode)}
           
           // Timeline data
           timeline={state.openScenarioData?.timeline as any}
           scenarioEvents={state.eventProcessor?.getEventsForVisualization(timelineSync.state.duration)}
           
           // Other controls
           showInfoPanel={showInfoPanel}
           onToggleInfoPanel={() => setShowInfoPanel(!showInfoPanel)}
         />
       )}
      
      {/* Info panel */}
      <InfoPanel
        openDriveData={state.openDriveData}
        openScenarioData={state.openScenarioData}
        visible={showInfoPanel}
      />
    </div>
  );
};

export default Visualization3D;