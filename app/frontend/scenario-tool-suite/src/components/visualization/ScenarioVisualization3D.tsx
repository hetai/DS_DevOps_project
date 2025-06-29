/**
 * Main 3D visualization component for OpenSCENARIO scenarios
 * Integrates road network, vehicles, and validation highlights
 */

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { RoadNetworkRenderer } from './RoadNetworkRenderer';
import { VehicleRenderer } from './VehicleRenderer';
import { ValidationHighlights } from './ValidationHighlights';

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

export const ScenarioVisualization3D: React.FC<ScenarioVisualization3DProps> = ({ 
  data, 
  showMetrics = false 
}) => {
  // Loading state
  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading 3D visualization...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (data.error_message) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 rounded-lg border border-red-200">
        <div className="text-center text-red-700">
          <p className="font-semibold">Visualization Failed</p>
          <p className="text-sm mt-1">{data.error_message}</p>
          {data.error_step && (
            <p className="text-xs mt-1 text-red-500">Error in step: {data.error_step}</p>
          )}
        </div>
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

      {/* 3D Canvas */}
      <Canvas camera={{ position: [50, 50, 50], fov: 60 }}>
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        {/* Environment */}
        <Environment preset="city" />

        {/* Camera Controls */}
        <OrbitControls enablePan enableZoom enableRotate />

        {/* Road Network */}
        {data.road_network && (
          <RoadNetworkRenderer roadData={data.road_network} showLabels={true} />
        )}

        {/* Vehicles */}
        {data.scenario_data && (
          <VehicleRenderer scenarios={data.scenario_data} animate={false} />
        )}

        {/* Validation Highlights */}
        {data.validation_highlights && data.validation_highlights.length > 0 && (
          <ValidationHighlights highlights={data.validation_highlights} />
        )}
      </Canvas>
    </div>
  );
};