/**
 * 3D Coordinate Axes Component - Replaces the flat axesHelper with proper 3D coordinate axes
 */
import React, { useMemo } from 'react';
import * as THREE from 'three';

interface CoordinateAxesProps {
  size?: number;
  lineWidth?: number;
  showLabels?: boolean;
}

export default function CoordinateAxes({ 
  size = 10, 
  lineWidth = 0.1,
  showLabels = true 
}: CoordinateAxesProps) {
  
  // Create cylinder geometries for the axes
  const axisGeometry = useMemo(() => {
    return new THREE.CylinderGeometry(lineWidth, lineWidth, size, 8);
  }, [size, lineWidth]);
  
  // Create cone geometries for arrow heads
  const arrowHeadGeometry = useMemo(() => {
    return new THREE.ConeGeometry(lineWidth * 3, lineWidth * 6, 8);
  }, [lineWidth]);
  
  // Materials for each axis
  const xAxisMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xff0000 }), []); // Red for X
  const yAxisMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x00ff00 }), []); // Green for Y
  const zAxisMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x0000ff }), []); // Blue for Z
  
  return (
    <group name="coordinate-axes">
      {/* X-axis (Red) */}
      <group>
        {/* X-axis cylinder */}
        <mesh 
          position={[size / 2, 0, 0]} 
          rotation={[0, 0, -Math.PI / 2]}
          geometry={axisGeometry}
          material={xAxisMaterial}
        />
        {/* X-axis arrow head */}
        <mesh 
          position={[size, 0, 0]} 
          rotation={[0, 0, -Math.PI / 2]}
          geometry={arrowHeadGeometry}
          material={xAxisMaterial}
        />
        {/* X-axis label - temporarily disabled due to textGeometry issues */}
        {/* {showLabels && (
          <mesh position={[size + 1, 0, 0]}>
            <textGeometry args={['X', { font: undefined, size: 0.5, height: 0.1 }]} />
            <meshBasicMaterial color={0xff0000} />
          </mesh>
        )} */}
      </group>
      
      {/* Y-axis (Green) */}
      <group>
        {/* Y-axis cylinder */}
        <mesh 
          position={[0, size / 2, 0]} 
          geometry={axisGeometry}
          material={yAxisMaterial}
        />
        {/* Y-axis arrow head */}
        <mesh 
          position={[0, size, 0]} 
          geometry={arrowHeadGeometry}
          material={yAxisMaterial}
        />
        {/* Y-axis label - temporarily disabled due to textGeometry issues */}
        {/* {showLabels && (
          <mesh position={[0, size + 1, 0]}>
            <textGeometry args={['Y', { font: undefined, size: 0.5, height: 0.1 }]} />
            <meshBasicMaterial color={0x00ff00} />
          </mesh>
        )} */}
      </group>
      
      {/* Z-axis (Blue) */}
      <group>
        {/* Z-axis cylinder */}
        <mesh 
          position={[0, 0, size / 2]} 
          rotation={[Math.PI / 2, 0, 0]}
          geometry={axisGeometry}
          material={zAxisMaterial}
        />
        {/* Z-axis arrow head */}
        <mesh 
          position={[0, 0, size]} 
          rotation={[Math.PI / 2, 0, 0]}
          geometry={arrowHeadGeometry}
          material={zAxisMaterial}
        />
        {/* Z-axis label - temporarily disabled due to textGeometry issues */}
        {/* {showLabels && (
          <mesh position={[0, 0, size + 1]}>
            <textGeometry args={['Z', { font: undefined, size: 0.5, height: 0.1 }]} />
            <meshBasicMaterial color={0x0000ff} />
          </mesh>
        )} */}
      </group>
      
      {/* Origin sphere */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[lineWidth * 2, 16, 16]} />
        <meshBasicMaterial color={0xffffff} />
      </mesh>
    </group>
  );
}