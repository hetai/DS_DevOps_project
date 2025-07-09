/**
 * Phase 2 Integration Test - Verify event-driven animation system
 * Tests the complete integration of OpenSCENARIO event processing
 */

import { describe, test, expect, vi } from 'vitest';
import { EventProcessor } from '../components/visualization/utils/EventProcessor';
import { VehicleStateManager } from '../components/visualization/utils/VehicleStateManager';
import { OpenScenarioParser } from '../components/visualization/parsers/OpenScenarioParser';
import { ScenarioEvent, EVENT_TYPE_REGISTRY } from '../components/visualization/types/ScenarioEventTypes';
import { VehicleElement } from '../components/visualization/types/VisualizationTypes';
import * as THREE from 'three';

describe('Phase 2 Integration Tests', () => {
  describe('Event Processing System', () => {
    test('should create and process scenario events', () => {
      // Create test scenario events
      const events: ScenarioEvent[] = [
        {
          id: 'test-event-1',
          time: 1.0,
          type: 'speed_change',
          vehicleId: 'vehicle-1',
          name: 'Speed Change Event',
          priority: 'overwrite',
          maximumExecutionCount: 1,
          status: 'pending',
          parameters: {
            targetSpeed: 15,
            speedChangeType: 'absolute',
            speedDynamics: {
              dynamicsShape: 'linear',
              value: 2.0,
              dynamicsDimension: 'time'
            }
          },
          duration: 2.0
        },
        {
          id: 'test-event-2',
          time: 3.0,
          type: 'lane_change',
          vehicleId: 'vehicle-1',
          name: 'Lane Change Event',
          priority: 'overwrite',
          maximumExecutionCount: 1,
          status: 'pending',
          parameters: {
            targetLane: 2,
            laneChangeType: 'absolute',
            laneChangeDynamics: {
              dynamicsShape: 'linear',
              value: 3.0,
              dynamicsDimension: 'time'
            }
          },
          duration: 3.0
        }
      ];

      // Initialize event processor
      const processor = new EventProcessor(events);
      
      // Verify initial state
      expect(processor.getState().allEvents).toHaveLength(2);
      expect(processor.getState().pendingEvents).toHaveLength(2);
      expect(processor.getState().activeEvents).toHaveLength(0);
      expect(processor.getState().completedEvents).toHaveLength(0);
    });

    test('should process events at specific times', () => {
      const events: ScenarioEvent[] = [
        {
          id: 'time-event',
          time: 2.0,
          type: 'vehicle_start',
          vehicleId: 'test-vehicle',
          name: 'Vehicle Start',
          priority: 'overwrite',
          maximumExecutionCount: 1,
          status: 'pending',
          parameters: {
            targetSpeed: 10
          },
          duration: 0
        }
      ];

      const processor = new EventProcessor(events);
      
      // Test vehicles
      const vehicles: VehicleElement[] = [
        {
          id: 'test-vehicle',
          type: 'car',
          position: new THREE.Vector3(0, 0, 0),
          rotation: new THREE.Euler(0, 0, 0),
          speed: 0,
          timestamp: 0
        }
      ];

      // Process at time before event
      let result = processor.processEventsAtTime(1.0, vehicles);
      expect(result.triggeredEvents).toHaveLength(0);
      expect(result.vehicleStateUpdates).toHaveLength(0);

      // Process at event time
      result = processor.processEventsAtTime(2.0, vehicles);
      expect(result.triggeredEvents).toHaveLength(1);
      expect(result.triggeredEvents[0].id).toBe('time-event');
    });

    test('should generate event visualization data', () => {
      const events: ScenarioEvent[] = [
        {
          id: 'viz-event',
          time: 1.0,
          type: 'speed_change',
          vehicleId: 'vehicle-1',
          name: 'Speed Test',
          priority: 'overwrite',
          maximumExecutionCount: 1,
          status: 'pending',
          parameters: {
            targetSpeed: 20
          },
          duration: 1.0
        }
      ];

      const processor = new EventProcessor(events);
      const vizData = processor.getEventsForVisualization(10.0);
      
      expect(vizData).toHaveLength(1);
      expect(vizData[0].event.id).toBe('viz-event');
      expect(vizData[0].color).toBe(EVENT_TYPE_REGISTRY.speed_change.color);
      expect(vizData[0].displayName).toBe(EVENT_TYPE_REGISTRY.speed_change.displayName);
      expect(vizData[0].timelinePosition).toBe(0.1); // 1.0 / 10.0
    });
  });

  describe('Vehicle State Management', () => {
    test('should initialize vehicles with enhanced state', () => {
      const vehicles: VehicleElement[] = [
        {
          id: 'test-vehicle',
          type: 'car',
          position: new THREE.Vector3(10, 0, 0),
          rotation: new THREE.Euler(0, 0, 0),
          speed: 5,
          timestamp: 0,
          trajectory: [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(10, 0, 0),
            new THREE.Vector3(20, 0, 0)
          ]
        }
      ];

      const stateManager = new VehicleStateManager();
      stateManager.initializeVehicles(vehicles);

      const enhancedState = stateManager.getVehicleState('test-vehicle');
      expect(enhancedState).toBeDefined();
      expect(enhancedState!.currentSpeed).toBe(5);
      expect(enhancedState!.targetSpeed).toBe(5);
      expect(enhancedState!.isInTransition).toBe(false);
      expect(enhancedState!.eventTrajectory).toHaveLength(3);
    });

    test('should apply speed change updates', () => {
      const vehicles: VehicleElement[] = [
        {
          id: 'speed-vehicle',
          type: 'car',
          position: new THREE.Vector3(0, 0, 0),
          rotation: new THREE.Euler(0, 0, 0),
          speed: 10,
          timestamp: 0
        }
      ];

      const stateManager = new VehicleStateManager();
      stateManager.initializeVehicles(vehicles);

      const speedUpdate = {
        vehicleId: 'speed-vehicle',
        timestamp: 1.0,
        stateChange: 'speed_change' as const,
        parameters: {
          targetSpeed: 20,
          speedDynamics: {
            dynamicsShape: 'linear' as const,
            value: 2.0,
            dynamicsDimension: 'time' as const
          }
        },
        transitionDuration: 2.0,
        priority: 'overwrite' as const
      };

      stateManager.applyStateUpdates([speedUpdate], 1.0);

      const state = stateManager.getVehicleState('speed-vehicle');
      expect(state!.targetSpeed).toBe(20);
      expect(state!.isInTransition).toBe(true);
      expect(state!.transitionType).toBe('speed');
    });

    test('should update vehicle states during animation', () => {
      const vehicles: VehicleElement[] = [
        {
          id: 'anim-vehicle',
          type: 'car',
          position: new THREE.Vector3(0, 0, 0),
          rotation: new THREE.Euler(0, 0, 0),
          speed: 0,
          timestamp: 0
        }
      ];

      const stateManager = new VehicleStateManager();
      stateManager.initializeVehicles(vehicles);

      // Start a speed transition
      const speedUpdate = {
        vehicleId: 'anim-vehicle',
        timestamp: 0,
        stateChange: 'speed_change' as const,
        parameters: {
          targetSpeed: 10
        },
        transitionDuration: 2.0,
        priority: 'overwrite' as const
      };

      stateManager.applyStateUpdates([speedUpdate], 0);

      // Update at halfway point
      stateManager.updateVehicleStates(1.0);

      const state = stateManager.getVehicleState('anim-vehicle');
      expect(state!.currentSpeed).toBeGreaterThan(0);
      expect(state!.currentSpeed).toBeLessThan(10);
      expect(state!.isInTransition).toBe(true);
    });

    test('should convert enhanced states back to vehicle elements', () => {
      const vehicles: VehicleElement[] = [
        {
          id: 'convert-vehicle',
          type: 'truck',
          position: new THREE.Vector3(5, 5, 0),
          rotation: new THREE.Euler(0, 1, 0),
          speed: 15,
          timestamp: 2.0
        }
      ];

      const stateManager = new VehicleStateManager();
      stateManager.initializeVehicles(vehicles);

      const convertedVehicles = stateManager.convertAllToVehicleElements();
      
      expect(convertedVehicles).toHaveLength(1);
      expect(convertedVehicles[0].id).toBe('convert-vehicle');
      expect(convertedVehicles[0].type).toBe('truck');
      expect(convertedVehicles[0].speed).toBe(15);
    });
  });

  describe('Enhanced OpenSCENARIO Parser', () => {
    test('should generate scenario events from storyboard', () => {
      const parser = new OpenScenarioParser();
      
      // Mock storyboard structure
      const mockStoryboard = {
        init: {
          actions: {
            private: [
              {
                entityRef: 'vehicle-1',
                actions: [
                  {
                    type: 'teleport',
                    position: {
                      type: 'world',
                      x: 0,
                      y: 0,
                      z: 0
                    }
                  }
                ]
              }
            ]
          }
        },
        story: [
          {
            name: 'MainStory',
            act: [
              {
                name: 'Act1',
                startTrigger: {
                  conditionGroup: [
                    {
                      condition: [
                        {
                          name: 'StartCondition',
                          type: 'byValue',
                          conditionType: 'simulationTime',
                          value: 1.0,
                          rule: 'greaterThan'
                        }
                      ]
                    }
                  ]
                },
                maneuverGroup: [
                  {
                    actors: {
                      entityRef: [
                        { entityRef: 'vehicle-1' }
                      ]
                    },
                    maneuver: [
                      {
                        name: 'SpeedManeuver',
                        event: [
                          {
                            name: 'SpeedEvent',
                            priority: 'overwrite',
                            maximumExecutionCount: 1,
                            action: [
                              {
                                name: 'SpeedAction',
                                type: 'speed',
                                speedTarget: {
                                  type: 'absolute',
                                  value: 15
                                },
                                speedDynamics: {
                                  dynamicsShape: 'linear',
                                  value: 2.0,
                                  dynamicsDimension: 'time'
                                }
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };

      const events = parser.generateScenarioEvents(mockStoryboard);
      
      expect(events.length).toBeGreaterThan(0);
      
      // Check for init action
      const initEvent = events.find(e => e.name === 'Init Action');
      expect(initEvent).toBeDefined();
      expect(initEvent!.type).toBe('teleport');
      expect(initEvent!.time).toBe(0);

      // Check for speed event
      const speedEvent = events.find(e => e.type === 'speed_change');
      expect(speedEvent).toBeDefined();
      expect(speedEvent!.parameters.targetSpeed).toBe(15);
    });
  });

  describe('Event Type Registry', () => {
    test('should have correct event type metadata', () => {
      // Test all event types are defined
      expect(EVENT_TYPE_REGISTRY.vehicle_start).toBeDefined();
      expect(EVENT_TYPE_REGISTRY.vehicle_stop).toBeDefined();
      expect(EVENT_TYPE_REGISTRY.speed_change).toBeDefined();
      expect(EVENT_TYPE_REGISTRY.lane_change).toBeDefined();
      expect(EVENT_TYPE_REGISTRY.brake_action).toBeDefined();
      expect(EVENT_TYPE_REGISTRY.teleport).toBeDefined();
      expect(EVENT_TYPE_REGISTRY.custom).toBeDefined();

      // Test event type properties
      const speedChangeType = EVENT_TYPE_REGISTRY.speed_change;
      expect(speedChangeType.displayName).toBe('Speed Change');
      expect(speedChangeType.color).toBe('#3b82f6');
      expect(speedChangeType.category).toBe('motion');
      expect(speedChangeType.icon).toBe('🏃');
    });
  });

  describe('Integration End-to-End', () => {
    test('should process complete event workflow', () => {
      // Create a complete workflow scenario
      const events: ScenarioEvent[] = [
        {
          id: 'workflow-1',
          time: 0,
          type: 'vehicle_start',
          vehicleId: 'workflow-vehicle',
          name: 'Start',
          priority: 'overwrite',
          maximumExecutionCount: 1,
          status: 'pending',
          parameters: { targetSpeed: 5 },
          duration: 0
        },
        {
          id: 'workflow-2',
          time: 2,
          type: 'speed_change',
          vehicleId: 'workflow-vehicle',
          name: 'Accelerate',
          priority: 'overwrite',
          maximumExecutionCount: 1,
          status: 'pending',
          parameters: { targetSpeed: 15 },
          duration: 3
        },
        {
          id: 'workflow-3',
          time: 6,
          type: 'vehicle_stop',
          vehicleId: 'workflow-vehicle',
          name: 'Stop',
          priority: 'overwrite',
          maximumExecutionCount: 1,
          status: 'pending',
          parameters: {},
          duration: 2
        }
      ];

      const vehicles: VehicleElement[] = [
        {
          id: 'workflow-vehicle',
          type: 'car',
          position: new THREE.Vector3(0, 0, 0),
          rotation: new THREE.Euler(0, 0, 0),
          speed: 0,
          timestamp: 0
        }
      ];

      const processor = new EventProcessor(events);
      const stateManager = new VehicleStateManager();
      stateManager.initializeVehicles(vehicles);

      // Test complete workflow at different time points
      
      // T=0: Vehicle start
      let result = processor.processEventsAtTime(0, vehicles);
      stateManager.applyStateUpdates(result.vehicleStateUpdates, 0);
      let state = stateManager.getVehicleState('workflow-vehicle');
      expect(state!.currentSpeed).toBe(5); // Started

      // T=2: Speed change begins
      result = processor.processEventsAtTime(2, vehicles);
      stateManager.applyStateUpdates(result.vehicleStateUpdates, 2);
      state = stateManager.getVehicleState('workflow-vehicle');
      expect(state!.targetSpeed).toBe(15); // Accelerating

      // T=6: Vehicle stop begins
      result = processor.processEventsAtTime(6, vehicles);
      stateManager.applyStateUpdates(result.vehicleStateUpdates, 6);
      state = stateManager.getVehicleState('workflow-vehicle');
      expect(state!.targetSpeed).toBe(0); // Stopping

      // Verify event progression
      const finalState = processor.getState();
      expect(finalState.completedEvents.length).toBeGreaterThan(0);
    });

    test('should provide correct statistics', () => {
      const events: ScenarioEvent[] = [
        {
          id: 'stat-1',
          time: 1,
          type: 'speed_change',
          vehicleId: 'vehicle-1',
          name: 'Speed 1',
          priority: 'overwrite',
          maximumExecutionCount: 1,
          status: 'pending',
          parameters: {},
          duration: 2
        },
        {
          id: 'stat-2',
          time: 3,
          type: 'lane_change',
          vehicleId: 'vehicle-2',
          name: 'Lane 1',
          priority: 'overwrite',
          maximumExecutionCount: 1,
          status: 'pending',
          parameters: {},
          duration: 1
        }
      ];

      const processor = new EventProcessor(events);
      const stats = processor.getEventStatistics();

      expect(stats.totalEvents).toBe(2);
      expect(stats.eventsByType.speed_change).toBe(1);
      expect(stats.eventsByType.lane_change).toBe(1);
      expect(stats.eventsByVehicle['vehicle-1']).toBe(1);
      expect(stats.eventsByVehicle['vehicle-2']).toBe(1);
      expect(stats.totalScenarioDuration).toBe(4); // max(1+2, 3+1)
    });
  });
});