/**
 * Event Processor - Core event-driven animation system
 * Handles ScenarioEvent processing and vehicle state updates
 */

import {
  ScenarioEvent,
  VehicleStateUpdate,
  EventProcessingResult,
  EventManagerState,
  TriggerCondition,
  EventTrigger,
  EVENT_TYPE_REGISTRY,
  EventVisualizationData,
  EventFilterOptions,
  EventStatistics
} from '../types/ScenarioEventTypes';
import { VehicleElement } from '../types/VisualizationTypes';

export class EventProcessor {
  private state: EventManagerState;
  private eventCallbacks: Map<string, (event: ScenarioEvent) => void> = new Map();
  
  constructor(events: ScenarioEvent[] = []) {
    this.state = {
      allEvents: [...events].sort((a, b) => a.time - b.time),
      activeEvents: [],
      completedEvents: [],
      pendingEvents: [...events].sort((a, b) => a.time - b.time),
      currentTime: 0,
      lastProcessedTime: 0,
      processingEnabled: true
    };
  }

  /**
   * Process events at current time
   */
  public processEventsAtTime(currentTime: number, vehicles: VehicleElement[]): EventProcessingResult {
    if (!this.state.processingEnabled) {
      return {
        triggeredEvents: [],
        vehicleStateUpdates: [],
        completedEvents: [],
        nextEventTime: this.getNextEventTime()
      };
    }

    this.state.currentTime = currentTime;
    const result: EventProcessingResult = {
      triggeredEvents: [],
      vehicleStateUpdates: [],
      completedEvents: [],
      nextEventTime: null
    };

    // Process trigger conditions for pending events
    const triggeredEvents = this.evaluateEventTriggers(currentTime, vehicles);
    result.triggeredEvents = triggeredEvents;

    // Activate triggered events
    for (const event of triggeredEvents) {
      this.activateEvent(event);
    }

    // Process active events
    const activeEventUpdates = this.processActiveEvents(currentTime, vehicles);
    result.vehicleStateUpdates.push(...activeEventUpdates);

    // Check for completed events
    const completedEvents = this.checkCompletedEvents(currentTime);
    result.completedEvents = completedEvents;

    // Complete finished events
    for (const event of completedEvents) {
      this.completeEvent(event);
    }

    // Calculate next event time
    result.nextEventTime = this.getNextEventTime();

    this.state.lastProcessedTime = currentTime;
    return result;
  }

  /**
   * Evaluate event triggers to determine which events should be activated
   */
  private evaluateEventTriggers(currentTime: number, vehicles: VehicleElement[]): ScenarioEvent[] {
    const triggeredEvents: ScenarioEvent[] = [];

    for (const event of this.state.pendingEvents) {
      if (this.shouldTriggerEvent(event, currentTime, vehicles)) {
        triggeredEvents.push(event);
      }
    }

    return triggeredEvents;
  }

  /**
   * Check if an event should be triggered
   */
  private shouldTriggerEvent(event: ScenarioEvent, currentTime: number, vehicles: VehicleElement[]): boolean {
    // Simple time-based trigger
    if (currentTime >= event.time) {
      return true;
    }

    // Evaluate complex trigger conditions
    if (event.startTrigger) {
      return this.evaluateEventTrigger(event.startTrigger, currentTime, vehicles);
    }

    return false;
  }

  /**
   * Evaluate complex trigger conditions
   */
  private evaluateEventTrigger(trigger: EventTrigger, currentTime: number, vehicles: VehicleElement[]): boolean {
    // All condition groups must be satisfied (AND logic)
    for (const conditionGroup of trigger.conditionGroups) {
      // Any condition in the group must be satisfied (OR logic)
      let groupSatisfied = false;
      
      for (const condition of conditionGroup.conditions) {
        if (this.evaluateCondition(condition, currentTime, vehicles)) {
          groupSatisfied = true;
          break;
        }
      }
      
      if (!groupSatisfied) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate individual trigger condition
   */
  private evaluateCondition(condition: TriggerCondition, currentTime: number, vehicles: VehicleElement[]): boolean {
    const effectiveTime = currentTime - condition.delay;
    
    if (condition.type === 'byValue') {
      if (condition.simulationTime) {
        const value = condition.simulationTime.value;
        const rule = condition.simulationTime.rule;
        
        switch (rule) {
          case 'equalTo':
            return Math.abs(effectiveTime - value) < 0.1;
          case 'greaterThan':
            return effectiveTime > value;
          case 'lessThan':
            return effectiveTime < value;
          case 'greaterEqualThan':
            return effectiveTime >= value;
          case 'lessEqualThan':
            return effectiveTime <= value;
          default:
            return false;
        }
      }
    } else if (condition.type === 'byEntity') {
      if (condition.triggeringEntities) {
        const entityRefs = condition.triggeringEntities.entityRefs;
        const rule = condition.triggeringEntities.triggeringEntitiesRule;
        
        const relevantVehicles = vehicles.filter(v => entityRefs.includes(v.id));
        
        if (condition.speedCondition) {
          const results = relevantVehicles.map(vehicle => {
            const speed = vehicle.speed || 0;
            const targetSpeed = condition.speedCondition!.value;
            
            switch (condition.speedCondition!.rule) {
              case 'equalTo':
                return Math.abs(speed - targetSpeed) < 0.5;
              case 'greaterThan':
                return speed > targetSpeed;
              case 'lessThan':
                return speed < targetSpeed;
              case 'greaterEqualThan':
                return speed >= targetSpeed;
              case 'lessEqualThan':
                return speed <= targetSpeed;
              default:
                return false;
            }
          });
          
          return rule === 'any' ? results.some(r => r) : results.every(r => r);
        }
        
        if (condition.distanceCondition) {
          // Simplified distance condition evaluation
          // In a real implementation, this would calculate actual distances
          return true; // Placeholder
        }
      }
    }

    return false;
  }

  /**
   * Activate an event
   */
  private activateEvent(event: ScenarioEvent): void {
    // Remove from pending
    this.state.pendingEvents = this.state.pendingEvents.filter(e => e.id !== event.id);
    
    // Add to active
    event.status = 'active';
    this.state.activeEvents.push(event);
    
    // Trigger callback if registered
    const callback = this.eventCallbacks.get(event.id);
    if (callback) {
      callback(event);
    }
    
    console.log(`Event activated: ${event.name} (${event.type}) for vehicle ${event.vehicleId} at time ${event.time}`);
  }

  /**
   * Process active events and generate vehicle state updates
   */
  private processActiveEvents(currentTime: number, vehicles: VehicleElement[]): VehicleStateUpdate[] {
    const updates: VehicleStateUpdate[] = [];

    for (const event of this.state.activeEvents) {
      const update = this.createVehicleStateUpdate(event, currentTime);
      if (update) {
        updates.push(update);
      }
    }

    return updates;
  }

  /**
   * Create vehicle state update from event
   */
  private createVehicleStateUpdate(event: ScenarioEvent, currentTime: number): VehicleStateUpdate | null {
    const elapsedTime = currentTime - event.time;
    
    // Skip if event hasn't started yet
    if (elapsedTime < 0) {
      return null;
    }

    const update: VehicleStateUpdate = {
      vehicleId: event.vehicleId,
      timestamp: currentTime,
      stateChange: event.type,
      parameters: event.parameters,
      transitionDuration: event.duration || 0,
      priority: event.priority
    };

    return update;
  }

  /**
   * Check for completed events
   */
  private checkCompletedEvents(currentTime: number): ScenarioEvent[] {
    const completedEvents: ScenarioEvent[] = [];

    for (const event of this.state.activeEvents) {
      if (this.isEventCompleted(event, currentTime)) {
        completedEvents.push(event);
      }
    }

    return completedEvents;
  }

  /**
   * Check if an event is completed
   */
  private isEventCompleted(event: ScenarioEvent, currentTime: number): boolean {
    const elapsedTime = currentTime - event.time;
    const duration = event.duration || 0;
    
    // Event is completed if duration has elapsed
    return elapsedTime >= duration;
  }

  /**
   * Complete an event
   */
  private completeEvent(event: ScenarioEvent): void {
    // Remove from active
    this.state.activeEvents = this.state.activeEvents.filter(e => e.id !== event.id);
    
    // Add to completed
    event.status = 'completed';
    this.state.completedEvents.push(event);
    
    console.log(`Event completed: ${event.name} (${event.type}) for vehicle ${event.vehicleId}`);
  }

  /**
   * Get next event time
   */
  private getNextEventTime(): number | null {
    if (this.state.pendingEvents.length === 0) {
      return null;
    }

    return this.state.pendingEvents[0].time;
  }

  /**
   * Get events for timeline visualization
   */
  public getEventsForVisualization(
    timelineDuration: number,
    filterOptions?: EventFilterOptions
  ): EventVisualizationData[] {
    let events = this.state.allEvents;

    // Apply filters
    if (filterOptions) {
      events = this.applyEventFilters(events, filterOptions);
    }

    return events.map(event => ({
      event,
      timelinePosition: event.time / timelineDuration,
      color: EVENT_TYPE_REGISTRY[event.type].color,
      icon: EVENT_TYPE_REGISTRY[event.type].icon,
      displayName: EVENT_TYPE_REGISTRY[event.type].displayName,
      description: this.generateEventDescription(event),
      isActive: this.state.activeEvents.includes(event),
      isCompleted: this.state.completedEvents.includes(event)
    }));
  }

  /**
   * Apply event filters
   */
  private applyEventFilters(events: ScenarioEvent[], filterOptions: EventFilterOptions): ScenarioEvent[] {
    return events.filter(event => {
      // Filter by event types
      if (filterOptions.eventTypes.length > 0 && !filterOptions.eventTypes.includes(event.type)) {
        return false;
      }

      // Filter by vehicle IDs
      if (filterOptions.vehicleIds.length > 0 && !filterOptions.vehicleIds.includes(event.vehicleId)) {
        return false;
      }

      // Filter by time range
      if (event.time < filterOptions.timeRange.start || event.time > filterOptions.timeRange.end) {
        return false;
      }

      // Filter by categories
      if (filterOptions.categories.length > 0) {
        const eventCategory = EVENT_TYPE_REGISTRY[event.type].category;
        if (!filterOptions.categories.includes(eventCategory)) {
          return false;
        }
      }

      // Filter by status
      if (filterOptions.onlyActive && !this.state.activeEvents.includes(event)) {
        return false;
      }

      if (filterOptions.onlyCompleted && !this.state.completedEvents.includes(event)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Generate event description
   */
  private generateEventDescription(event: ScenarioEvent): string {
    const baseDescription = EVENT_TYPE_REGISTRY[event.type].description;
    
    switch (event.type) {
      case 'speed_change':
        const targetSpeed = event.parameters.targetSpeed;
        if (targetSpeed !== undefined) {
          return `${baseDescription} to ${targetSpeed} m/s`;
        }
        break;
      case 'lane_change':
        const targetLane = event.parameters.targetLane;
        if (targetLane !== undefined) {
          return `${baseDescription} to lane ${targetLane}`;
        }
        break;
      case 'teleport':
        const pos = event.parameters.targetPosition;
        if (pos && pos.type === 'world') {
          return `${baseDescription} to (${pos.x?.toFixed(1)}, ${pos.y?.toFixed(1)})`;
        }
        break;
    }

    return baseDescription;
  }

  /**
   * Get event statistics
   */
  public getEventStatistics(): EventStatistics {
    const stats: EventStatistics = {
      totalEvents: this.state.allEvents.length,
      eventsByType: {} as Record<ScenarioEvent['type'], number>,
      eventsByVehicle: {},
      eventsByCategory: {} as Record<string, number>,
      averageEventDuration: 0,
      totalScenarioDuration: 0,
      eventsPerSecond: 0
    };

    // Initialize counters
    for (const eventType of Object.keys(EVENT_TYPE_REGISTRY) as ScenarioEvent['type'][]) {
      stats.eventsByType[eventType] = 0;
    }

    // Count events
    let totalDuration = 0;
    let maxTime = 0;
    
    for (const event of this.state.allEvents) {
      stats.eventsByType[event.type]++;
      
      // Count by vehicle
      if (!stats.eventsByVehicle[event.vehicleId]) {
        stats.eventsByVehicle[event.vehicleId] = 0;
      }
      stats.eventsByVehicle[event.vehicleId]++;
      
      // Count by category
      const category = EVENT_TYPE_REGISTRY[event.type].category;
      if (!stats.eventsByCategory[category]) {
        stats.eventsByCategory[category] = 0;
      }
      stats.eventsByCategory[category]++;
      
      // Duration calculations
      totalDuration += event.duration || 0;
      maxTime = Math.max(maxTime, event.time + (event.duration || 0));
    }

    stats.averageEventDuration = stats.totalEvents > 0 ? totalDuration / stats.totalEvents : 0;
    stats.totalScenarioDuration = maxTime;
    stats.eventsPerSecond = stats.totalScenarioDuration > 0 ? stats.totalEvents / stats.totalScenarioDuration : 0;

    return stats;
  }

  /**
   * Register event callback
   */
  public registerEventCallback(eventId: string, callback: (event: ScenarioEvent) => void): void {
    this.eventCallbacks.set(eventId, callback);
  }

  /**
   * Unregister event callback
   */
  public unregisterEventCallback(eventId: string): void {
    this.eventCallbacks.delete(eventId);
  }

  /**
   * Reset event processor
   */
  public reset(): void {
    this.state.activeEvents = [];
    this.state.completedEvents = [];
    this.state.pendingEvents = [...this.state.allEvents].sort((a, b) => a.time - b.time);
    this.state.currentTime = 0;
    this.state.lastProcessedTime = 0;
    
    // Reset event status
    for (const event of this.state.allEvents) {
      event.status = 'pending';
    }
  }

  /**
   * Enable/disable event processing
   */
  public setProcessingEnabled(enabled: boolean): void {
    this.state.processingEnabled = enabled;
  }

  /**
   * Get current state
   */
  public getState(): EventManagerState {
    return { ...this.state };
  }

  /**
   * Update events (replace all events)
   */
  public updateEvents(events: ScenarioEvent[]): void {
    this.state.allEvents = [...events].sort((a, b) => a.time - b.time);
    this.reset();
  }

  /**
   * Get events by vehicle
   */
  public getEventsByVehicle(vehicleId: string): ScenarioEvent[] {
    return this.state.allEvents.filter(event => event.vehicleId === vehicleId);
  }

  /**
   * Get events by type
   */
  public getEventsByType(eventType: ScenarioEvent['type']): ScenarioEvent[] {
    return this.state.allEvents.filter(event => event.type === eventType);
  }

  /**
   * Get events in time range
   */
  public getEventsInTimeRange(startTime: number, endTime: number): ScenarioEvent[] {
    return this.state.allEvents.filter(event => 
      event.time >= startTime && event.time <= endTime
    );
  }
}