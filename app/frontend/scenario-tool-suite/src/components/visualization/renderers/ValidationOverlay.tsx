/**
 * Validation Overlay - Visualizes validation issues in 3D space
 * Shows errors, warnings, and validation highlights on road networks and vehicles
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ValidationIssue } from '../types/VisualizationTypes';

interface ValidationOverlayProps {
  validationResults?: Record<string, any>;
  visible?: boolean;
  highlightIntensity?: number;
  blinkingEnabled?: boolean;
  onIssueClick?: (issue: ValidationIssue) => void;
}

interface ValidationMarkerProps {
  issue: ValidationIssue;
  intensity: number;
  blinking: boolean;
  onClick?: () => void;
}

interface ValidationHeatmapProps {
  issues: ValidationIssue[];
  visible: boolean;
}

interface ValidationSummaryProps {
  issues: ValidationIssue[];
  position: THREE.Vector3;
  visible: boolean;
}

/**
 * Individual validation marker component
 */
function ValidationMarker({ issue, intensity, blinking, onClick }: ValidationMarkerProps) {
  const markerRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const time = useRef(0);
  
  // Marker geometry based on severity
  const markerGeometry = useMemo(() => {
    switch (issue.severity) {
      case 'error':
        return new THREE.OctahedronGeometry(0.5, 0); // Diamond shape for errors
      case 'warning':
        return new THREE.ConeGeometry(0.4, 0.8, 3); // Triangle for warnings
      case 'info':
        return new THREE.SphereGeometry(0.3, 8, 6); // Sphere for info
      default:
        return new THREE.SphereGeometry(0.3, 8, 6);
    }
  }, [issue.severity]);
  
  // Marker material with color based on severity
  const markerMaterial = useMemo(() => {
    const baseColor = getSeverityColor(issue.severity);
    return new THREE.MeshLambertMaterial({
      color: baseColor,
      transparent: true,
      opacity: intensity * 0.8,
      emissive: new THREE.Color(baseColor).multiplyScalar(0.2)
    });
  }, [issue.severity, intensity]);
  
  // Outline material for better visibility
  const outlineMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: intensity * 0.4,
      side: THREE.BackSide
    });
  }, [intensity]);
  
  // Glow effect geometry (slightly larger)
  const glowGeometry = useMemo(() => {
    const geometry = markerGeometry.clone();
    geometry.scale(1.2, 1.2, 1.2);
    return geometry;
  }, [markerGeometry]);
  
  // Animation and blinking effect
  useFrame((state, delta) => {
    time.current += delta;
    
    if (meshRef.current && markerRef.current) {
      // Rotation animation
      markerRef.current.rotation.y = time.current * 0.5;
      
      // Blinking effect
      if (blinking) {
        const blinkIntensity = Math.sin(time.current * 4) * 0.5 + 0.5;
        meshRef.current.material.opacity = intensity * (0.4 + blinkIntensity * 0.6);
      }
      
      // Floating animation
      markerRef.current.position.y = (issue.position?.y || 0) + Math.sin(time.current * 2) * 0.1;
    }
  });
  
  // Hover effect
  const [hovered, setHovered] = React.useState(false);
  
  useFrame(() => {
    if (meshRef.current && hovered) {
      const scale = 1 + Math.sin(time.current * 6) * 0.1;
      meshRef.current.scale.setScalar(scale);
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1);
    }
  });
  
  // Cleanup
  useEffect(() => {
    return () => {
      markerGeometry.dispose();
      markerMaterial.dispose();
      outlineMaterial.dispose();
      glowGeometry.dispose();
    };
  }, [markerGeometry, markerMaterial, outlineMaterial, glowGeometry]);
  
  const position = issue.position || new THREE.Vector3(0, 0, 1);
  
  return (
    <group
      ref={markerRef}
      position={[position.x, position.y, position.z + 1]}
      name={`validation-marker-${issue.severity}`}
    >
      {/* Main marker */}
      <mesh
        ref={meshRef}
        geometry={markerGeometry}
        material={markerMaterial}
        onClick={onClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      />
      
      {/* Outline/glow effect */}
      <mesh
        geometry={glowGeometry}
        material={outlineMaterial}
      />
      
      {/* Error beam effect for critical errors */}
      {issue.severity === 'error' && (
        <ErrorBeam position={position} intensity={intensity} />
      )}
    </group>
  );
}

/**
 * Error beam effect for critical validation errors
 */
function ErrorBeam({ position, intensity }: { position: THREE.Vector3; intensity: number }) {
  const beamRef = useRef<THREE.Mesh>(null);
  
  const beamGeometry = useMemo(() => {
    return new THREE.CylinderGeometry(0.1, 0.1, 10, 8);
  }, []);
  
  const beamMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: intensity * 0.3
    });
  }, [intensity]);
  
  useFrame((state) => {
    if (beamRef.current) {
      const time = state.clock.getElapsedTime();
      beamRef.current.material.opacity = intensity * 0.3 * (Math.sin(time * 3) * 0.5 + 0.5);
    }
  });
  
  return (
    <mesh
      ref={beamRef}
      geometry={beamGeometry}
      material={beamMaterial}
      position={[0, 0, 5]}
      rotation={[0, 0, 0]}
    />
  );
}

/**
 * Validation heatmap overlay
 */
function ValidationHeatmap({ issues, visible }: ValidationHeatmapProps) {
  const heatmapRef = useRef<THREE.Points>(null);
  
  const heatmapGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];
    
    for (const issue of issues) {
      if (issue.position) {
        positions.push(issue.position.x, issue.position.y, issue.position.z + 0.5);
        
        const color = new THREE.Color(getSeverityColor(issue.severity));
        colors.push(color.r, color.g, color.b);
        
        const size = issue.severity === 'error' ? 10 : issue.severity === 'warning' ? 7 : 5;
        sizes.push(size);
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    
    return geometry;
  }, [issues]);
  
  const heatmapMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true
    });
  }, []);
  
  useFrame(() => {
    if (heatmapRef.current) {
      heatmapRef.current.visible = visible;
    }
  });
  
  return (
    <points
      ref={heatmapRef}
      geometry={heatmapGeometry}
      material={heatmapMaterial}
      name="validation-heatmap"
    />
  );
}

/**
 * Validation summary panel
 */
function ValidationSummary({ issues, position, visible }: ValidationSummaryProps) {
  const summaryRef = useRef<THREE.Sprite>(null);
  
  const summaryTexture = useMemo(() => {
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;
    
    canvas.width = 300;
    canvas.height = 120;
    
    // Background
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Border
    context.strokeStyle = 'white';
    context.lineWidth = 2;
    context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    
    // Title
    context.fillStyle = 'white';
    context.font = 'bold 16px Arial';
    context.textAlign = 'center';
    context.fillText('Validation Issues', canvas.width / 2, 25);
    
    // Counts
    context.font = '14px Arial';
    context.textAlign = 'left';
    
    let y = 50;
    if (errorCount > 0) {
      context.fillStyle = '#ff4444';
      context.fillText(`● Errors: ${errorCount}`, 20, y);
      y += 20;
    }
    
    if (warningCount > 0) {
      context.fillStyle = '#ffaa44';
      context.fillText(`▲ Warnings: ${warningCount}`, 20, y);
      y += 20;
    }
    
    if (infoCount > 0) {
      context.fillStyle = '#4488ff';
      context.fillText(`● Info: ${infoCount}`, 20, y);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
  }, [issues]);
  
  const summaryMaterial = useMemo(() => {
    if (!summaryTexture) return null;
    
    return new THREE.SpriteMaterial({
      map: summaryTexture,
      transparent: true,
      alphaTest: 0.1
    });
  }, [summaryTexture]);
  
  useFrame(({ camera }) => {
    if (summaryRef.current) {
      summaryRef.current.lookAt(camera.position);
      summaryRef.current.visible = visible && issues.length > 0;
    }
  });
  
  if (!summaryMaterial) return null;
  
  return (
    <sprite
      ref={summaryRef}
      material={summaryMaterial}
      position={position}
      scale={[6, 2.4, 1]}
    />
  );
}

/**
 * Validation wire overlay for highlighting problematic geometry
 */
function ValidationWireOverlay({ 
  targetGeometry, 
  issues, 
  visible 
}: { 
  targetGeometry?: THREE.BufferGeometry; 
  issues: ValidationIssue[];
  visible: boolean;
}) {
  const wireframeRef = useRef<THREE.LineSegments>(null);
  
  const wireframeGeometry = useMemo(() => {
    if (!targetGeometry) return null;
    
    const wireframe = new THREE.WireframeGeometry(targetGeometry);
    return wireframe;
  }, [targetGeometry]);
  
  const wireframeMaterial = useMemo(() => {
    const hasErrors = issues.some(issue => issue.severity === 'error');
    const color = hasErrors ? 0xff0000 : 0xffaa00;
    
    return new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5
    });
  }, [issues]);
  
  useFrame(() => {
    if (wireframeRef.current) {
      wireframeRef.current.visible = visible;
    }
  });
  
  if (!wireframeGeometry) return null;
  
  return (
    <lineSegments
      ref={wireframeRef}
      geometry={wireframeGeometry}
      material={wireframeMaterial}
      name="validation-wireframe"
    />
  );
}

/**
 * Utility functions
 */
function getSeverityColor(severity: 'error' | 'warning' | 'info'): number {
  switch (severity) {
    case 'error':
      return 0xff4444;
    case 'warning':
      return 0xffaa44;
    case 'info':
      return 0x4488ff;
    default:
      return 0x888888;
  }
}

function parseValidationResults(validationResults: Record<string, any>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  for (const [filename, result] of Object.entries(validationResults)) {
    if (!result.is_valid && result.errors) {
      for (let i = 0; i < result.errors.length; i++) {
        const error = result.errors[i];
        
        issues.push({
          severity: 'error',
          message: typeof error === 'string' ? error : error.message || 'Unknown error',
          elementId: filename,
          position: generatePositionFromIndex(i, issues.length), // Distribute positions
        });
      }
    }
    
    if (result.warnings) {
      for (let i = 0; i < result.warnings.length; i++) {
        const warning = result.warnings[i];
        
        issues.push({
          severity: 'warning',
          message: typeof warning === 'string' ? warning : warning.message || 'Unknown warning',
          elementId: filename,
          position: generatePositionFromIndex(i + (result.errors?.length || 0), issues.length),
        });
      }
    }
  }
  
  return issues;
}

function generatePositionFromIndex(index: number, total: number): THREE.Vector3 {
  // Generate positions in a spiral pattern
  const angle = index * 0.5;
  const radius = Math.sqrt(index) * 2;
  
  return new THREE.Vector3(
    Math.cos(angle) * radius,
    Math.sin(angle) * radius,
    Math.random() * 2 + 1 // Random height between 1-3
  );
}

/**
 * Main validation overlay component
 */
export default function ValidationOverlay({
  validationResults,
  visible = true,
  highlightIntensity = 1.0,
  blinkingEnabled = true,
  onIssueClick
}: ValidationOverlayProps) {
  const overlayGroupRef = useRef<THREE.Group>(null);
  
  // Parse validation results into issues
  const validationIssues = useMemo(() => {
    if (!validationResults) return [];
    return parseValidationResults(validationResults);
  }, [validationResults]);
  
  // Group issues by severity
  const issuesSummary = useMemo(() => {
    const errors = validationIssues.filter(issue => issue.severity === 'error');
    const warnings = validationIssues.filter(issue => issue.severity === 'warning');
    const info = validationIssues.filter(issue => issue.severity === 'info');
    
    return { errors, warnings, info, total: validationIssues.length };
  }, [validationIssues]);
  
  // Update visibility
  useFrame(() => {
    if (overlayGroupRef.current) {
      overlayGroupRef.current.visible = visible && validationIssues.length > 0;
    }
  });
  
  // Calculate summary position (top-right of view)
  const summaryPosition = useMemo(() => {
    return new THREE.Vector3(15, 15, 10);
  }, []);
  
  if (validationIssues.length === 0) {
    return null;
  }
  
  return (
    <group ref={overlayGroupRef} name="validation-overlay">
      {/* Individual validation markers */}
      {validationIssues.map((issue, index) => (
        <ValidationMarker
          key={`${issue.elementId}-${index}`}
          issue={issue}
          intensity={highlightIntensity}
          blinking={blinkingEnabled && issue.severity === 'error'}
          onClick={() => onIssueClick?.(issue)}
        />
      ))}
      
      {/* Validation heatmap */}
      <ValidationHeatmap
        issues={validationIssues}
        visible={visible && validationIssues.length > 10}
      />
      
      {/* Summary panel */}
      <ValidationSummary
        issues={validationIssues}
        position={summaryPosition}
        visible={visible}
      />
      
      {/* Performance info for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <mesh position={[0, 0, 20]}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshBasicMaterial color={validationIssues.length > 50 ? 0xff0000 : 0x00ff00} />
        </mesh>
      )}
    </group>
  );
}

// Export individual components for testing
export { 
  ValidationMarker, 
  ValidationHeatmap, 
  ValidationSummary, 
  ValidationWireOverlay,
  parseValidationResults 
};