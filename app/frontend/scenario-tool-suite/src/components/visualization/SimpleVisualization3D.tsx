/**
 * Simplified Visualization3D - Basic 3D visualization with Three.js
 */

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Box, Plane } from '@react-three/drei';
import * as THREE from 'three';

interface SimpleVisualization3DProps {
  scenarioFiles?: Record<string, string>;
  validationResults?: Record<string, any>;
  className?: string;
}

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

// Basic 3D scene with Three.js
function Basic3DScene({ scenarioFiles }: { scenarioFiles?: Record<string, string> }) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      {/* Ground plane */}
      <Plane 
        args={[50, 50]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.1, 0]}
      >
        <meshStandardMaterial color="#90EE90" />
      </Plane>
      
      {/* Road surface */}
      <Plane 
        args={[30, 4]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]}
      >
        <meshStandardMaterial color="#666666" />
      </Plane>
      
      {/* Lane markings */}
      <Box args={[20, 0.01, 0.1]} position={[0, 0.01, 0]}>
        <meshStandardMaterial color="white" />
      </Box>
      
      {/* Sample vehicle */}
      <Box args={[4, 1.5, 2]} position={[0, 0.75, 0]}>
        <meshStandardMaterial color="#ff4444" />
      </Box>
      
      {/* Grid helper */}
      <Grid 
        args={[50, 50]} 
        cellSize={1} 
        cellThickness={0.5} 
        cellColor="#6f6f6f" 
        sectionSize={5} 
        sectionThickness={1} 
        sectionColor="#9d4b4b" 
        fadeDistance={30} 
        fadeStrength={1} 
        followCamera={false} 
        infiniteGrid={true}
      />
      
      {/* Camera controls */}
      <OrbitControls 
        enablePan={true} 
        enableZoom={true} 
        enableRotate={true} 
        maxPolarAngle={Math.PI / 2.2}
      />
    </>
  );
}

// Fallback component for error cases
function Simple3DFallback({ scenarioFiles }: { scenarioFiles?: Record<string, string> }) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-blue-200 to-green-200 flex items-center justify-center">
      <div className="text-center p-8">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold mb-4">3D Scene Fallback</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>Three.js failed to load</p>
            <p>Files loaded: {Object.keys(scenarioFiles || {}).length}</p>
            <div className="mt-4 p-3 bg-gray-100 rounded">
              <p className="font-medium">Expected Elements:</p>
              <ul className="text-xs mt-2 space-y-1">
                <li>• Ground plane (green)</li>
                <li>• Road surface (gray)</li>
                <li>• Lane markings (white)</li>
                <li>• Vehicle model (red)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Error boundary component
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
    console.error('Three.js Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default function SimpleVisualization3D({ 
  scenarioFiles, 
  validationResults, 
  className 
}: SimpleVisualization3DProps) {
  return (
    <div className={`w-full h-full relative ${className || ''}`}>
      <ThreeJSErrorBoundary 
        fallback={<Simple3DFallback scenarioFiles={scenarioFiles} />}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Canvas
            camera={{ position: [10, 8, 10], fov: 60 }}
            style={{ background: 'linear-gradient(to bottom, #87CEEB 0%, #98FB98 100%)' }}
          >
            <Basic3DScene scenarioFiles={scenarioFiles} />
          </Canvas>
        </Suspense>
      </ThreeJSErrorBoundary>
      
      {/* Info overlay */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 border text-xs">
        <h5 className="font-semibold mb-1">Simple 3D View</h5>
        <div className="space-y-1">
          <div>Files: {Object.keys(scenarioFiles || {}).length}</div>
          <div>Status: <span className="text-green-600">Active</span></div>
          <div>Mode: <span className="text-blue-600">Three.js</span></div>
        </div>
      </div>
    </div>
  );
}