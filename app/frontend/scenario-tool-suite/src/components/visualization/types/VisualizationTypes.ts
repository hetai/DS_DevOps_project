/**
 * Core visualization types for 3D scenario rendering
 */

import * as THREE from 'three';

export interface Visualization3DProps {
  scenarioFiles?: Record<string, string>;
  validationResults?: Record<string, any>;
  visualizationMetadata?: VisualizationMetadata;
  className?: string;
  onError?: (error: string) => void;
}

export interface VisualizationMetadata {
  road_network?: {
    roads: RoadElement[];
    junctions: JunctionElement[];
  };
  vehicles?: VehicleElement[];
  events?: EventElement[];
}

export interface SceneState {
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  showValidationHighlights: boolean;
  timelinePosition: number;
  timelineMax: number;
  playbackSpeed: number;
  isPlaying: boolean;
}

export interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
  zoom: number;
  autoRotate: boolean;
  controlsEnabled: boolean;
}

export interface RenderOptions {
  showRoadNetwork: boolean;
  showVehicles: boolean;
  showTrajectories: boolean;
  showValidationIssues: boolean;
  quality: 'low' | 'medium' | 'high';
  enableAntialiasing: boolean;
  enableShadows: boolean;
}

export interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  memoryUsage: number;
  triangleCount: number;
  drawCalls: number;
}

// Basic geometry types
export interface RoadElement {
  id: string;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  position: THREE.Vector3;
  rotation: THREE.Euler;
}

export interface VehicleElement {
  id: string;
  type: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  trajectory?: THREE.Vector3[];
  speed: number;
  timestamp: number;
}

export interface JunctionElement {
  id: string;
  position: THREE.Vector3;
  connections: string[];
  geometry: THREE.BufferGeometry;
}

export interface EventElement {
  id: string;
  type: string;
  timestamp: number;
  position?: THREE.Vector3;
  description: string;
  validationIssue?: boolean;
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  position?: THREE.Vector3;
  elementId?: string;
  timestamp?: number;
}

// Scene management
export interface SceneObject {
  id: string;
  type: 'road' | 'vehicle' | 'event' | 'validation';
  mesh: THREE.Object3D;
  metadata: any;
  visible: boolean;
  animated: boolean;
}

export interface TimelineEvent {
  timestamp: number;
  type: string;
  target: string;
  action: any;
  duration?: number;
}

// Parser interfaces
export interface ParsedOpenDrive {
  header: any;
  roads: any[];
  junctions: any[];
  coordinateSystem: string;
  boundingBox: {
    min: THREE.Vector3;
    max: THREE.Vector3;
  };
}

export interface ParsedOpenScenario {
  header: any;
  entities: any[];
  storyboard: any;
  timeline: TimelineEvent[];
  duration: number;
  boundingBox: {
    min: THREE.Vector3;
    max: THREE.Vector3;
  };
}