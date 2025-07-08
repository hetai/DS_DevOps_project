/**
 * Simple 3D Test - Basic Three.js scene to diagnose rendering issues
 */

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function BasicScene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      {/* Basic geometries */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color={0xff6b6b} />
      </mesh>
      
      <mesh position={[4, 0, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color={0x4ecdc4} />
      </mesh>
      
      <mesh position={[-4, 0, 0]}>
        <cylinderGeometry args={[1, 1, 2, 32]} />
        <meshStandardMaterial color={0x45b7d1} />
      </mesh>
      
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color={0x90EE90} />
      </mesh>
      
      {/* Grid helper */}
      <gridHelper args={[20, 20]} position={[0, -1.9, 0]} />
      
      {/* Axes helper */}
      <axesHelper args={[5]} />
      
      {/* Camera controls */}
      <OrbitControls enablePan enableZoom enableRotate />
    </>
  );
}

export default function Simple3DTest() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <h2 style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, color: 'black' }}>
        Simple 3D Test
      </h2>
      
      <Canvas
        camera={{ position: [5, 5, 5], fov: 75 }}
        style={{ background: 'linear-gradient(to bottom, #87CEEB 0%, #98FB98 100%)' }}
      >
        <BasicScene />
      </Canvas>
    </div>
  );
}