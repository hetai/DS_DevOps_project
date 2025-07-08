/**
 * Debug Test Page - Basic React rendering test
 */

import React from 'react';

export default function DebugTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Debug Test Page</h1>
        
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Basic React Test</h2>
          <p className="text-gray-600 mb-4">
            If you can see this page, React routing and basic rendering are working correctly.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Tailwind CSS</h3>
              <p className="text-blue-700 text-sm">Styling is working if this box appears blue.</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">Component Rendering</h3>
              <p className="text-green-700 text-sm">React components are rendering correctly.</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Navigation Test</h2>
          <div className="space-y-2">
            <a 
              href="/simple-3d-test" 
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Go to Simple 3D Test
            </a>
            <br />
            <a 
              href="/" 
              className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Go to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}