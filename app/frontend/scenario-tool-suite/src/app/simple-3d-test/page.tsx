/**
 * Simple 3D Test Page - Testing Three.js integration
 */

import React from 'react';
import SimpleVisualization3D from '@/components/visualization/SimpleVisualization3D';

export default function Simple3DTestPage() {
  const mockScenarioFiles = {
    'test.xosc': 'mock scenario content',
    'test.xodr': 'mock road network content'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Simple 3D Test</h1>
              <p className="text-sm text-gray-600">Testing Three.js integration</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Status: <span className="text-green-600 font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column - Test Status */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4">Test Status</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Files:</span>
                  <span className="text-sm font-medium">{Object.keys(mockScenarioFiles).length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Route:</span>
                  <span className="text-sm font-medium text-green-600">✓ Working</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Mode:</span>
                  <span className="text-sm font-medium text-blue-600">Three.js Test</span>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Mock Files:</h4>
                <div className="text-xs text-blue-700 space-y-1">
                  {Object.keys(mockScenarioFiles).map(filename => (
                    <div key={filename}>• {filename}</div>
                  ))}
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Controls:</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>• Mouse: Rotate view</div>
                  <div>• Scroll: Zoom in/out</div>
                  <div>• Drag: Pan camera</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - 3D Visualization */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="h-96 lg:h-[600px]">
                <SimpleVisualization3D 
                  scenarioFiles={mockScenarioFiles}
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}