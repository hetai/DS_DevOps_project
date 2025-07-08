/**
 * Main 3D visualization component for OpenSCENARIO scenarios
 * Integrates road network, vehicles, and validation highlights
 */

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';

interface VisualizationData {
  session_id: string;
  road_network?: {
    roads: Array<{
      id: string;
      name: string;
      length: number;
      junction: string;
    }>;
    junctions: Array<{
      id: string;
      name: string;
    }>;
    bounds: {
      min_x: number;
      max_x: number;
      min_y: number;
      max_y: number;
    };
  };
  scenario_data?: {
    entities: Array<{
      name: string;
      type: string;
      category?: string;
    }>;
    events: Array<{
      name: string;
      priority: string;
    }>;
    initial_conditions: Array<any>;
  };
  validation_highlights?: Array<{
    type: string;
    message: string;
    file: string;
    line?: number;
    xpath?: string;
  }>;
  scenario_files?: Record<string, string>;
  validation_results?: Record<string, any>;
  error_message?: string;
  error_step?: string;
}

interface ScenarioVisualization3DProps {
  data: VisualizationData | null;
  showMetrics?: boolean;
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2" />
        <p className="text-sm text-gray-600">Loading 3D Scene...</p>
      </div>
    </div>
  );
}

// Error boundary component for Three.js
class ThreeJSErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
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

// Enhanced error fallback component
function VisualizationErrorFallback({ data }: { data: VisualizationData }) {
  return (
    <div className="flex items-center justify-center h-full bg-red-50 rounded-lg border border-red-200">
      <div className="text-center text-red-700 p-6">
        <div className="mb-4">
          <svg className="w-12 h-12 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="font-semibold mb-2">3D Visualization Failed</p>
        <p className="text-sm mb-2">{data.error_message || 'Unknown error occurred'}</p>
        {data.error_step && (
          <p className="text-xs text-red-500">Error in step: {data.error_step}</p>
        )}
        <div className="mt-4 p-3 bg-white rounded border text-xs text-gray-600">
          <p className="font-medium text-gray-800 mb-1">Debug Info:</p>
          <div className="space-y-1">
            <div>Session: {data.session_id}</div>
            <div>Roads: {data.road_network?.roads?.length || 0}</div>
            <div>Vehicles: {data.scenario_data?.entities?.length || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ScenarioVisualization3D: React.FC<ScenarioVisualization3DProps> = ({ 
  data, 
  showMetrics = false 
}) => {
  // Loading state
  if (!data) {
    return (
      <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
        <LoadingFallback />
      </div>
    );
  }

  // Error state
  if (data.error_message) {
    return (
      <div className="relative w-full h-96 rounded-lg overflow-hidden">
        <VisualizationErrorFallback data={data} />
      </div>
    );
  }

  return (
    <div className="relative w-full h-96 bg-gray-900 rounded-lg overflow-hidden">
      {/* Performance metrics overlay */}
      {showMetrics && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-2 rounded text-xs z-10">
          <div>Session: {data.session_id}</div>
          <div>Roads: {data.road_network?.roads?.length || 0}</div>
          <div>Vehicles: {data.scenario_data?.entities?.length || 0}</div>
          <div>Validation Issues: {data.validation_highlights?.length || 0}</div>
        </div>
      )}

      {/* 3D Canvas with Error Boundary */}
      <ThreeJSErrorBoundary 
        fallback={<VisualizationErrorFallback data={data} />}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Canvas camera={{ position: [50, 50, 50], fov: 60 }}>
            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 10, 5]} intensity={1} />

            {/* Environment */}
            <Environment preset="city" />

            {/* Camera Controls */}
            <OrbitControls enablePan enableZoom enableRotate />

            {/* Road Network - TODO: Implement or replace with basic geometry */}
            {data.road_network && (
              <group>
                {/* Placeholder for road network - replace with actual implementation */}
                <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[100, 100]} />
                  <meshStandardMaterial color="#666666" />
                </mesh>
              </group>
            )}

            {/* Vehicles - TODO: Implement or replace with basic geometry */}
            {data.scenario_data && data.scenario_data.entities && (
              <group>
                {data.scenario_data.entities.map((entity, index) => (
                  <mesh key={index} position={[index * 5, 1, 0]}>
                    <boxGeometry args={[4, 1.5, 2]} />
                    <meshStandardMaterial color={entity.type === 'vehicle' ? '#ff4444' : '#4444ff'} />
                  </mesh>
                ))}
              </group>
            )}

            {/* Validation Highlights - TODO: Implement visual indicators */}
            {data.validation_highlights && data.validation_highlights.length > 0 && (
              <group>
                {data.validation_highlights.map((highlight, index) => (
                  <mesh key={index} position={[index * 2 - 10, 3, 0]}>
                    <sphereGeometry args={[0.5]} />
                    <meshStandardMaterial 
                      color={highlight.type === 'error' ? '#ff0000' : '#ffaa00'} 
                      emissive={highlight.type === 'error' ? '#440000' : '#442200'}
                    />
                  </mesh>
                ))}
              </group>
            )}
          </Canvas>
        </Suspense>
      </ThreeJSErrorBoundary>
    </div>
  );
};