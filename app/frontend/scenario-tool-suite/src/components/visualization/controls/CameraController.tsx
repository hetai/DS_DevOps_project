/**
 * Camera Controller - Handles interactive camera controls for 3D visualization
 * Provides orbit controls, predefined views, and smooth camera transitions
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { MathUtils } from '../utils/MathUtils';

interface CameraControllerProps {
  enabled?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  enableZoom?: boolean;
  enablePan?: boolean;
  enableRotate?: boolean;
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  minAzimuthAngle?: number;
  maxAzimuthAngle?: number;
  target?: THREE.Vector3;
  onCameraChange?: (position: THREE.Vector3, target: THREE.Vector3) => void;
}

interface CameraPreset {
  name: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
  description: string;
}

interface UseCameraPresetsReturn {
  presets: CameraPreset[];
  setPreset: (presetName: string) => void;
  currentPreset: string | null;
}

interface CameraTransition {
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  duration: number;
  easing: (t: number) => number;
}

// Predefined camera presets
const CAMERA_PRESETS: CameraPreset[] = [
  {
    name: 'overview',
    position: new THREE.Vector3(0, 0, 50),
    target: new THREE.Vector3(0, 0, 0),
    description: 'Top-down overview of the entire scene'
  },
  {
    name: 'perspective',
    position: new THREE.Vector3(20, 20, 20),
    target: new THREE.Vector3(0, 0, 0),
    description: 'Diagonal perspective view'
  },
  {
    name: 'roadLevel',
    position: new THREE.Vector3(0, -15, 2),
    target: new THREE.Vector3(0, 0, 1),
    description: 'Road-level driver perspective'
  },
  {
    name: 'side',
    position: new THREE.Vector3(30, 0, 10),
    target: new THREE.Vector3(0, 0, 0),
    description: 'Side view of the scene'
  },
  {
    name: 'front',
    position: new THREE.Vector3(0, -30, 10),
    target: new THREE.Vector3(0, 0, 0),
    description: 'Front view of the scene'
  },
  {
    name: 'isometric',
    position: new THREE.Vector3(25, -25, 25),
    target: new THREE.Vector3(0, 0, 0),
    description: 'Isometric view for technical analysis'
  }
];

// Easing functions for smooth transitions
const EASING_FUNCTIONS = {
  linear: (t: number) => t,
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeIn: (t: number) => t * t * t,
  bounce: (t: number) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  }
};

/**
 * Camera transition hook
 */
function useCameraTransition() {
  const { camera } = useThree();
  const transitionRef = useRef<CameraTransition | null>(null);
  const startTimeRef = useRef<number>(0);
  const orbitControlsRef = useRef<any>(null);
  
  const startTransition = (
    toPosition: THREE.Vector3,
    toTarget: THREE.Vector3,
    duration: number = 2000,
    easingType: keyof typeof EASING_FUNCTIONS = 'easeInOut'
  ) => {
    if (!orbitControlsRef.current) return;
    
    const fromPosition = camera.position.clone();
    const fromTarget = orbitControlsRef.current.target.clone();
    
    transitionRef.current = {
      fromPosition,
      toPosition: toPosition.clone(),
      fromTarget,
      toTarget: toTarget.clone(),
      duration,
      easing: EASING_FUNCTIONS[easingType]
    };
    
    startTimeRef.current = performance.now();
  };
  
  const updateTransition = () => {
    if (!transitionRef.current || !orbitControlsRef.current) return;
    
    const elapsed = performance.now() - startTimeRef.current;
    const progress = Math.min(elapsed / transitionRef.current.duration, 1);
    const easedProgress = transitionRef.current.easing(progress);
    
    // Interpolate position
    const newPosition = transitionRef.current.fromPosition
      .clone()
      .lerp(transitionRef.current.toPosition, easedProgress);
    
    // Interpolate target
    const newTarget = transitionRef.current.fromTarget
      .clone()
      .lerp(transitionRef.current.toTarget, easedProgress);
    
    // Update camera and controls
    camera.position.copy(newPosition);
    orbitControlsRef.current.target.copy(newTarget);
    orbitControlsRef.current.update();
    
    // Clear transition when complete
    if (progress >= 1) {
      transitionRef.current = null;
    }
  };
  
  return {
    startTransition,
    updateTransition,
    isTransitioning: () => transitionRef.current !== null,
    setControlsRef: (ref: any) => { orbitControlsRef.current = ref; }
  };
}

/**
 * Camera presets hook
 */
function useCameraPresets(
  boundingBox?: { min: THREE.Vector3; max: THREE.Vector3 }
): UseCameraPresetsReturn {
  const transition = useCameraTransition();
  const [currentPreset, setCurrentPreset] = React.useState<string | null>(null);
  
  // Adjust presets based on scene bounding box
  const adjustedPresets = useMemo(() => {
    if (!boundingBox) return CAMERA_PRESETS;
    
    const center = boundingBox.min.clone().add(boundingBox.max).multiplyScalar(0.5);
    const size = boundingBox.min.distanceTo(boundingBox.max);
    const scale = Math.max(size, 10) / 10; // Minimum scale of 1
    
    return CAMERA_PRESETS.map(preset => ({
      ...preset,
      position: preset.position.clone().multiplyScalar(scale).add(center),
      target: center.clone()
    }));
  }, [boundingBox]);
  
  const setPreset = (presetName: string) => {
    const preset = adjustedPresets.find(p => p.name === presetName);
    if (preset) {
      transition.startTransition(preset.position, preset.target, 1500, 'easeInOut');
      setCurrentPreset(presetName);
    }
  };
  
  return {
    presets: adjustedPresets,
    setPreset,
    currentPreset
  };
}

/**
 * Auto-follow target hook for vehicles
 */
function useAutoFollow(targetPosition?: THREE.Vector3, enabled: boolean = false) {
  const { camera } = useThree();
  const followOffset = useRef(new THREE.Vector3(0, -10, 5));
  const smoothingFactor = 0.02;
  
  useFrame(() => {
    if (!enabled || !targetPosition) return;
    
    const targetCameraPosition = targetPosition.clone().add(followOffset.current);
    camera.position.lerp(targetCameraPosition, smoothingFactor);
    camera.lookAt(targetPosition);
  });
  
  return {
    setFollowOffset: (offset: THREE.Vector3) => {
      followOffset.current = offset;
    }
  };
}

/**
 * Camera path animation hook
 */
function useCameraPath() {
  const { camera } = useThree();
  const pathRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const progressRef = useRef(0);
  const isPlayingRef = useRef(false);
  const speedRef = useRef(0.01);
  const orbitControlsRef = useRef<any>(null);
  
  const setPath = (points: THREE.Vector3[]) => {
    if (points.length < 2) return;
    pathRef.current = new THREE.CatmullRomCurve3(points);
    progressRef.current = 0;
  };
  
  const play = (speed: number = 0.01) => {
    speedRef.current = speed;
    isPlayingRef.current = true;
  };
  
  const pause = () => {
    isPlayingRef.current = false;
  };
  
  const reset = () => {
    progressRef.current = 0;
    isPlayingRef.current = false;
  };
  
  useFrame(() => {
    if (!isPlayingRef.current || !pathRef.current || !orbitControlsRef.current) return;
    
    progressRef.current += speedRef.current;
    
    if (progressRef.current > 1) {
      progressRef.current = 1;
      isPlayingRef.current = false;
    }
    
    const position = pathRef.current.getPoint(progressRef.current);
    const lookAtPoint = pathRef.current.getPoint(Math.min(progressRef.current + 0.01, 1));
    
    camera.position.copy(position);
    orbitControlsRef.current.target.copy(lookAtPoint);
    orbitControlsRef.current.update();
  });
  
  return {
    setPath,
    play,
    pause,
    reset,
    isPlaying: () => isPlayingRef.current,
    progress: () => progressRef.current,
    setControlsRef: (ref: any) => { orbitControlsRef.current = ref; }
  };
}

/**
 * Main camera controller component
 */
export default function CameraController({
  enabled = true,
  autoRotate = false,
  autoRotateSpeed = 1.0,
  enableZoom = true,
  enablePan = true,
  enableRotate = true,
  minDistance = 1,
  maxDistance = 1000,
  minPolarAngle = 0,
  maxPolarAngle = Math.PI,
  minAzimuthAngle = -Infinity,
  maxAzimuthAngle = Infinity,
  target,
  onCameraChange
}: CameraControllerProps) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const transition = useCameraTransition();
  
  // Set up transition controls reference
  useEffect(() => {
    if (controlsRef.current) {
      transition.setControlsRef(controlsRef.current);
    }
  }, [transition]);
  
  // Handle camera change events
  const handleCameraChange = () => {
    if (controlsRef.current && onCameraChange) {
      onCameraChange(camera.position.clone(), controlsRef.current.target.clone());
    }
  };
  
  // Update transition animation
  useFrame(() => {
    transition.updateTransition();
  });
  
  // Auto-rotation management
  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate && !transition.isTransitioning();
    }
  });
  
  return (
    <OrbitControls
      ref={controlsRef}
      enabled={enabled && !transition.isTransitioning()}
      autoRotate={autoRotate}
      autoRotateSpeed={autoRotateSpeed}
      enableZoom={enableZoom}
      enablePan={enablePan}
      enableRotate={enableRotate}
      minDistance={minDistance}
      maxDistance={maxDistance}
      minPolarAngle={minPolarAngle}
      maxPolarAngle={maxPolarAngle}
      minAzimuthAngle={minAzimuthAngle}
      maxAzimuthAngle={maxAzimuthAngle}
      target={target}
      onChange={handleCameraChange}
      enableDamping
      dampingFactor={0.05}
      screenSpacePanning={false}
    />
  );
}

/**
 * Camera controls UI component (for external use)
 */
export function CameraControlsUI({
  boundingBox,
  onPresetChange,
  onAutoRotateToggle,
  onFollowToggle,
  followTarget
}: {
  boundingBox?: { min: THREE.Vector3; max: THREE.Vector3 };
  onPresetChange?: (preset: string) => void;
  onAutoRotateToggle?: (enabled: boolean) => void;
  onFollowToggle?: (enabled: boolean) => void;
  followTarget?: THREE.Vector3;
}) {
  const { presets, setPreset, currentPreset } = useCameraPresets(boundingBox);
  const [autoRotateEnabled, setAutoRotateEnabled] = React.useState(false);
  const [followEnabled, setFollowEnabled] = React.useState(false);
  
  useAutoFollow(followTarget, followEnabled);
  
  const handlePresetChange = (presetName: string) => {
    setPreset(presetName);
    onPresetChange?.(presetName);
  };
  
  const handleAutoRotateToggle = () => {
    const newState = !autoRotateEnabled;
    setAutoRotateEnabled(newState);
    onAutoRotateToggle?.(newState);
  };
  
  const handleFollowToggle = () => {
    const newState = !followEnabled;
    setFollowEnabled(newState);
    onFollowToggle?.(newState);
  };
  
  return (
    <div className="camera-controls-ui">
      {/* Preset buttons */}
      <div className="preset-buttons">
        {presets.map(preset => (
          <button
            key={preset.name}
            onClick={() => handlePresetChange(preset.name)}
            className={`preset-button ${currentPreset === preset.name ? 'active' : ''}`}
            title={preset.description}
          >
            {preset.name}
          </button>
        ))}
      </div>
      
      {/* Control toggles */}
      <div className="control-toggles">
        <button
          onClick={handleAutoRotateToggle}
          className={`toggle-button ${autoRotateEnabled ? 'active' : ''}`}
        >
          Auto Rotate
        </button>
        
        {followTarget && (
          <button
            onClick={handleFollowToggle}
            className={`toggle-button ${followEnabled ? 'active' : ''}`}
          >
            Follow Target
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Camera path component for cinematic views
 */
export function CameraPath({ 
  points, 
  autoPlay = false, 
  speed = 0.01,
  onComplete 
}: {
  points: THREE.Vector3[];
  autoPlay?: boolean;
  speed?: number;
  onComplete?: () => void;
}) {
  const cameraPath = useCameraPath();
  
  useEffect(() => {
    if (points.length >= 2) {
      cameraPath.setPath(points);
      
      if (autoPlay) {
        cameraPath.play(speed);
      }
    }
  }, [points, autoPlay, speed, cameraPath]);
  
  // Check for completion
  useFrame(() => {
    if (cameraPath.progress() >= 1 && !cameraPath.isPlaying() && onComplete) {
      onComplete();
    }
  });
  
  return null; // This component doesn't render anything visible
}

// Export hooks for external use
export { 
  useCameraTransition, 
  useCameraPresets, 
  useAutoFollow, 
  useCameraPath,
  CAMERA_PRESETS,
  EASING_FUNCTIONS 
};