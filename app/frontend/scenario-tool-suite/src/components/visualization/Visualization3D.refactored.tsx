/**
 * Refactored Visualization3D - Pure React Three Fiber implementation
 * Uses Web Worker for data parsing and Zustand for state management
 */

import React, { useEffect, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stats } from '@react-three/drei';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Eye, 
  EyeOff,
  Info
} from 'lucide-react';

// Import our stores and hooks
import { useScenarioData } from '../../hooks/useScenarioData';
import { 
  useVisualizationStore,
  useVisualizationData,
  usePlaybackState,
  useViewState,
  usePerformanceMetrics,
  useVisualizationActions
} from '../../stores/visualizationStore';

// Import renderer components
import RoadNetworkRenderer from './renderers/RoadNetworkRenderer';
import VehicleRenderer from './renderers/VehicleRenderer';
import ValidationOverlay from './renderers/ValidationOverlay';
import TimelineController from './controls/TimelineController';

// Import types
import { Visualization3DProps } from './types/VisualizationTypes';

/**
 * Loading component
 */
function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-10">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}

/**
 * Error Fallback Component
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

/**
 * Controls panel component
 */
function ControlsPanel() {
  const { isPlaying, currentTime, duration } = usePlaybackState();
  const { showValidationIssues } = useViewState();
  const { 
    play, 
    pause, 
    stop, 
    toggleValidationIssues 
  } = useVisualizationActions();

  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col space-y-2">
      {/* Playback controls */}
      <div className="bg-white rounded-lg shadow-lg p-3 border">
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={isPlaying ? pause : play}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={stop}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          
          <div className="text-xs text-gray-600">
            {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
          </div>
        </div>
      </div>
      
      {/* View controls */}
      <div className="bg-white rounded-lg shadow-lg p-3 border">
        <div className="flex flex-col space-y-2">
          <Button
            size="sm"
            variant="outline"
            onClick={toggleValidationIssues}
            className="justify-start"
          >
            {showValidationIssues ? (
              <><EyeOff className="w-4 h-4 mr-1" /> Hide Validation</>
            ) : (
              <><Eye className="w-4 h-4 mr-1" /> Show Validation</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Info panel component
 */
function InfoPanel() {
  const { openDriveData, openScenarioData } = useVisualizationData();
  
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
            Professional 3D visualization powered by React Three Fiber
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Performance monitor component
 */
function PerformanceMonitor() {
  const { updatePerformance } = useVisualizationActions();
  const { fps, renderTime } = usePerformanceMetrics();
  
  useFrame((state, delta) => {
    // Update performance metrics every 60 frames
    if (Math.floor(state.clock.elapsedTime * 60) % 60 === 0) {
      updatePerformance(
        Math.round(1 / delta),
        delta * 1000
      );
    }
  });

  return (
    <div className="absolute top-4 left-4 z-20 bg-white rounded-lg shadow-lg p-2 border text-xs">
      <div className="space-y-1">
        <div><strong>FPS:</strong> {fps}</div>
        <div><strong>Render:</strong> {renderTime.toFixed(1)}ms</div>
      </div>
    </div>
  );
}

/**
 * Scene content component (inside Canvas)
 */
function SceneContent() {
  const { 
    vehicles, 
    timeline, 
    openDriveData, 
    openScenarioData, 
    validationIssues 
  } = useVisualizationData();
  
  const { 
    showVehicles, 
    showRoads, 
    showValidationIssues 
  } = useViewState();
  
  const { currentTime, playbackSpeed } = usePlaybackState();
  
  // Calculate camera target based on bounding box
  const cameraTarget = useMemo(() => {
    if (openDriveData?.boundingBox) {
      const { min, max } = openDriveData.boundingBox;
      return min.clone().add(max).multiplyScalar(0.5);
    }
    return [0, 0, 0];
  }, [openDriveData]);
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[50, 50, 50]} 
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <hemisphereLight 
        color="#87CEEB"
        groundColor="#362d1d"
        intensity={0.3}
      />
      
      {/* Camera controls */}
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        minDistance={1}
        maxDistance={1000}
        maxPolarAngle={Math.PI / 2}
        target={cameraTarget}
      />
      
      {/* Road network */}
      {showRoads && openDriveData && (
        <RoadNetworkRenderer
          openDriveData={openDriveData}
          showLaneMarkings={true}
          showJunctions={true}
          qualityLevel="medium"
          visible={true}
        />
      )}
      
      {/* Vehicles */}
      {showVehicles && vehicles.length > 0 && (
        <VehicleRenderer
          vehicles={vehicles}
          timeline={timeline}
          currentTime={currentTime}
          showTrajectories={true}
          showVehicleLabels={false}
          playbackSpeed={playbackSpeed}
          visible={true}
        />
      )}
      
      {/* Validation overlay */}
      {showValidationIssues && validationIssues.length > 0 && (
        <ValidationOverlay
          validationResults={{ issues: validationIssues }}
          visible={true}
          highlightIntensity={1.0}
          blinkingEnabled={true}
        />
      )}
      
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.1]} receiveShadow>
        <planeGeometry args={[1000, 1000]} />
        <meshLambertMaterial color="#90EE90" transparent opacity={0.3} />
      </mesh>
      
      {/* Performance monitor */}
      <PerformanceMonitor />
      
      {/* Debug helpers (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <gridHelper args={[100, 20]} />
          <axesHelper args={[10]} />
          <Stats />
        </>
      )}
    </>
  );
}

/**
 * Timeline wrapper component
 */
function TimelineWrapper() {
  const { timeline } = useVisualizationData();
  const { currentTime, isPlaying, playbackSpeed, duration } = usePlaybackState();
  const { setCurrentTime, play, pause, setPlaybackSpeed } = useVisualizationActions();
  
  if (!timeline.length) return null;
  
  return (
    <div className="absolute bottom-4 right-4 w-96 z-20">
      <TimelineController
        timeline={timeline as any}
        duration={duration}
        currentTime={currentTime}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        onTimeChange={setCurrentTime}
        onPlayPause={isPlaying ? pause : play}
        onSpeedChange={setPlaybackSpeed}
      />
    </div>
  );
}

/**
 * Main Visualization3D component
 */
export const Visualization3D: React.FC<Visualization3DProps> = ({
  scenarioFiles = {},
  validationResults = {},
  className = '',
  onError,
}) => {
  // Use our custom hook for data parsing
  const { data, loading, error, parseData } = useScenarioData();
  
  // Get actions from store
  const { setData, setLoading, setError, reset } = useVisualizationActions();
  
  // Parse data when scenario files change
  useEffect(() => {
    if (Object.keys(scenarioFiles).length > 0) {
      parseData(scenarioFiles, validationResults);
    } else {
      reset();
    }
  }, [scenarioFiles, validationResults, parseData, reset]);
  
  // Update store when data changes
  useEffect(() => {
    if (data) {
      setData(data);
    }
  }, [data, setData]);
  
  // Update store with loading state
  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);
  
  // Update store with error state
  useEffect(() => {
    if (error) {
      setError(error);
      onError?.(error);
    }
  }, [error, setError, onError]);
  
  // Show error state
  if (error) {
    return (
      <div className={`visualization-3d ${className}`} style={{ width: '100%', height: '100%', minHeight: '400px' }}>
        <VisualizationErrorFallback 
          error={error}
          onRetry={() => {
            setError(null);
            if (Object.keys(scenarioFiles).length > 0) {
              parseData(scenarioFiles, validationResults);
            }
          }}
        />
      </div>
    );
  }
  
  return (
    <div 
      className={`visualization-3d relative ${className}`}
      style={{ width: '100%', height: '100%', minHeight: '400px' }}
    >
      {/* Loading overlay */}
      {loading && (
        <LoadingOverlay message="Processing scenario data..." />
      )}
      
      {/* 3D Canvas */}
      <ErrorBoundary 
        onError={(error) => {
          console.error('3D Canvas error:', error);
          setError(`3D rendering error: ${error.message}`);
        }}
      >
        <Suspense fallback={<LoadingOverlay message="Loading 3D scene..." />}>
          <Canvas
            shadows
            camera={{ 
              position: [20, 20, 20], 
              fov: 75,
              near: 0.1,
              far: 1000
            }}
            gl={{ 
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance'
            }}
            style={{ 
              background: 'linear-gradient(to bottom, #87CEEB 0%, #98FB98 100%)' 
            }}
          >
            <SceneContent />
          </Canvas>
        </Suspense>
      </ErrorBoundary>
      
      {/* UI Overlays */}
      {!loading && !error && (
        <>
          <ControlsPanel />
          <InfoPanel />
          <TimelineWrapper />
        </>
      )}
    </div>
  );
};

export default Visualization3D;