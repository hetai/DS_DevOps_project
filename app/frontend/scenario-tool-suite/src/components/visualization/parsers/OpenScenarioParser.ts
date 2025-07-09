/**
 * OpenSCENARIO Parser - Converts .xosc files to visualization data
 * Parses scenarios and generates timeline events and entity data
 */

import * as THREE from 'three';
import {
  OpenScenarioFile,
  OpenScenarioScenarioObject,
  OpenScenarioStoryboard,
  OpenScenarioPosition,
  OpenScenarioEvent
} from '../types/OpenScenarioTypes';
import {
  ParsedOpenScenario,
  VehicleElement,
  EventElement,
  TimelineEvent
} from '../types/VisualizationTypes';
import { 
  ScenarioEvent, 
  ScenarioEventParameters, 
  EventTrigger, 
  ConditionGroup, 
  TriggerCondition 
} from '../types/ScenarioEventTypes';
import { MathUtils } from '../utils/MathUtils';

export class OpenScenarioParser {
  private parser: DOMParser = new DOMParser();
  
  /**
   * Parse OpenSCENARIO XML content
   */
  public async parseFromXML(xmlContent: string): Promise<ParsedOpenScenario> {
    try {
      const doc = this.parser.parseFromString(xmlContent, 'application/xml');
      
      // Check for parsing errors
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new Error(`XML parsing error: ${parseError.textContent}`);
      }
      
      const openScenarioElement = doc.querySelector('OpenSCENARIO');
      if (!openScenarioElement) {
        throw new Error('Invalid OpenSCENARIO file: Missing OpenSCENARIO root element');
      }
      
      return this.parseOpenScenarioElement(openScenarioElement);
      
    } catch (error: any) {
      console.error('OpenSCENARIO parsing error:', error);
      throw new Error(`Failed to parse OpenSCENARIO: ${error.message}`);
    }
  }
  
  /**
   * Parse OpenSCENARIO element
   */
  private parseOpenScenarioElement(element: Element): ParsedOpenScenario {
    const header = this.parseFileHeader(element.querySelector('FileHeader'));
    const entities = this.parseEntities(element.querySelector('Entities'));
    const storyboard = this.parseStoryboard(element.querySelector('Storyboard'));
    
    // Generate timeline from storyboard
    const timeline = this.generateTimeline(storyboard);
    const duration = this.calculateScenarioDuration(timeline);
    
    // Calculate bounding box from entity positions
    const boundingBox = this.calculateBoundingBox(entities, storyboard);
    
    return {
      header,
      entities,
      storyboard,
      timeline,
      duration,
      boundingBox
    };
  }
  
  /**
   * Parse file header
   */
  private parseFileHeader(headerElement: Element | null): any {
    if (!headerElement) return null;
    
    return {
      revMajor: parseInt(headerElement.getAttribute('revMajor') || '1'),
      revMinor: parseInt(headerElement.getAttribute('revMinor') || '0'),
      date: headerElement.getAttribute('date') || '',
      description: headerElement.getAttribute('description') || '',
      name: headerElement.getAttribute('name') || '',
      author: headerElement.getAttribute('author') || ''
    };
  }
  
  /**
   * Parse entities
   */
  private parseEntities(entitiesElement: Element | null): any[] {
    if (!entitiesElement) return [];
    
    const entities: any[] = [];
    const scenarioObjects = entitiesElement.querySelectorAll('ScenarioObject');
    
    for (const objectElement of scenarioObjects) {
      const entity = this.parseScenarioObject(objectElement);
      if (entity) {
        entities.push(entity);
      }
    }
    
    return entities;
  }
  
  /**
   * Parse scenario object (entity)
   */
  private parseScenarioObject(objectElement: Element): any | null {
    try {
      const name = objectElement.getAttribute('name');
      if (!name) {
        console.warn('ScenarioObject missing name, skipping');
        return null;
      }
      
      // Check for different entity types
      const vehicleElement = objectElement.querySelector('CatalogReference, Vehicle');
      const pedestrianElement = objectElement.querySelector('Pedestrian');
      const miscObjectElement = objectElement.querySelector('MiscObject');
      
      let entityType = 'unknown';
      let entityData: any = {};
      
      if (vehicleElement) {
        entityType = 'vehicle';
        entityData = this.parseVehicle(vehicleElement);
      } else if (pedestrianElement) {
        entityType = 'pedestrian';
        entityData = this.parsePedestrian(pedestrianElement);
      } else if (miscObjectElement) {
        entityType = 'miscObject';
        entityData = this.parseMiscObject(miscObjectElement);
      }
      
      return {
        name,
        type: entityType,
        ...entityData
      };
      
    } catch (error: any) {
      console.error(`Error parsing scenario object ${objectElement.getAttribute('name')}:`, error);
      return null;
    }
  }
  
  /**
   * Parse vehicle
   */
  private parseVehicle(vehicleElement: Element): any {
    // Check if it's a catalog reference or direct vehicle definition
    if (vehicleElement.tagName === 'CatalogReference') {
      return {
        catalogName: vehicleElement.getAttribute('catalogName') || '',
        entryName: vehicleElement.getAttribute('entryName') || '',
        isCatalogReference: true,
        // Use default vehicle properties for visualization
        boundingBox: {
          center: { x: 0, y: 0, z: 0 },
          dimensions: { width: 2.0, length: 4.5, height: 1.5 }
        },
        vehicleCategory: 'car'
      };
    }
    
    // Direct vehicle definition
    const name = vehicleElement.getAttribute('name') || '';
    const vehicleCategory = vehicleElement.getAttribute('vehicleCategory') || 'car';
    
    // Parse bounding box
    const boundingBoxElement = vehicleElement.querySelector('BoundingBox');
    const boundingBox = boundingBoxElement ? this.parseBoundingBox(boundingBoxElement) : {
      center: { x: 0, y: 0, z: 0 },
      dimensions: { width: 2.0, length: 4.5, height: 1.5 }
    };
    
    // Parse performance
    const performanceElement = vehicleElement.querySelector('Performance');
    const performance = performanceElement ? {
      maxSpeed: parseFloat(performanceElement.getAttribute('maxSpeed') || '50'),
      maxAcceleration: parseFloat(performanceElement.getAttribute('maxAcceleration') || '5'),
      maxDeceleration: parseFloat(performanceElement.getAttribute('maxDeceleration') || '8')
    } : {
      maxSpeed: 50,
      maxAcceleration: 5,
      maxDeceleration: 8
    };
    
    return {
      name,
      vehicleCategory,
      boundingBox,
      performance,
      isCatalogReference: false
    };
  }
  
  /**
   * Parse pedestrian
   */
  private parsePedestrian(pedestrianElement: Element): any {
    const model = pedestrianElement.getAttribute('model') || '';
    const mass = parseFloat(pedestrianElement.getAttribute('mass') || '75');
    const name = pedestrianElement.getAttribute('name') || '';
    const pedestrianCategory = pedestrianElement.getAttribute('pedestrianCategory') || 'pedestrian';
    
    const boundingBoxElement = pedestrianElement.querySelector('BoundingBox');
    const boundingBox = boundingBoxElement ? this.parseBoundingBox(boundingBoxElement) : {
      center: { x: 0, y: 0, z: 0 },
      dimensions: { width: 0.6, length: 0.6, height: 1.8 }
    };
    
    return {
      model,
      mass,
      name,
      pedestrianCategory,
      boundingBox
    };
  }
  
  /**
   * Parse misc object
   */
  private parseMiscObject(miscObjectElement: Element): any {
    const mass = parseFloat(miscObjectElement.getAttribute('mass') || '0');
    const name = miscObjectElement.getAttribute('name') || '';
    const miscObjectCategory = miscObjectElement.getAttribute('miscObjectCategory') || 'obstacle';
    
    const boundingBoxElement = miscObjectElement.querySelector('BoundingBox');
    const boundingBox = boundingBoxElement ? this.parseBoundingBox(boundingBoxElement) : {
      center: { x: 0, y: 0, z: 0 },
      dimensions: { width: 1.0, length: 1.0, height: 1.0 }
    };
    
    return {
      mass,
      name,
      miscObjectCategory,
      boundingBox
    };
  }
  
  /**
   * Parse bounding box
   */
  private parseBoundingBox(boundingBoxElement: Element): any {
    const centerElement = boundingBoxElement.querySelector('Center');
    const dimensionsElement = boundingBoxElement.querySelector('Dimensions');
    
    const center = centerElement ? {
      x: parseFloat(centerElement.getAttribute('x') || '0'),
      y: parseFloat(centerElement.getAttribute('y') || '0'),
      z: parseFloat(centerElement.getAttribute('z') || '0')
    } : { x: 0, y: 0, z: 0 };
    
    const dimensions = dimensionsElement ? {
      width: parseFloat(dimensionsElement.getAttribute('width') || '1'),
      length: parseFloat(dimensionsElement.getAttribute('length') || '1'),
      height: parseFloat(dimensionsElement.getAttribute('height') || '1')
    } : { width: 1, length: 1, height: 1 };
    
    return { center, dimensions };
  }
  
  /**
   * Parse storyboard
   */
  private parseStoryboard(storyboardElement: Element | null): any {
    if (!storyboardElement) return null;
    
    // Parse init actions
    const initElement = storyboardElement.querySelector('Init');
    const init = initElement ? this.parseInit(initElement) : null;
    
    // Parse stories
    const stories: any[] = [];
    const storyElements = storyboardElement.querySelectorAll('Story');
    for (const storyElement of storyElements) {
      const story = this.parseStory(storyElement);
      if (story) {
        stories.push(story);
      }
    }
    
    // Parse stop trigger
    const stopTriggerElement = storyboardElement.querySelector('StopTrigger');
    const stopTrigger = stopTriggerElement ? this.parseTrigger(stopTriggerElement) : null;
    
    return {
      init,
      story: stories,
      stopTrigger
    };
  }
  
  /**
   * Parse init actions
   */
  private parseInit(initElement: Element): any {
    const actionsElement = initElement.querySelector('Actions');
    if (!actionsElement) return null;
    
    const privateActions: any[] = [];
    const privateElements = actionsElement.querySelectorAll('Private');
    
    for (const privateElement of privateElements) {
      const entityRef = privateElement.getAttribute('entityRef');
      if (!entityRef) continue;
      
      const actions: any[] = [];
      const actionElements = privateElement.querySelectorAll('PrivateAction');
      
      for (const actionElement of actionElements) {
        const action = this.parsePrivateAction(actionElement);
        if (action) {
          actions.push(action);
        }
      }
      
      privateActions.push({
        entityRef,
        actions
      });
    }
    
    return {
      actions: {
        private: privateActions
      }
    };
  }
  
  /**
   * Parse private action
   */
  private parsePrivateAction(actionElement: Element): any | null {
    // Check for different action types
    const teleportElement = actionElement.querySelector('TeleportAction');
    const speedElement = actionElement.querySelector('LongitudinalAction SpeedAction');
    const laneChangeElement = actionElement.querySelector('LateralAction LaneChangeAction');
    
    if (teleportElement) {
      const positionElement = teleportElement.querySelector('Position');
      const position = positionElement ? this.parsePosition(positionElement) : null;
      return {
        type: 'teleport',
        position
      };
    }
    
    if (speedElement) {
      const speedTarget = this.parseSpeedTarget(speedElement.querySelector('SpeedTarget'));
      const speedDynamics = this.parseTransitionDynamics(speedElement.querySelector('SpeedActionDynamics'));
      return {
        type: 'speed',
        speedTarget,
        speedDynamics
      };
    }
    
    if (laneChangeElement) {
      const laneChangeTarget = this.parseLaneChangeTarget(laneChangeElement.querySelector('LaneChangeTarget'));
      const laneChangeDynamics = this.parseTransitionDynamics(laneChangeElement.querySelector('LaneChangeActionDynamics'));
      return {
        type: 'laneChange',
        laneChangeTarget,
        laneChangeDynamics
      };
    }
    
    return null;
  }
  
  /**
   * Parse position
   */
  private parsePosition(positionElement: Element): any {
    // Check for different position types
    const worldPositionElement = positionElement.querySelector('WorldPosition');
    const lanePositionElement = positionElement.querySelector('LanePosition');
    const roadPositionElement = positionElement.querySelector('RoadPosition');
    
    if (worldPositionElement) {
      return {
        type: 'world',
        x: parseFloat(worldPositionElement.getAttribute('x') || '0'),
        y: parseFloat(worldPositionElement.getAttribute('y') || '0'),
        z: parseFloat(worldPositionElement.getAttribute('z') || '0'),
        h: parseFloat(worldPositionElement.getAttribute('h') || '0'),
        p: parseFloat(worldPositionElement.getAttribute('p') || '0'),
        r: parseFloat(worldPositionElement.getAttribute('r') || '0')
      };
    }
    
    if (lanePositionElement) {
      return {
        type: 'lane',
        roadId: lanePositionElement.getAttribute('roadId') || '',
        laneId: lanePositionElement.getAttribute('laneId') || '',
        s: parseFloat(lanePositionElement.getAttribute('s') || '0'),
        offset: parseFloat(lanePositionElement.getAttribute('offset') || '0')
      };
    }
    
    if (roadPositionElement) {
      return {
        type: 'road',
        roadId: roadPositionElement.getAttribute('roadId') || '',
        s: parseFloat(roadPositionElement.getAttribute('s') || '0'),
        t: parseFloat(roadPositionElement.getAttribute('t') || '0')
      };
    }
    
    return null;
  }
  
  /**
   * Parse speed target
   */
  private parseSpeedTarget(speedTargetElement: Element | null): any {
    if (!speedTargetElement) return null;
    
    const absoluteElement = speedTargetElement.querySelector('AbsoluteTargetSpeed');
    const relativeElement = speedTargetElement.querySelector('RelativeTargetSpeed');
    
    if (absoluteElement) {
      return {
        type: 'absolute',
        value: parseFloat(absoluteElement.getAttribute('value') || '0')
      };
    }
    
    if (relativeElement) {
      return {
        type: 'relative',
        entityRef: relativeElement.getAttribute('entityRef') || '',
        value: parseFloat(relativeElement.getAttribute('value') || '0'),
        speedTargetValueType: relativeElement.getAttribute('speedTargetValueType') || 'delta'
      };
    }
    
    return null;
  }
  
  /**
   * Parse transition dynamics
   */
  private parseTransitionDynamics(dynamicsElement: Element | null): any {
    if (!dynamicsElement) return null;
    
    return {
      dynamicsShape: dynamicsElement.getAttribute('dynamicsShape') || 'linear',
      value: parseFloat(dynamicsElement.getAttribute('value') || '0'),
      dynamicsDimension: dynamicsElement.getAttribute('dynamicsDimension') || 'time'
    };
  }
  
  /**
   * Parse lane change target
   */
  private parseLaneChangeTarget(targetElement: Element | null): any {
    if (!targetElement) return null;
    
    const absoluteElement = targetElement.querySelector('AbsoluteTargetLane');
    const relativeElement = targetElement.querySelector('RelativeTargetLane');
    
    if (absoluteElement) {
      return {
        type: 'absolute',
        value: absoluteElement.getAttribute('value') || '0'
      };
    }
    
    if (relativeElement) {
      return {
        type: 'relative',
        entityRef: relativeElement.getAttribute('entityRef') || '',
        value: parseInt(relativeElement.getAttribute('value') || '0')
      };
    }
    
    return null;
  }
  
  /**
   * Parse story
   */
  private parseStory(storyElement: Element): any | null {
    const name = storyElement.getAttribute('name');
    if (!name) return null;
    
    const acts: any[] = [];
    const actElements = storyElement.querySelectorAll('Act');
    
    for (const actElement of actElements) {
      const act = this.parseAct(actElement);
      if (act) {
        acts.push(act);
      }
    }
    
    return {
      name,
      act: acts
    };
  }
  
  /**
   * Parse act
   */
  private parseAct(actElement: Element): any | null {
    const name = actElement.getAttribute('name');
    if (!name) return null;
    
    const maneuverGroups: any[] = [];
    const maneuverGroupElements = actElement.querySelectorAll('ManeuverGroup');
    
    for (const groupElement of maneuverGroupElements) {
      const group = this.parseManeuverGroup(groupElement);
      if (group) {
        maneuverGroups.push(group);
      }
    }
    
    // Parse triggers
    const startTriggerElement = actElement.querySelector('StartTrigger');
    const startTrigger = startTriggerElement ? this.parseTrigger(startTriggerElement) : null;
    
    const stopTriggerElement = actElement.querySelector('StopTrigger');
    const stopTrigger = stopTriggerElement ? this.parseTrigger(stopTriggerElement) : null;
    
    return {
      name,
      maneuverGroup: maneuverGroups,
      startTrigger,
      stopTrigger
    };
  }
  
  /**
   * Parse maneuver group
   */
  private parseManeuverGroup(groupElement: Element): any | null {
    const name = groupElement.getAttribute('name');
    const maximumExecutionCount = parseInt(groupElement.getAttribute('maximumExecutionCount') || '1');
    
    if (!name) return null;
    
    // Parse actors
    const actorsElement = groupElement.querySelector('Actors');
    const actors = actorsElement ? this.parseActors(actorsElement) : null;
    
    // Parse maneuvers
    const maneuvers: any[] = [];
    const maneuverElements = groupElement.querySelectorAll('Maneuver');
    
    for (const maneuverElement of maneuverElements) {
      const maneuver = this.parseManeuver(maneuverElement);
      if (maneuver) {
        maneuvers.push(maneuver);
      }
    }
    
    return {
      name,
      maximumExecutionCount,
      actors,
      maneuver: maneuvers
    };
  }
  
  /**
   * Parse actors
   */
  private parseActors(actorsElement: Element): any {
    const selectTriggeringEntities = actorsElement.getAttribute('selectTriggeringEntities') === 'true';
    
    const entityRefs: string[] = [];
    const entityRefElements = actorsElement.querySelectorAll('EntityRef');
    
    for (const refElement of entityRefElements) {
      const entityRef = refElement.getAttribute('entityRef');
      if (entityRef) {
        entityRefs.push(entityRef);
      }
    }
    
    return {
      selectTriggeringEntities,
      entityRef: entityRefs.map(ref => ({ entityRef: ref }))
    };
  }
  
  /**
   * Parse maneuver
   */
  private parseManeuver(maneuverElement: Element): any | null {
    const name = maneuverElement.getAttribute('name');
    if (!name) return null;
    
    const events: any[] = [];
    const eventElements = maneuverElement.querySelectorAll('Event');
    
    for (const eventElement of eventElements) {
      const event = this.parseEvent(eventElement);
      if (event) {
        events.push(event);
      }
    }
    
    return {
      name,
      event: events
    };
  }
  
  /**
   * Parse event
   */
  private parseEvent(eventElement: Element): any | null {
    const name = eventElement.getAttribute('name');
    const priority = eventElement.getAttribute('priority') || 'overwrite';
    const maximumExecutionCount = parseInt(eventElement.getAttribute('maximumExecutionCount') || '1');
    
    if (!name) return null;
    
    // Parse start trigger
    const startTriggerElement = eventElement.querySelector('StartTrigger');
    const startTrigger = startTriggerElement ? this.parseTrigger(startTriggerElement) : null;
    
    // Parse actions
    const actions: any[] = [];
    const actionElements = eventElement.querySelectorAll('Action');
    
    for (const actionElement of actionElements) {
      const action = this.parseAction(actionElement);
      if (action) {
        actions.push(action);
      }
    }
    
    return {
      name,
      priority,
      maximumExecutionCount,
      startTrigger,
      action: actions
    };
  }
  
  /**
   * Parse action
   */
  private parseAction(actionElement: Element): any | null {
    const name = actionElement.getAttribute('name');
    if (!name) return null;
    
    const privateActionElement = actionElement.querySelector('PrivateAction');
    if (privateActionElement) {
      const privateAction = this.parsePrivateAction(privateActionElement);
      return {
        name,
        type: 'private',
        ...privateAction
      };
    }
    
    return null;
  }
  
  /**
   * Parse trigger
   */
  private parseTrigger(triggerElement: Element): any {
    const conditionGroups: any[] = [];
    const conditionGroupElements = triggerElement.querySelectorAll('ConditionGroup');
    
    for (const groupElement of conditionGroupElements) {
      const conditions: any[] = [];
      const conditionElements = groupElement.querySelectorAll('Condition');
      
      for (const conditionElement of conditionElements) {
        const condition = this.parseCondition(conditionElement);
        if (condition) {
          conditions.push(condition);
        }
      }
      
      if (conditions.length > 0) {
        conditionGroups.push({ condition: conditions });
      }
    }
    
    return {
      conditionGroup: conditionGroups
    };
  }
  
  /**
   * Parse condition
   */
  private parseCondition(conditionElement: Element): any | null {
    const name = conditionElement.getAttribute('name');
    const delay = parseFloat(conditionElement.getAttribute('delay') || '0');
    const conditionEdge = conditionElement.getAttribute('conditionEdge') || 'rising';
    
    if (!name) return null;
    
    // Check for condition types
    const byValueElement = conditionElement.querySelector('ByValueCondition');
    const byEntityElement = conditionElement.querySelector('ByEntityCondition');
    
    let conditionData: any = {};
    
    if (byValueElement) {
      conditionData = this.parseByValueCondition(byValueElement);
      conditionData.type = 'byValue';
    } else if (byEntityElement) {
      conditionData = this.parseByEntityCondition(byEntityElement);
      conditionData.type = 'byEntity';
    }
    
    return {
      name,
      delay,
      conditionEdge,
      ...conditionData
    };
  }
  
  /**
   * Parse by-value condition
   */
  private parseByValueCondition(conditionElement: Element): any {
    const simulationTimeElement = conditionElement.querySelector('SimulationTimeCondition');
    
    if (simulationTimeElement) {
      return {
        conditionType: 'simulationTime',
        value: parseFloat(simulationTimeElement.getAttribute('value') || '0'),
        rule: simulationTimeElement.getAttribute('rule') || 'greaterThan'
      };
    }
    
    return {};
  }
  
  /**
   * Parse by-entity condition
   */
  private parseByEntityCondition(conditionElement: Element): any {
    const triggeringEntitiesElement = conditionElement.querySelector('TriggeringEntities');
    const triggeringEntities = triggeringEntitiesElement ? {
      triggeringEntitiesRule: triggeringEntitiesElement.getAttribute('triggeringEntitiesRule') || 'any',
      entityRef: Array.from(triggeringEntitiesElement.querySelectorAll('EntityRef')).map(
        ref => ref.getAttribute('entityRef') || ''
      )
    } : null;
    
    // Parse condition types
    const speedElement = conditionElement.querySelector('SpeedCondition');
    const distanceElement = conditionElement.querySelector('DistanceCondition');
    
    let conditionData: any = {};
    
    if (speedElement) {
      conditionData = {
        conditionType: 'speed',
        value: parseFloat(speedElement.getAttribute('value') || '0'),
        rule: speedElement.getAttribute('rule') || 'greaterThan'
      };
    } else if (distanceElement) {
      const positionElement = distanceElement.querySelector('Position');
      conditionData = {
        conditionType: 'distance',
        value: parseFloat(distanceElement.getAttribute('value') || '0'),
        rule: distanceElement.getAttribute('rule') || 'greaterThan',
        freespace: distanceElement.getAttribute('freespace') === 'true',
        position: positionElement ? this.parsePosition(positionElement) : null
      };
    }
    
    return {
      triggeringEntities,
      ...conditionData
    };
  }
  
  /**
   * Generate enhanced scenario events from storyboard
   */
  public generateScenarioEvents(storyboard: any): ScenarioEvent[] {
    const events: ScenarioEvent[] = [];
    let eventIdCounter = 0;
    
    if (!storyboard) return events;
    
    // Add init actions at time 0
    if (storyboard.init?.actions?.private) {
      for (const privateAction of storyboard.init.actions.private) {
        for (const action of privateAction.actions || []) {
          const event = this.convertActionToScenarioEvent(
            action,
            privateAction.entityRef,
            0,
            `init_${eventIdCounter++}`,
            'Init Action'
          );
          if (event) {
            events.push(event);
          }
        }
      }
    }
    
    // Process stories and acts
    for (const story of storyboard.story || []) {
      for (const act of story.act || []) {
        const actStartTime = this.estimateTimeFromTrigger(act.startTrigger, 0);
        
        for (const maneuverGroup of act.maneuverGroup || []) {
          const entityRefs = maneuverGroup.actors?.entityRef?.map((ref: any) => ref.entityRef) || [];
          
          for (const maneuver of maneuverGroup.maneuver || []) {
            for (const event of maneuver.event || []) {
              const eventStartTime = this.estimateTimeFromTrigger(event.startTrigger, actStartTime);
              
              // Process each entity affected by this event
              for (const entityRef of entityRefs) {
                for (const action of event.action || []) {
                  const scenarioEvent = this.convertActionToScenarioEvent(
                    action,
                    entityRef,
                    eventStartTime,
                    `${story.name}_${act.name}_${maneuver.name}_${event.name}_${eventIdCounter++}`,
                    event.name,
                    event.priority,
                    event.maximumExecutionCount,
                    event.startTrigger
                  );
                  if (scenarioEvent) {
                    events.push(scenarioEvent);
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // Sort events by time
    events.sort((a, b) => a.time - b.time);
    
    return events;
  }

  /**
   * Convert OpenSCENARIO action to ScenarioEvent
   */
  private convertActionToScenarioEvent(
    action: any,
    entityRef: string,
    eventTime: number,
    eventId: string,
    eventName: string,
    priority: string = 'overwrite',
    maximumExecutionCount: number = 1,
    startTrigger?: any
  ): ScenarioEvent | null {
    if (!action || !entityRef) return null;
    
    const baseEvent: Partial<ScenarioEvent> = {
      id: eventId,
      time: eventTime,
      vehicleId: entityRef,
      name: eventName,
      priority: priority as ScenarioEvent['priority'],
      maximumExecutionCount,
      status: 'pending',
      originalAction: action
    };
    
    // Convert trigger if present
    if (startTrigger) {
      baseEvent.startTrigger = this.convertTriggerToEventTrigger(startTrigger);
    }
    
    // Convert different action types
    switch (action.type) {
      case 'teleport':
        return {
          ...baseEvent,
          type: 'teleport',
          parameters: this.convertTeleportParameters(action),
          duration: 0 // Teleport is instantaneous
        } as ScenarioEvent;
        
      case 'speed':
        return {
          ...baseEvent,
          type: 'speed_change',
          parameters: this.convertSpeedParameters(action),
          duration: this.estimateActionDuration(action)
        } as ScenarioEvent;
        
      case 'laneChange':
        return {
          ...baseEvent,
          type: 'lane_change',
          parameters: this.convertLaneChangeParameters(action),
          duration: this.estimateActionDuration(action)
        } as ScenarioEvent;
        
      default:
        // Handle unknown action types as custom events
        return {
          ...baseEvent,
          type: 'custom',
          parameters: {
            customData: action
          },
          duration: this.estimateActionDuration(action)
        } as ScenarioEvent;
    }
  }

  /**
   * Convert teleport action parameters
   */
  private convertTeleportParameters(action: any): ScenarioEventParameters {
    const parameters: ScenarioEventParameters = {};
    
    if (action.position) {
      parameters.targetPosition = {
        type: action.position.type,
        x: action.position.x,
        y: action.position.y,
        z: action.position.z || 0,
        h: action.position.h || 0,
        p: action.position.p || 0,
        r: action.position.r || 0
      };
      
      if (action.position.type === 'lane') {
        parameters.targetPosition.roadId = action.position.roadId;
        parameters.targetPosition.laneId = action.position.laneId;
        parameters.targetPosition.s = action.position.s;
        parameters.targetPosition.offset = action.position.offset;
      } else if (action.position.type === 'road') {
        parameters.targetPosition.roadId = action.position.roadId;
        parameters.targetPosition.s = action.position.s;
        parameters.targetPosition.t = action.position.t;
      }
    }
    
    return parameters;
  }

  /**
   * Convert speed action parameters
   */
  private convertSpeedParameters(action: any): ScenarioEventParameters {
    const parameters: ScenarioEventParameters = {};
    
    if (action.speedTarget) {
      parameters.targetSpeed = action.speedTarget.value;
      parameters.speedChangeType = action.speedTarget.type;
    }
    
    if (action.speedDynamics) {
      parameters.speedDynamics = {
        dynamicsShape: action.speedDynamics.dynamicsShape,
        value: action.speedDynamics.value,
        dynamicsDimension: action.speedDynamics.dynamicsDimension
      };
    }
    
    return parameters;
  }

  /**
   * Convert lane change action parameters
   */
  private convertLaneChangeParameters(action: any): ScenarioEventParameters {
    const parameters: ScenarioEventParameters = {};
    
    if (action.laneChangeTarget) {
      parameters.targetLane = action.laneChangeTarget.value;
      parameters.laneChangeType = action.laneChangeTarget.type;
    }
    
    if (action.laneChangeDynamics) {
      parameters.laneChangeDynamics = {
        dynamicsShape: action.laneChangeDynamics.dynamicsShape,
        value: action.laneChangeDynamics.value,
        dynamicsDimension: action.laneChangeDynamics.dynamicsDimension
      };
    }
    
    return parameters;
  }

  /**
   * Convert OpenSCENARIO trigger to EventTrigger
   */
  private convertTriggerToEventTrigger(trigger: any): EventTrigger {
    const eventTrigger: EventTrigger = {
      conditionGroups: []
    };
    
    if (trigger.conditionGroup) {
      for (const conditionGroup of trigger.conditionGroup) {
        const group: ConditionGroup = {
          conditions: []
        };
        
        if (conditionGroup.condition) {
          for (const condition of conditionGroup.condition) {
            const triggerCondition = this.convertConditionToTriggerCondition(condition);
            if (triggerCondition) {
              group.conditions.push(triggerCondition);
            }
          }
        }
        
        if (group.conditions.length > 0) {
          eventTrigger.conditionGroups.push(group);
        }
      }
    }
    
    return eventTrigger;
  }

  /**
   * Convert OpenSCENARIO condition to TriggerCondition
   */
  private convertConditionToTriggerCondition(condition: any): TriggerCondition | null {
    if (!condition.name) return null;
    
    const triggerCondition: TriggerCondition = {
      name: condition.name,
      delay: condition.delay || 0,
      conditionEdge: condition.conditionEdge || 'rising',
      type: condition.type || 'byValue'
    };
    
    // Handle by-value conditions
    if (condition.type === 'byValue' && condition.conditionType === 'simulationTime') {
      triggerCondition.simulationTime = {
        value: condition.value,
        rule: condition.rule
      };
    }
    
    // Handle by-entity conditions
    if (condition.type === 'byEntity') {
      if (condition.triggeringEntities) {
        triggerCondition.triggeringEntities = {
          triggeringEntitiesRule: condition.triggeringEntities.triggeringEntitiesRule,
          entityRefs: condition.triggeringEntities.entityRef || []
        };
      }
      
      if (condition.conditionType === 'speed') {
        triggerCondition.speedCondition = {
          value: condition.value,
          rule: condition.rule
        };
      } else if (condition.conditionType === 'distance') {
        triggerCondition.distanceCondition = {
          value: condition.value,
          rule: condition.rule,
          freespace: condition.freespace || false,
          position: condition.position ? {
            type: condition.position.type,
            x: condition.position.x,
            y: condition.position.y,
            z: condition.position.z
          } : undefined
        };
      }
    }
    
    return triggerCondition;
  }

  /**
   * Generate timeline events from storyboard
   */
  private generateTimeline(storyboard: any): TimelineEvent[] {
    const timeline: TimelineEvent[] = [];
    let currentTime = 0;
    
    if (!storyboard) return timeline;
    
    // Add init actions at time 0
    if (storyboard.init?.actions?.private) {
      for (const privateAction of storyboard.init.actions.private) {
        for (const action of privateAction.actions || []) {
          timeline.push({
            timestamp: 0,
            type: action.type || 'init',
            target: privateAction.entityRef,
            action: action
          });
        }
      }
    }
    
    // Process stories and acts
    for (const story of storyboard.story || []) {
      for (const act of story.act || []) {
        // Estimate act start time from triggers (simplified)
        const actStartTime = this.estimateTimeFromTrigger(act.startTrigger, currentTime);
        
        for (const maneuverGroup of act.maneuverGroup || []) {
          for (const maneuver of maneuverGroup.maneuver || []) {
            for (const event of maneuver.event || []) {
              const eventStartTime = this.estimateTimeFromTrigger(event.startTrigger, actStartTime);
              
              for (const action of event.action || []) {
                timeline.push({
                  timestamp: eventStartTime,
                  type: action.type || 'action',
                  target: maneuverGroup.actors?.entityRef?.[0]?.entityRef || '',
                  action: action,
                  duration: this.estimateActionDuration(action)
                });
              }
            }
          }
        }
        
        currentTime = actStartTime + 5; // Simplified duration estimate
      }
    }
    
    // Sort timeline by timestamp
    timeline.sort((a, b) => a.timestamp - b.timestamp);
    
    return timeline;
  }
  
  /**
   * Estimate time from trigger (simplified)
   */
  private estimateTimeFromTrigger(trigger: any, defaultTime: number = 0): number {
    if (!trigger?.conditionGroup?.[0]?.condition?.[0]) {
      return defaultTime;
    }
    
    const condition = trigger.conditionGroup[0].condition[0];
    
    if (condition.conditionType === 'simulationTime') {
      return condition.value + (condition.delay || 0);
    }
    
    // For other conditions, estimate based on default progression
    return defaultTime + (condition.delay || 0);
  }
  
  /**
   * Estimate action duration (simplified)
   */
  private estimateActionDuration(action: any): number {
    if (action.speedDynamics) {
      if (action.speedDynamics.dynamicsDimension === 'time') {
        return action.speedDynamics.value;
      }
    }
    
    if (action.laneChangeDynamics) {
      if (action.laneChangeDynamics.dynamicsDimension === 'time') {
        return action.laneChangeDynamics.value;
      }
    }
    
    // Default duration
    return 2.0;
  }
  
  /**
   * Calculate scenario duration
   */
  private calculateScenarioDuration(timeline: TimelineEvent[]): number {
    if (timeline.length === 0) return 30; // Default 30 seconds
    
    let maxTime = 0;
    for (const event of timeline) {
      const endTime = event.timestamp + (event.duration || 0);
      maxTime = Math.max(maxTime, endTime);
    }
    
    return Math.max(maxTime, 10); // Minimum 10 seconds
  }
  
  /**
   * Calculate bounding box from entities and initial positions
   */
  private calculateBoundingBox(entities: any[], storyboard: any): { min: THREE.Vector3; max: THREE.Vector3 } {
    const points: THREE.Vector3[] = [];
    
    // Extract initial positions from init actions
    if (storyboard?.init?.actions?.private) {
      for (const privateAction of storyboard.init.actions.private) {
        for (const action of privateAction.actions || []) {
          if (action.type === 'teleport' && action.position?.type === 'world') {
            points.push(new THREE.Vector3(action.position.x, action.position.y, action.position.z || 0));
          }
        }
      }
    }
    
    // If no positions found, use default bounds
    if (points.length === 0) {
      return {
        min: new THREE.Vector3(-50, -50, -5),
        max: new THREE.Vector3(50, 50, 5)
      };
    }
    
    return MathUtils.calculateBoundingBox(points);
  }
  
  /**
   * Convert to visualization entities
   */
  public convertToVisualizationEntities(parsedData: ParsedOpenScenario): VehicleElement[] {
    const vehicles: VehicleElement[] = [];
    
    for (const entity of parsedData.entities) {
      if (entity.type === 'vehicle') {
        // Find initial position from init actions
        const initPosition = this.findEntityInitPosition(entity.name, parsedData.storyboard);
        
        const vehicle: VehicleElement = {
          id: entity.name,
          type: entity.vehicleCategory || 'car',
          position: initPosition || new THREE.Vector3(0, 0, 0),
          rotation: new THREE.Euler(0, 0, 0),
          speed: 0,
          timestamp: 0,
          trajectory: this.generateEntityTrajectory(entity.name, parsedData.timeline)
        };
        
        vehicles.push(vehicle);
      }
    }
    
    return vehicles;
  }
  
  /**
   * Find entity initial position
   */
  private findEntityInitPosition(entityName: string, storyboard: any): THREE.Vector3 | null {
    if (!storyboard?.init?.actions?.private) return null;
    
    for (const privateAction of storyboard.init.actions.private) {
      if (privateAction.entityRef === entityName) {
        for (const action of privateAction.actions || []) {
          if (action.type === 'teleport' && action.position?.type === 'world') {
            return new THREE.Vector3(
              action.position.x,
              action.position.y,
              action.position.z || 0
            );
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Generate entity trajectory from timeline
   */
  private generateEntityTrajectory(entityName: string, timeline: TimelineEvent[]): THREE.Vector3[] {
    const trajectory: THREE.Vector3[] = [];
    let currentPosition = new THREE.Vector3(0, 0, 0);
    
    for (const event of timeline) {
      if (event.target === entityName) {
        if (event.action?.type === 'teleport' && event.action.position?.type === 'world') {
          currentPosition.set(
            event.action.position.x,
            event.action.position.y,
            event.action.position.z || 0
          );
          trajectory.push(currentPosition.clone());
        }
        // Add more trajectory generation logic for other action types
      }
    }
    
    return trajectory;
  }
  
  /**
   * Validate parsed data
   */
  public validateParsedData(data: ParsedOpenScenario): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for required elements
    if (!data.entities || data.entities.length === 0) {
      errors.push('No entities found in OpenSCENARIO file');
    }
    
    if (!data.storyboard) {
      errors.push('Missing storyboard in OpenSCENARIO file');
    }
    
    // Validate entities
    for (const entity of data.entities) {
      if (!entity.name) {
        errors.push('Entity missing name');
      }
    }
    
    // Check timeline
    if (!data.timeline || data.timeline.length === 0) {
      errors.push('No timeline events generated');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}