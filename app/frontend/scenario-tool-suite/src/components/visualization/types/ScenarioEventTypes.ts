/**
 * ScenarioEvent Types - Event-driven animation system for Phase 2
 * Defines interfaces for OpenSCENARIO event integration
 */

import * as THREE from 'three';

/**
 * Core scenario event interface
 */
export interface ScenarioEvent {
  id: string;
  time: number;
  type: 'vehicle_start' | 'vehicle_stop' | 'speed_change' | 'lane_change' | 'brake_action' | 'teleport' | 'custom';
  vehicleId: string;
  name: string;
  priority: 'overwrite' | 'skip' | 'parallel';
  maximumExecutionCount: number;
  parameters: ScenarioEventParameters;
  duration?: number;
  startTrigger?: EventTrigger;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  originalAction?: any; // Reference to original OpenSCENARIO action
}

/**
 * Event parameters for different action types
 */
export interface ScenarioEventParameters {
  // Speed change parameters
  targetSpeed?: number;
  speedChangeType?: 'absolute' | 'relative';
  speedDynamics?: {
    dynamicsShape: 'linear' | 'cubic' | 'sinusoidal' | 'step';
    value: number;
    dynamicsDimension: 'time' | 'distance' | 'rate';
  };
  
  // Lane change parameters
  targetLane?: number;
  laneChangeType?: 'absolute' | 'relative';
  laneChangeDynamics?: {
    dynamicsShape: 'linear' | 'cubic' | 'sinusoidal' | 'step';
    value: number;
    dynamicsDimension: 'time' | 'distance' | 'rate';
  };
  
  // Teleport parameters
  targetPosition?: {
    type: 'world' | 'lane' | 'road';
    x?: number;
    y?: number;
    z?: number;
    h?: number; // heading
    p?: number; // pitch
    r?: number; // roll
    roadId?: string;
    laneId?: string;
    s?: number; // s-coordinate
    t?: number; // t-coordinate
    offset?: number;
  };
  
  // Brake action parameters
  brakeForce?: number;
  
  // Custom parameters
  customData?: Record<string, any>;
}

/**
 * Event trigger conditions
 */
export interface EventTrigger {
  conditionGroups: ConditionGroup[];
}

export interface ConditionGroup {
  conditions: TriggerCondition[];
}

export interface TriggerCondition {
  name: string;
  delay: number;
  conditionEdge: 'rising' | 'falling' | 'risingOrFalling' | 'none';
  type: 'byValue' | 'byEntity';
  
  // By-value conditions
  simulationTime?: {
    value: number;
    rule: 'equalTo' | 'greaterThan' | 'lessThan' | 'greaterEqualThan' | 'lessEqualThan';
  };
  
  // By-entity conditions
  triggeringEntities?: {
    triggeringEntitiesRule: 'any' | 'all';
    entityRefs: string[];
  };
  
  speedCondition?: {
    value: number;
    rule: 'equalTo' | 'greaterThan' | 'lessThan' | 'greaterEqualThan' | 'lessEqualThan';
  };
  
  distanceCondition?: {
    value: number;
    rule: 'equalTo' | 'greaterThan' | 'lessThan' | 'greaterEqualThan' | 'lessEqualThan';
    freespace: boolean;
    position?: ScenarioEventParameters['targetPosition'];
  };
}

/**
 * Vehicle state update from event processing
 */
export interface VehicleStateUpdate {
  vehicleId: string;
  timestamp: number;
  stateChange: ScenarioEvent['type'];
  parameters: ScenarioEventParameters;
  transitionDuration: number;
  priority: ScenarioEvent['priority'];
}

/**
 * Event processing result
 */
export interface EventProcessingResult {
  triggeredEvents: ScenarioEvent[];
  vehicleStateUpdates: VehicleStateUpdate[];
  completedEvents: ScenarioEvent[];
  nextEventTime: number | null;
}

/**
 * Event manager state
 */
export interface EventManagerState {
  allEvents: ScenarioEvent[];
  activeEvents: ScenarioEvent[];
  completedEvents: ScenarioEvent[];
  pendingEvents: ScenarioEvent[];
  currentTime: number;
  lastProcessedTime: number;
  processingEnabled: boolean;
}

/**
 * Event visualization data
 */
export interface EventVisualizationData {
  event: ScenarioEvent;
  timelinePosition: number; // 0-1 normalized position on timeline
  color: string;
  icon: string;
  displayName: string;
  description: string;
  isActive: boolean;
  isCompleted: boolean;
}

/**
 * Event type metadata for visualization
 */
export interface EventTypeMetadata {
  type: ScenarioEvent['type'];
  displayName: string;
  description: string;
  color: string;
  icon: string;
  category: 'motion' | 'position' | 'state' | 'custom';
}

/**
 * Event type registry
 */
export const EVENT_TYPE_REGISTRY: Record<ScenarioEvent['type'], EventTypeMetadata> = {
  vehicle_start: {
    type: 'vehicle_start',
    displayName: 'Vehicle Start',
    description: 'Vehicle begins movement',
    color: '#22c55e', // green
    icon: '🚀',
    category: 'state'
  },
  vehicle_stop: {
    type: 'vehicle_stop',
    displayName: 'Vehicle Stop',
    description: 'Vehicle comes to a complete stop',
    color: '#ef4444', // red
    icon: '🛑',
    category: 'state'
  },
  speed_change: {
    type: 'speed_change',
    displayName: 'Speed Change',
    description: 'Vehicle changes speed',
    color: '#3b82f6', // blue
    icon: '🏃',
    category: 'motion'
  },
  lane_change: {
    type: 'lane_change',
    displayName: 'Lane Change',
    description: 'Vehicle changes lanes',
    color: '#8b5cf6', // purple
    icon: '↔️',
    category: 'motion'
  },
  brake_action: {
    type: 'brake_action',
    displayName: 'Brake Action',
    description: 'Vehicle applies brakes',
    color: '#f59e0b', // amber
    icon: '🛑',
    category: 'motion'
  },
  teleport: {
    type: 'teleport',
    displayName: 'Teleport',
    description: 'Vehicle teleports to new position',
    color: '#06b6d4', // cyan
    icon: '✨',
    category: 'position'
  },
  custom: {
    type: 'custom',
    displayName: 'Custom Event',
    description: 'Custom scenario event',
    color: '#64748b', // slate
    icon: '⚙️',
    category: 'custom'
  }
};

/**
 * Event filter options
 */
export interface EventFilterOptions {
  eventTypes: ScenarioEvent['type'][];
  vehicleIds: string[];
  timeRange: {
    start: number;
    end: number;
  };
  categories: EventTypeMetadata['category'][];
  onlyActive: boolean;
  onlyCompleted: boolean;
}

/**
 * Event statistics
 */
export interface EventStatistics {
  totalEvents: number;
  eventsByType: Record<ScenarioEvent['type'], number>;
  eventsByVehicle: Record<string, number>;
  eventsByCategory: Record<EventTypeMetadata['category'], number>;
  averageEventDuration: number;
  totalScenarioDuration: number;
  eventsPerSecond: number;
}