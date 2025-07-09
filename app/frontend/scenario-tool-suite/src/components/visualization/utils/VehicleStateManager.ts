/**
 * Vehicle State Manager - Manages event-driven vehicle state changes
 * Handles vehicle behavior switching based on ScenarioEvent processing
 */

import * as THREE from 'three';
import { VehicleElement } from '../types/VisualizationTypes';
import { ScenarioEvent, VehicleStateUpdate, ScenarioEventParameters } from '../types/ScenarioEventTypes';
import { TrajectoryPoint, calculateVehicleTransformAtTime } from './TrajectoryInterpolation';

/**
 * Enhanced vehicle state with event-driven properties
 */
export interface EnhancedVehicleState extends VehicleElement {
  // Current motion state
  currentSpeed: number;
  targetSpeed: number;
  acceleration: number;
  
  // Lane information
  currentLane: number;
  targetLane: number;
  laneChangeProgress: number;
  
  // Animation state
  isInTransition: boolean;
  transitionStartTime: number;
  transitionDuration: number;
  transitionType: 'speed' | 'lane' | 'teleport' | 'none';
  
  // Event tracking
  activeEvents: ScenarioEvent[];
  lastEventTime: number;
  
  // Enhanced trajectory with event-driven waypoints
  eventTrajectory: TrajectoryPoint[];
  originalTrajectory: TrajectoryPoint[];
  
  // State history for debugging
  stateHistory: VehicleStateSnapshot[];
}

/**
 * Vehicle state snapshot for history tracking
 */
export interface VehicleStateSnapshot {
  timestamp: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  speed: number;
  lane: number;
  eventId?: string;
  eventType?: string;
}

/**
 * Vehicle state manager class
 */
export class VehicleStateManager {
  private vehicleStates: Map<string, EnhancedVehicleState> = new Map();
  private stateUpdateCallbacks: Map<string, (state: EnhancedVehicleState) => void> = new Map();
  
  /**
   * Initialize vehicles with enhanced state
   */
  public initializeVehicles(vehicles: VehicleElement[]): void {
    this.vehicleStates.clear();
    
    for (const vehicle of vehicles) {
      const enhancedState: EnhancedVehicleState = {
        ...vehicle,
        currentSpeed: vehicle.speed || 0,
        targetSpeed: vehicle.speed || 0,
        acceleration: 0,
        currentLane: 0,
        targetLane: 0,
        laneChangeProgress: 0,
        isInTransition: false,
        transitionStartTime: 0,
        transitionDuration: 0,
        transitionType: 'none',
        activeEvents: [],
        lastEventTime: 0,
        eventTrajectory: this.convertTrajectoryToPoints(vehicle.trajectory || []),
        originalTrajectory: this.convertTrajectoryToPoints(vehicle.trajectory || []),
        stateHistory: []
      };
      
      this.vehicleStates.set(vehicle.id, enhancedState);
    }
  }

  /**
   * Convert THREE.Vector3[] to TrajectoryPoint[]
   */
  private convertTrajectoryToPoints(trajectory: THREE.Vector3[]): TrajectoryPoint[] {
    return trajectory.map((point, index) => ({
      time: index * 0.1, // Assume 0.1 second intervals
      position: point,
      velocity: 10 // Default velocity
    }));
  }

  /**
   * Apply vehicle state updates from events
   */
  public applyStateUpdates(updates: VehicleStateUpdate[], currentTime: number): void {
    for (const update of updates) {
      const vehicleState = this.vehicleStates.get(update.vehicleId);
      if (!vehicleState) continue;
      
      this.applyStateUpdate(vehicleState, update, currentTime);
    }
  }

  /**
   * Apply individual state update
   */
  private applyStateUpdate(vehicleState: EnhancedVehicleState, update: VehicleStateUpdate, currentTime: number): void {
    // Add to state history
    this.addStateSnapshot(vehicleState, currentTime, update.stateChange);
    
    switch (update.stateChange) {
      case 'speed_change':
        this.applySpeedChange(vehicleState, update.parameters, currentTime, update.transitionDuration);
        break;
        
      case 'lane_change':
        this.applyLaneChange(vehicleState, update.parameters, currentTime, update.transitionDuration);
        break;
        
      case 'teleport':
        this.applyTeleport(vehicleState, update.parameters, currentTime);
        break;
        
      case 'brake_action':
        this.applyBrakeAction(vehicleState, update.parameters, currentTime, update.transitionDuration);
        break;
        
      case 'vehicle_start':
        this.applyVehicleStart(vehicleState, update.parameters, currentTime);
        break;
        
      case 'vehicle_stop':
        this.applyVehicleStop(vehicleState, update.parameters, currentTime, update.transitionDuration);
        break;
        
      default:
        console.warn(`Unknown state change type: ${update.stateChange}`);
    }
    
    // Update last event time
    vehicleState.lastEventTime = currentTime;
    
    // Trigger callback if registered
    const callback = this.stateUpdateCallbacks.get(vehicleState.id);
    if (callback) {
      callback(vehicleState);
    }
  }

  /**
   * Apply speed change
   */
  private applySpeedChange(
    vehicleState: EnhancedVehicleState,
    parameters: ScenarioEventParameters,
    currentTime: number,
    duration: number
  ): void {
    if (parameters.targetSpeed === undefined) return;
    
    vehicleState.targetSpeed = parameters.targetSpeed;
    vehicleState.isInTransition = true;
    vehicleState.transitionStartTime = currentTime;
    vehicleState.transitionDuration = duration;
    vehicleState.transitionType = 'speed';
    
    // Calculate acceleration based on dynamics
    if (parameters.speedDynamics?.dynamicsDimension === 'time') {
      vehicleState.acceleration = (parameters.targetSpeed - vehicleState.currentSpeed) / duration;
    } else {
      // Default acceleration
      vehicleState.acceleration = (parameters.targetSpeed - vehicleState.currentSpeed) / Math.max(duration, 0.1);
    }
    
    console.log(`Speed change: ${vehicleState.id} from ${vehicleState.currentSpeed} to ${parameters.targetSpeed} over ${duration}s`);
  }

  /**
   * Apply lane change
   */
  private applyLaneChange(
    vehicleState: EnhancedVehicleState,
    parameters: ScenarioEventParameters,
    currentTime: number,
    duration: number
  ): void {
    if (parameters.targetLane === undefined) return;
    
    vehicleState.targetLane = parameters.targetLane;
    vehicleState.isInTransition = true;
    vehicleState.transitionStartTime = currentTime;
    vehicleState.transitionDuration = duration;
    vehicleState.transitionType = 'lane';
    vehicleState.laneChangeProgress = 0;
    
    console.log(`Lane change: ${vehicleState.id} from lane ${vehicleState.currentLane} to ${parameters.targetLane} over ${duration}s`);
  }

  /**
   * Apply teleport
   */
  private applyTeleport(
    vehicleState: EnhancedVehicleState,
    parameters: ScenarioEventParameters,
    currentTime: number
  ): void {
    if (!parameters.targetPosition) return;
    
    const targetPos = parameters.targetPosition;
    
    if (targetPos.type === 'world') {
      vehicleState.position.set(
        targetPos.x || 0,
        targetPos.y || 0,
        targetPos.z || 0
      );
      
      vehicleState.rotation.set(
        targetPos.p || 0,
        targetPos.h || 0,
        targetPos.r || 0
      );
    }
    
    vehicleState.isInTransition = false;
    vehicleState.transitionType = 'teleport';
    
    console.log(`Teleport: ${vehicleState.id} to (${targetPos.x}, ${targetPos.y}, ${targetPos.z})`);
  }

  /**
   * Apply brake action
   */
  private applyBrakeAction(
    vehicleState: EnhancedVehicleState,
    parameters: ScenarioEventParameters,
    currentTime: number,
    duration: number
  ): void {
    const brakeForce = parameters.brakeForce || 5; // Default brake force
    const targetSpeed = Math.max(0, vehicleState.currentSpeed - brakeForce * duration);
    
    vehicleState.targetSpeed = targetSpeed;
    vehicleState.isInTransition = true;
    vehicleState.transitionStartTime = currentTime;
    vehicleState.transitionDuration = duration;
    vehicleState.transitionType = 'speed';
    vehicleState.acceleration = -brakeForce;
    
    console.log(`Brake action: ${vehicleState.id} reducing speed to ${targetSpeed} with force ${brakeForce}`);
  }

  /**
   * Apply vehicle start
   */
  private applyVehicleStart(
    vehicleState: EnhancedVehicleState,
    parameters: ScenarioEventParameters,
    currentTime: number
  ): void {
    vehicleState.currentSpeed = parameters.targetSpeed || 10; // Default start speed
    vehicleState.targetSpeed = vehicleState.currentSpeed;
    vehicleState.isInTransition = false;
    
    console.log(`Vehicle start: ${vehicleState.id} starting with speed ${vehicleState.currentSpeed}`);
  }

  /**
   * Apply vehicle stop
   */
  private applyVehicleStop(
    vehicleState: EnhancedVehicleState,
    parameters: ScenarioEventParameters,
    currentTime: number,
    duration: number
  ): void {
    vehicleState.targetSpeed = 0;
    vehicleState.isInTransition = true;
    vehicleState.transitionStartTime = currentTime;
    vehicleState.transitionDuration = duration;
    vehicleState.transitionType = 'speed';
    vehicleState.acceleration = -vehicleState.currentSpeed / Math.max(duration, 0.1);
    
    console.log(`Vehicle stop: ${vehicleState.id} stopping over ${duration}s`);
  }

  /**
   * Update vehicle states during animation
   */
  public updateVehicleStates(currentTime: number): void {
    for (const [vehicleId, vehicleState] of this.vehicleStates.entries()) {
      this.updateVehicleState(vehicleState, currentTime);
    }
  }

  /**
   * Update individual vehicle state
   */
  private updateVehicleState(vehicleState: EnhancedVehicleState, currentTime: number): void {
    if (!vehicleState.isInTransition) return;
    
    const elapsedTime = currentTime - vehicleState.transitionStartTime;
    const progress = Math.min(elapsedTime / vehicleState.transitionDuration, 1.0);
    
    switch (vehicleState.transitionType) {
      case 'speed':
        this.updateSpeedTransition(vehicleState, progress, currentTime);
        break;
        
      case 'lane':
        this.updateLaneChangeTransition(vehicleState, progress, currentTime);
        break;
    }
    
    // Complete transition if finished
    if (progress >= 1.0) {
      this.completeTransition(vehicleState);
    }
  }

  /**
   * Update speed transition
   */
  private updateSpeedTransition(vehicleState: EnhancedVehicleState, progress: number, currentTime: number): void {
    const startSpeed = vehicleState.currentSpeed;
    const targetSpeed = vehicleState.targetSpeed;
    
    // Apply smooth interpolation
    vehicleState.currentSpeed = startSpeed + (targetSpeed - startSpeed) * this.easeInOutCubic(progress);
    vehicleState.speed = vehicleState.currentSpeed;
  }

  /**
   * Update lane change transition
   */
  private updateLaneChangeTransition(vehicleState: EnhancedVehicleState, progress: number, currentTime: number): void {
    vehicleState.laneChangeProgress = this.easeInOutCubic(progress);
    
    // Interpolate lane position
    const startLane = vehicleState.currentLane;
    const targetLane = vehicleState.targetLane;
    const currentLaneFloat = startLane + (targetLane - startLane) * vehicleState.laneChangeProgress;
    
    // Update trajectory to reflect lane change
    this.updateTrajectoryForLaneChange(vehicleState, currentLaneFloat);
  }

  /**
   * Update trajectory for lane change
   */
  private updateTrajectoryForLaneChange(vehicleState: EnhancedVehicleState, currentLaneFloat: number): void {
    // This is a simplified implementation
    // In a real system, this would integrate with OpenDRIVE road geometry
    const laneWidth = 3.5; // Standard lane width
    const laneOffset = (currentLaneFloat - vehicleState.currentLane) * laneWidth;
    
    // Offset trajectory points by lane change
    vehicleState.eventTrajectory = vehicleState.originalTrajectory.map(point => ({
      ...point,
      position: point.position.clone().add(new THREE.Vector3(laneOffset, 0, 0))
    }));
  }

  /**
   * Complete transition
   */
  private completeTransition(vehicleState: EnhancedVehicleState): void {
    vehicleState.isInTransition = false;
    vehicleState.transitionType = 'none';
    vehicleState.acceleration = 0;
    
    if (vehicleState.transitionType === 'lane') {
      vehicleState.currentLane = vehicleState.targetLane;
      vehicleState.laneChangeProgress = 0;
    }
    
    console.log(`Transition completed for vehicle ${vehicleState.id}`);
  }

  /**
   * Easing function for smooth transitions
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Add state snapshot to history
   */
  private addStateSnapshot(vehicleState: EnhancedVehicleState, currentTime: number, eventType?: string): void {
    const snapshot: VehicleStateSnapshot = {
      timestamp: currentTime,
      position: vehicleState.position.clone(),
      rotation: vehicleState.rotation.clone(),
      speed: vehicleState.currentSpeed,
      lane: vehicleState.currentLane,
      eventType
    };
    
    vehicleState.stateHistory.push(snapshot);
    
    // Limit history size
    const MAX_HISTORY_SIZE = 1000;
    if (vehicleState.stateHistory.length > MAX_HISTORY_SIZE) {
      vehicleState.stateHistory.shift();
    }
  }

  /**
   * Get vehicle state
   */
  public getVehicleState(vehicleId: string): EnhancedVehicleState | undefined {
    return this.vehicleStates.get(vehicleId);
  }

  /**
   * Get all vehicle states
   */
  public getAllVehicleStates(): EnhancedVehicleState[] {
    return Array.from(this.vehicleStates.values());
  }

  /**
   * Register state update callback
   */
  public registerStateUpdateCallback(vehicleId: string, callback: (state: EnhancedVehicleState) => void): void {
    this.stateUpdateCallbacks.set(vehicleId, callback);
  }

  /**
   * Unregister state update callback
   */
  public unregisterStateUpdateCallback(vehicleId: string): void {
    this.stateUpdateCallbacks.delete(vehicleId);
  }

  /**
   * Convert enhanced vehicle state to standard vehicle element
   */
  public convertToVehicleElement(vehicleState: EnhancedVehicleState): VehicleElement {
    return {
      id: vehicleState.id,
      type: vehicleState.type,
      position: vehicleState.position,
      rotation: vehicleState.rotation,
      speed: vehicleState.currentSpeed,
      timestamp: vehicleState.lastEventTime,
      trajectory: vehicleState.eventTrajectory.map(point => point.position)
    };
  }

  /**
   * Convert all enhanced states to vehicle elements
   */
  public convertAllToVehicleElements(): VehicleElement[] {
    return this.getAllVehicleStates().map(state => this.convertToVehicleElement(state));
  }

  /**
   * Get vehicles in transition
   */
  public getVehiclesInTransition(): EnhancedVehicleState[] {
    return this.getAllVehicleStates().filter(state => state.isInTransition);
  }

  /**
   * Get vehicle state history
   */
  public getVehicleStateHistory(vehicleId: string): VehicleStateSnapshot[] {
    const state = this.vehicleStates.get(vehicleId);
    return state ? state.stateHistory : [];
  }

  /**
   * Reset all vehicle states
   */
  public reset(): void {
    for (const [vehicleId, vehicleState] of this.vehicleStates.entries()) {
      vehicleState.currentSpeed = vehicleState.speed;
      vehicleState.targetSpeed = vehicleState.speed;
      vehicleState.acceleration = 0;
      vehicleState.currentLane = 0;
      vehicleState.targetLane = 0;
      vehicleState.laneChangeProgress = 0;
      vehicleState.isInTransition = false;
      vehicleState.transitionType = 'none';
      vehicleState.activeEvents = [];
      vehicleState.lastEventTime = 0;
      vehicleState.eventTrajectory = [...vehicleState.originalTrajectory];
      vehicleState.stateHistory = [];
    }
  }

  /**
   * Get state statistics
   */
  public getStateStatistics(): {
    totalVehicles: number;
    vehiclesInTransition: number;
    averageSpeed: number;
    activeTransitions: Record<string, number>;
  } {
    const vehicles = this.getAllVehicleStates();
    const transitionCounts: Record<string, number> = {};
    
    let totalSpeed = 0;
    let vehiclesInTransition = 0;
    
    for (const vehicle of vehicles) {
      totalSpeed += vehicle.currentSpeed;
      
      if (vehicle.isInTransition) {
        vehiclesInTransition++;
        transitionCounts[vehicle.transitionType] = (transitionCounts[vehicle.transitionType] || 0) + 1;
      }
    }
    
    return {
      totalVehicles: vehicles.length,
      vehiclesInTransition,
      averageSpeed: vehicles.length > 0 ? totalSpeed / vehicles.length : 0,
      activeTransitions: transitionCounts
    };
  }
}