/**
 * Zustand store for 3D visualization state management
 * Replaces complex state management in Visualization3D.tsx
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  VehicleElement, 
  TimelineEvent, 
  ParsedOpenDrive, 
  ParsedOpenScenario,
  ValidationIssue 
} from '../components/visualization/types/VisualizationTypes';

export interface VisualizationState {
  // Data state
  vehicles: VehicleElement[];
  timeline: TimelineEvent[];
  openDriveData: ParsedOpenDrive | null;
  openScenarioData: ParsedOpenScenario | null;
  validationIssues: ValidationIssue[];
  
  // Loading and error state
  loading: boolean;
  error: string | null;
  
  // Playback state
  isPlaying: boolean;
  currentTime: number;
  playbackSpeed: number;
  duration: number;
  
  // View state
  showVehicles: boolean;
  showRoads: boolean;
  showValidationIssues: boolean;
  showTimeline: boolean;
  cameraMode: 'free' | 'follow' | 'top';
  followTarget: string | null;
  
  // Performance metrics
  fps: number;
  renderTime: number;
  
  // Actions
  setData: (data: {
    vehicles: VehicleElement[];
    timeline: TimelineEvent[];
    openDriveData: ParsedOpenDrive | null;
    openScenarioData: ParsedOpenScenario | null;
    validationIssues: ValidationIssue[];
  }) => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Playback actions
  play: () => void;
  pause: () => void;
  stop: () => void;
  setCurrentTime: (time: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  
  // View actions
  toggleVehicles: () => void;
  toggleRoads: () => void;
  toggleValidationIssues: () => void;
  toggleTimeline: () => void;
  setCameraMode: (mode: 'free' | 'follow' | 'top') => void;
  setFollowTarget: (target: string | null) => void;
  
  // Performance actions
  updatePerformance: (fps: number, renderTime: number) => void;
  
  // Reset actions
  reset: () => void;
}

const initialState = {
  // Data state
  vehicles: [],
  timeline: [],
  openDriveData: null,
  openScenarioData: null,
  validationIssues: [],
  
  // Loading and error state
  loading: false,
  error: null,
  
  // Playback state
  isPlaying: false,
  currentTime: 0,
  playbackSpeed: 1,
  duration: 0,
  
  // View state
  showVehicles: true,
  showRoads: true,
  showValidationIssues: true,
  showTimeline: true,
  cameraMode: 'free' as const,
  followTarget: null,
  
  // Performance metrics
  fps: 0,
  renderTime: 0,
};

export const useVisualizationStore = create<VisualizationState>()(
  subscribeWithSelector((set, _get) => ({
    ...initialState,
    
    // Data actions
    setData: (data) => set((_state) => ({
      ...data,
      duration: data.openScenarioData?.duration || Math.max(30, data.timeline.length * 5),
      loading: false,
      error: null,
    })),
    
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    
    // Playback actions
    play: () => set({ isPlaying: true }),
    pause: () => set({ isPlaying: false }),
    stop: () => set({ isPlaying: false, currentTime: 0 }),
    
    setCurrentTime: (time) => set((state) => ({
      currentTime: Math.max(0, Math.min(time, state.duration))
    })),
    
    setPlaybackSpeed: (speed) => set({ playbackSpeed: Math.max(0.1, Math.min(speed, 5)) }),
    
    // View actions
    toggleVehicles: () => set((state) => ({ showVehicles: !state.showVehicles })),
    toggleRoads: () => set((state) => ({ showRoads: !state.showRoads })),
    toggleValidationIssues: () => set((state) => ({ showValidationIssues: !state.showValidationIssues })),
    toggleTimeline: () => set((state) => ({ showTimeline: !state.showTimeline })),
    
    setCameraMode: (mode) => set({ cameraMode: mode }),
    setFollowTarget: (target) => set({ followTarget: target }),
    
    // Performance actions
    updatePerformance: (fps, renderTime) => set({ fps, renderTime }),
    
    // Reset actions
    reset: () => set(initialState),
  }))
);

// Selectors for commonly used state combinations
export const useVisualizationData = () => useVisualizationStore((state) => ({
  vehicles: state.vehicles,
  timeline: state.timeline,
  openDriveData: state.openDriveData,
  openScenarioData: state.openScenarioData,
  validationIssues: state.validationIssues,
}));

export const usePlaybackState = () => useVisualizationStore((state) => ({
  isPlaying: state.isPlaying,
  currentTime: state.currentTime,
  playbackSpeed: state.playbackSpeed,
  duration: state.duration,
}));

export const useViewState = () => useVisualizationStore((state) => ({
  showVehicles: state.showVehicles,
  showRoads: state.showRoads,
  showValidationIssues: state.showValidationIssues,
  showTimeline: state.showTimeline,
  cameraMode: state.cameraMode,
  followTarget: state.followTarget,
}));

export const usePerformanceMetrics = () => useVisualizationStore((state) => ({
  fps: state.fps,
  renderTime: state.renderTime,
}));

// Action selectors
export const useVisualizationActions = () => useVisualizationStore((state) => ({
  setData: state.setData,
  setLoading: state.setLoading,
  setError: state.setError,
  play: state.play,
  pause: state.pause,
  stop: state.stop,
  setCurrentTime: state.setCurrentTime,
  setPlaybackSpeed: state.setPlaybackSpeed,
  toggleVehicles: state.toggleVehicles,
  toggleRoads: state.toggleRoads,
  toggleValidationIssues: state.toggleValidationIssues,
  toggleTimeline: state.toggleTimeline,
  setCameraMode: state.setCameraMode,
  setFollowTarget: state.setFollowTarget,
  updatePerformance: state.updatePerformance,
  reset: state.reset,
}));