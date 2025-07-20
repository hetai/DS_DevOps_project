/**
 * Data Adapter - Converts simple scenario data to complex visualization interfaces
 * Bridges the gap between App.tsx data format and professional 3D components
 */

import * as THREE from 'three';
import { 
  VehicleElement, 
  TimelineEvent, 
  ParsedOpenDrive, 
  ParsedOpenScenario,
  ValidationIssue 
} from '../types/VisualizationTypes';

export class DataAdapter {
  /**
   * Extract scenario description from OpenSCENARIO files
   */
  static extractScenarioDescription(scenarioFiles: Record<string, string>): string {
    for (const [filename, content] of Object.entries(scenarioFiles)) {
      if (filename.endsWith('.xosc')) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, 'application/xml');
          const header = doc.querySelector('FileHeader');
          const description = header?.getAttribute('description') || '';
          if (description) {
            console.log('Extracted scenario description:', description);
            return description;
          }
        } catch (error) {
          console.warn('Failed to extract scenario description:', error);
        }
      }
    }
    return '';
  }

  /**
   * Determine scenario type from description
   */
  static determineScenarioType(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('超车') || desc.includes('overtaking') || desc.includes('lane change') || desc.includes('变道')) {
      return 'overtaking';
    }
    if (desc.includes('aeb') || desc.includes('紧急制动') || desc.includes('emergency brake') || desc.includes('制动')) {
      return 'aeb';
    }
    if (desc.includes('跟车') || desc.includes('following') || desc.includes('car following')) {
      return 'following';
    }
    if (desc.includes('交叉口') || desc.includes('intersection') || desc.includes('junction')) {
      return 'intersection';
    }
    
    return 'default';
  }

  /**
   * Convert simple scenario data to vehicle elements with realistic trajectories
   */
  static convertToVehicleElements(
    scenarioFiles: Record<string, string>, 
    scenarioDescription?: string
  ): VehicleElement[] {
    const vehicles: VehicleElement[] = [];
    
    // Extract scenario description if not provided
    const actualScenarioDescription = scenarioDescription || this.extractScenarioDescription(scenarioFiles);
    const scenarioType = this.determineScenarioType(actualScenarioDescription);
    
    console.log('Processing scenario:', {
      description: actualScenarioDescription,
      type: scenarioType
    });
    
    // Try to extract vehicle data from OpenSCENARIO content
    for (const [filename, content] of Object.entries(scenarioFiles)) {
      if (filename.endsWith('.xosc')) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, 'application/xml');
          
          const entities = doc.querySelectorAll('Entity');
          entities.forEach((entity, index) => {
            const name = entity.getAttribute('name') || `vehicle_${index}`;
            
            // Try to find initial position
            const initActions = doc.querySelectorAll('TeleportAction');
            let startPosition = new THREE.Vector3(index * 15, 0, 1.0); // 默认间距，车辆在道路上方
            
            if (initActions.length > index) {
              const positionElement = initActions[index].querySelector('Position');
              if (positionElement) {
                const worldPos = positionElement.querySelector('WorldPosition');
                if (worldPos) {
                  startPosition = new THREE.Vector3(
                    parseFloat(worldPos.getAttribute('x') || '0'),
                    parseFloat(worldPos.getAttribute('y') || '0'),
                    Math.max(parseFloat(worldPos.getAttribute('z') || '0'), 1.0) // 确保车辆在道路上方
                  );
                }
              }
            }
            
            // Generate realistic trajectory for animation based on scenario context
            const trajectory = this.generateVehicleTrajectory(startPosition, index, 30, actualScenarioDescription);
            
            vehicles.push({
              id: name,
              type: 'car',
              position: startPosition.clone(),
              rotation: new THREE.Euler(0, 0, 0),
              speed: 0,
              timestamp: 0,
              trajectory: trajectory.map(point => point.position), // 只提取位置信息
              isEgo: index === 0 // 第一个车辆设为自车
            });
          });
        } catch (error) {
          console.warn('Failed to parse OpenSCENARIO vehicles:', error);
        }
      }
    }
    
    // If no vehicles found, create default vehicles with trajectories for demonstration
    if (vehicles.length === 0) {
      console.log('Creating default demo vehicles with ego vehicle');
      // Create multiple demo vehicles with different trajectories
      for (let i = 0; i < 3; i++) {
        const startPos = new THREE.Vector3(i * 20 - 20, 0, 1.0); // 将车辆放在道路上方1米处
        const trajectory = this.generateVehicleTrajectory(startPos, i, 30, actualScenarioDescription);
        const isEgo = i === 0; // 第一个车辆设为自车
        
        console.log(`Creating vehicle ${i}: isEgo=${isEgo}, position:`, startPos);
        
        vehicles.push({
          id: `demo_vehicle_${i}`,
          type: 'car',
          position: startPos.clone(),
          rotation: new THREE.Euler(0, 0, 0),
          speed: 0,
          timestamp: 0,
          trajectory: trajectory.map(point => point.position), // 只提取位置信息
          isEgo: isEgo // 明确标记自车
        });
      }
    }
    
    console.log('Generated vehicles:', vehicles.map(v => ({ id: v.id, isEgo: v.isEgo, position: v.position })));
    
    return vehicles;
  }

  /**
   * Generate realistic vehicle trajectory based on scenario context
   */
  static generateVehicleTrajectory(
    startPosition: THREE.Vector3, 
    vehicleIndex: number, 
    duration: number,
    scenarioContext?: string
  ): Array<{ position: THREE.Vector3; rotation: THREE.Euler; speed: number; timestamp: number }> {
    const trajectory = [];
    const timeStep = 0.1; // 10 FPS for smooth animation
    const totalSteps = Math.floor(duration / timeStep);
    
    // Determine trajectory type based on scenario context and vehicle role
    const trajectoryType = this.determineTrajectoryType(scenarioContext, vehicleIndex);
    const baseSpeed = this.calculateBaseSpeed(scenarioContext, vehicleIndex);
    
    for (let step = 0; step <= totalSteps; step++) {
      const t = step * timeStep;
      const normalizedTime = t / duration; // 0 to 1
      
      const trajectoryPoint = this.calculateTrajectoryPoint(
        startPosition, 
        trajectoryType, 
        normalizedTime, 
        baseSpeed, 
        t
      );
      
      trajectory.push(trajectoryPoint);
    }
    
    return trajectory;
  }

  /**
   * Determine trajectory type based on scenario context
   */
  static determineTrajectoryType(scenarioContext?: string, vehicleIndex: number = 0): string {
    if (!scenarioContext) {
      return vehicleIndex === 0 ? 'ego_straight' : 'following';
    }
    
    const context = scenarioContext.toLowerCase();
    
    // Check for specific scenario types
    if (context.includes('超车') || context.includes('overtaking')) {
      return vehicleIndex === 0 ? 'ego_overtaking' : 'target_straight';
    }
    
    if (context.includes('aeb') || context.includes('制动') || context.includes('emergency brake')) {
      return vehicleIndex === 0 ? 'ego_braking' : 'target_sudden_stop';
    }
    
    if (context.includes('跟车') || context.includes('following') || context.includes('car following')) {
      return vehicleIndex === 0 ? 'ego_following' : 'lead_vehicle';
    }
    
    if (context.includes('变道') || context.includes('lane change')) {
      return vehicleIndex === 0 ? 'ego_lane_change' : 'other_straight';
    }
    
    if (context.includes('交叉口') || context.includes('intersection')) {
      return vehicleIndex === 0 ? 'ego_intersection' : 'cross_traffic';
    }
    
    // Default to straight line movement
    return vehicleIndex === 0 ? 'ego_straight' : 'other_straight';
  }

  /**
   * Calculate base speed based on scenario context
   */
  static calculateBaseSpeed(scenarioContext?: string, vehicleIndex: number = 0): number {
    if (!scenarioContext) {
      return 15; // Default speed
    }
    
    const context = scenarioContext.toLowerCase();
    
    // Extract speed from context if mentioned
    const speedMatch = context.match(/(\d+)\s*(?:km\/h|kmh|mph|m\/s)/);
    if (speedMatch) {
      const extractedSpeed = parseInt(speedMatch[1]);
      // Convert to m/s if needed (assuming km/h by default)
      return context.includes('m/s') ? extractedSpeed : extractedSpeed / 3.6;
    }
    
    // Scenario-specific speeds
    if (context.includes('高速') || context.includes('highway')) {
      return vehicleIndex === 0 ? 25 : 22; // ~90 km/h and ~80 km/h
    }
    
    if (context.includes('城市') || context.includes('urban') || context.includes('city')) {
      return vehicleIndex === 0 ? 14 : 12; // ~50 km/h and ~43 km/h
    }
    
    if (context.includes('停车') || context.includes('parking') || context.includes('慢速')) {
      return vehicleIndex === 0 ? 3 : 2; // Very slow
    }
    
    // Default urban speed
    return vehicleIndex === 0 ? 15 : 13; // ~54 km/h and ~47 km/h
  }

  /**
   * Calculate trajectory point based on trajectory type
   */
  static calculateTrajectoryPoint(
    startPosition: THREE.Vector3,
    trajectoryType: string,
    normalizedTime: number,
    baseSpeed: number,
    timestamp: number
  ): { position: THREE.Vector3; rotation: THREE.Euler; speed: number; timestamp: number } {
    let position: THREE.Vector3;
    let rotation: THREE.Euler;
    let speed: number;
    
    const distance = normalizedTime * baseSpeed * 30; // 30 seconds max duration
    
    switch (trajectoryType) {
      case 'ego_straight':
      case 'other_straight':
      case 'target_straight':
        position = new THREE.Vector3(
          startPosition.x + distance,
          startPosition.y,
          Math.max(startPosition.z, 1.0)
        );
        rotation = new THREE.Euler(0, 0, 0);
        speed = baseSpeed;
        break;
        
      case 'ego_overtaking':
        // Overtaking maneuver: move to left lane, then back
        const overtakePhase = normalizedTime * 3; // 3 phases
        let lateralOffset = 0;
        
        if (overtakePhase < 1) {
          // Phase 1: Move to left lane
          lateralOffset = (overtakePhase) * 3.5;
        } else if (overtakePhase < 2) {
          // Phase 2: Stay in left lane
          lateralOffset = 3.5;
        } else {
          // Phase 3: Return to right lane
          lateralOffset = 3.5 - ((overtakePhase - 2) * 3.5);
        }
        
        position = new THREE.Vector3(
          startPosition.x + distance,
          startPosition.y + lateralOffset,
          Math.max(startPosition.z, 1.0)
        );
        rotation = new THREE.Euler(0, 0, 0);
        speed = baseSpeed * 1.2; // Slightly faster during overtaking
        break;
        
      case 'ego_braking':
        // Gradual deceleration
        const brakingFactor = Math.max(0, 1 - (normalizedTime * 2)); // Brake harder over time
        const brakingDistance = distance * (0.5 + brakingFactor * 0.5);
        
        position = new THREE.Vector3(
          startPosition.x + brakingDistance,
          startPosition.y,
          Math.max(startPosition.z, 1.0)
        );
        rotation = new THREE.Euler(0, 0, 0);
        speed = baseSpeed * brakingFactor;
        break;
        
      case 'target_sudden_stop':
        // Sudden stop after some distance
        const stopTime = 0.3; // Stop at 30% of timeline
        const stopDistance = normalizedTime <= stopTime ? 
          (normalizedTime / stopTime) * baseSpeed * 10 : 
          baseSpeed * 10;
        
        position = new THREE.Vector3(
          startPosition.x + stopDistance,
          startPosition.y,
          Math.max(startPosition.z, 1.0)
        );
        rotation = new THREE.Euler(0, 0, 0);
        speed = normalizedTime <= stopTime ? baseSpeed : 0;
        break;
        
      case 'ego_following':
        // Follow at safe distance
        const followingDistance = distance * 0.8; // Slightly slower
        
        position = new THREE.Vector3(
          startPosition.x + followingDistance,
          startPosition.y,
          Math.max(startPosition.z, 1.0)
        );
        rotation = new THREE.Euler(0, 0, 0);
        speed = baseSpeed * 0.9;
        break;
        
      case 'lead_vehicle':
        // Lead vehicle maintains steady speed
        position = new THREE.Vector3(
          startPosition.x + distance + 20, // Start ahead
          startPosition.y,
          Math.max(startPosition.z, 1.0)
        );
        rotation = new THREE.Euler(0, 0, 0);
        speed = baseSpeed;
        break;
        
      case 'ego_lane_change':
        // Simple lane change maneuver
        const laneChangePhase = Math.min(normalizedTime * 2, 1); // Complete in first half
        const laneOffset = laneChangePhase * 3.5; // Move to adjacent lane
        
        position = new THREE.Vector3(
          startPosition.x + distance,
          startPosition.y + laneOffset,
          Math.max(startPosition.z, 1.0)
        );
        rotation = new THREE.Euler(0, 0, 0);
        speed = baseSpeed;
        break;
        
      default:
        // Fallback to stationary
        position = startPosition.clone();
        rotation = new THREE.Euler(0, 0, 0);
        speed = 0;
    }
    
    return {
      position,
      rotation,
      speed,
      timestamp
    };
  }

  /**
   * Convert simple scenario data to timeline events synchronized with vehicle trajectories
   */
  static convertToTimelineEvents(scenarioFiles: Record<string, string>): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    const vehicles = this.convertToVehicleElements(scenarioFiles);
    
    // Generate timeline events based on vehicle trajectories
    vehicles.forEach((vehicle) => {
      // Add start event
      events.push({
        timestamp: 0,
        type: 'start',
        target: vehicle.id,
        action: {
          type: 'initialize',
          position: vehicle.position,
          rotation: vehicle.rotation
        }
      });
      
      // Add trajectory waypoint events for smooth animation
       if (vehicle.trajectory && vehicle.trajectory.length > 0) {
         // Add events at key trajectory points (every 2 seconds)
         const keyFrameInterval = 2.0; // seconds
         const keyFrames = vehicle.trajectory.filter((point, index) => {
           // Check if point has timestamp property (it should from generateVehicleTrajectory)
           const hasTimestamp = typeof point === 'object' && 'timestamp' in point;
           if (!hasTimestamp) return false;
           
           return index === 0 || 
                  index === vehicle.trajectory.length - 1 || 
                  (point as any).timestamp % keyFrameInterval < 0.1;
         });
         
         keyFrames.forEach((point, index) => {
           const trajectoryPoint = point as any; // Type assertion for trajectory point
           if (trajectoryPoint.timestamp > 0) { // Skip initial position
             events.push({
               timestamp: trajectoryPoint.timestamp,
               type: 'position_update',
               target: vehicle.id,
               action: {
                 type: 'move_to',
                 position: trajectoryPoint.position,
                 rotation: trajectoryPoint.rotation,
                 speed: trajectoryPoint.speed
               },
               duration: keyFrameInterval
             });
           }
         });
       }
       
       // Add end event
       const lastPoint = vehicle.trajectory[vehicle.trajectory.length - 1];
       if (lastPoint && typeof lastPoint === 'object' && 'timestamp' in lastPoint) {
         const trajectoryPoint = lastPoint as any;
         events.push({
           timestamp: trajectoryPoint.timestamp,
           type: 'end',
           target: vehicle.id,
           action: {
             type: 'stop',
             position: trajectoryPoint.position
           }
         });
       }
    });
    
    // Try to extract additional events from OpenSCENARIO content
    for (const [filename, content] of Object.entries(scenarioFiles)) {
      if (filename.endsWith('.xosc')) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, 'application/xml');
          
          const maneuvers = doc.querySelectorAll('Event');
          maneuvers.forEach((event, index) => {
            const name = event.getAttribute('name') || `event_${index}`;
            const targetVehicle = vehicles[index % vehicles.length]?.id || 'demo_vehicle_0';
            
            events.push({
              timestamp: index * 3 + 1, // Offset from vehicle events
              type: 'maneuver',
              target: targetVehicle,
              action: {
                type: 'custom_action',
                name: name,
                description: `Custom maneuver: ${name}`
              },
              duration: 2
            });
          });
        } catch (error) {
          console.warn('Failed to parse OpenSCENARIO events:', error);
        }
      }
    }
    
    // Sort events by timestamp
    events.sort((a, b) => a.timestamp - b.timestamp);
    
    // Add default timeline if still empty
    if (events.length === 0) {
      events.push({
        timestamp: 0,
        type: 'start',
        target: 'demo_vehicle_0',
        action: { type: 'initialize' }
      });
    }
    
    return events;
  }

  /**
   * Convert simple scenario files to ParsedOpenDrive
   */
  static convertToParsedOpenDrive(scenarioFiles: Record<string, string>): ParsedOpenDrive | null {
    for (const [filename, content] of Object.entries(scenarioFiles)) {
      if (filename.endsWith('.xodr')) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, 'application/xml');
          
          const header = doc.querySelector('header');
          const roads = Array.from(doc.querySelectorAll('road'));
          const junctions = Array.from(doc.querySelectorAll('junction'));
          
          // Parse road geometry data for proper rendering
          const parsedRoads = roads.map((road, index) => {
            const planViewElement = road.querySelector('planView');
            const lanesElement = road.querySelector('lanes');
            
            // Extract plan view geometry
            let planView = [];
            if (planViewElement) {
              const geometries = planViewElement.querySelectorAll('geometry');
              planView = Array.from(geometries).map(geom => ({
                s: parseFloat(geom.getAttribute('s') || '0'),
                x: parseFloat(geom.getAttribute('x') || '0'),
                y: parseFloat(geom.getAttribute('y') || '0'),
                hdg: parseFloat(geom.getAttribute('hdg') || '0'),
                length: parseFloat(geom.getAttribute('length') || '100'),
                type: geom.querySelector('line') ? 'line' : 'unknown'
              }));
            }
            
            // Extract lane information
            let lanes = null;
            if (lanesElement) {
              const laneSections = lanesElement.querySelectorAll('laneSection');
              lanes = {
                laneSection: Array.from(laneSections).map(section => ({
                  s: parseFloat(section.getAttribute('s') || '0'),
                  left: this.parseLaneSide(section.querySelector('left')),
                  center: this.parseLaneSide(section.querySelector('center')),
                  right: this.parseLaneSide(section.querySelector('right'))
                }))
              };
            }
            
            return {
              id: road.getAttribute('id') || `road_${index}`,
              length: parseFloat(road.getAttribute('length') || '100'),
              junction: road.getAttribute('junction') || '-1',
              planView: planView,
              lanes: lanes
            };
          });
          
          return {
            header: {
              revMajor: header?.getAttribute('revMajor') || '1',
              revMinor: header?.getAttribute('revMinor') || '0',
              name: header?.getAttribute('name') || 'Default Road'
            },
            roads: parsedRoads,
            junctions: junctions.map((junction, index) => ({
              id: junction.getAttribute('id') || `junction_${index}`,
              name: junction.getAttribute('name') || `Junction ${index}`
            })),
            coordinateSystem: 'right-hand-z-up',
            boundingBox: {
              min: new THREE.Vector3(-50, -50, -1),
              max: new THREE.Vector3(50, 50, 1)
            }
          };
        } catch (error) {
          console.warn('Failed to parse OpenDRIVE:', error);
        }
      }
    }
    
    // 如果没有找到.xodr文件，创建一个默认的道路场景
    console.log('No .xodr file found, creating default road scene');
    return this.createDefaultRoadScene();
  }
  
  /**
   * Parse lane side (left, center, right)
   */
  static parseLaneSide(sideElement: Element | null): any {
    if (!sideElement) return null;
    
    const lanes = sideElement.querySelectorAll('lane');
    return {
      lanes: Array.from(lanes).map(lane => ({
        id: parseInt(lane.getAttribute('id') || '0'),
        type: lane.getAttribute('type') || 'driving',
        width: Array.from(lane.querySelectorAll('width')).map(width => ({
          sOffset: parseFloat(width.getAttribute('sOffset') || '0'),
          a: parseFloat(width.getAttribute('a') || '3.5'),
          b: parseFloat(width.getAttribute('b') || '0'),
          c: parseFloat(width.getAttribute('c') || '0'),
          d: parseFloat(width.getAttribute('d') || '0')
        }))
      }))
    };
  }
  
  /**
   * Create a default road scene for demonstration
   */
  static createDefaultRoadScene(): ParsedOpenDrive {
    console.log('Creating default horizontal road scene');
    return {
      header: {
        revMajor: '1',
        revMinor: '0',
        name: 'Default Demo Road'
      },
      roads: [
        {
          id: 'road_0',
          length: 200,
          junction: '-1',
          planView: [
            {
              s: 0,
              x: -100,
              y: 0,
              hdg: 0, // 水平方向，沿X轴
              length: 200,
              type: 'line'
            }
          ],
          lanes: {
            laneSection: [
              {
                s: 0,
                left: {
                  lanes: [
                    {
                      id: 1,
                      type: 'driving',
                      width: [{ sOffset: 0, a: 3.5, b: 0, c: 0, d: 0 }]
                    }
                  ]
                },
                center: {
                  lanes: [
                    {
                      id: 0,
                      type: 'center',
                      width: [{ sOffset: 0, a: 0.2, b: 0, c: 0, d: 0 }]
                    }
                  ]
                },
                right: {
                  lanes: [
                    {
                      id: -1,
                      type: 'driving',
                      width: [{ sOffset: 0, a: 3.5, b: 0, c: 0, d: 0 }]
                    }
                  ]
                }
              }
            ]
          }
        }
      ],
      junctions: [],
      coordinateSystem: 'right-hand-z-up',
      boundingBox: {
        min: new THREE.Vector3(-100, -10, -1),
        max: new THREE.Vector3(100, 10, 1)
      }
    };
  }

  /**
   * Convert simple scenario files to ParsedOpenScenario
   */
  static convertToParsedOpenScenario(
    scenarioFiles: Record<string, string>, 
    scenarioDescription?: string
  ): ParsedOpenScenario | null {
    const vehicles = this.convertToVehicleElements(scenarioFiles, scenarioDescription);
    const timeline = this.convertToTimelineEvents(scenarioFiles);
    
    for (const [filename, content] of Object.entries(scenarioFiles)) {
      if (filename.endsWith('.xosc')) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, 'application/xml');
          
          const header = doc.querySelector('FileHeader');
          const entities = Array.from(doc.querySelectorAll('Entity'));
          
          return {
            header: {
              description: header?.getAttribute('description') || 'Generated scenario',
              author: header?.getAttribute('author') || 'System',
              revMajor: header?.getAttribute('revMajor') || '1',
              revMinor: header?.getAttribute('revMinor') || '0'
            },
            entities: entities.map((entity, index) => ({
              name: entity.getAttribute('name') || `entity_${index}`,
              type: 'vehicle',
              category: 'car'
            })),
            storyboard: {
              init: {},
              story: []
            },
            timeline: timeline,
            duration: Math.max(30, timeline.length * 5),
            boundingBox: {
              min: new THREE.Vector3(-100, -100, -1),
              max: new THREE.Vector3(100, 100, 1)
            }
          };
        } catch (error) {
          console.warn('Failed to parse OpenSCENARIO:', error);
        }
      }
    }
    
    return null;
  }

  /**
   * Convert validation results to ValidationIssue array
   */
  static convertToValidationIssues(validationResults: Record<string, any>): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    if (validationResults && typeof validationResults === 'object') {
      Object.entries(validationResults).forEach(([key, value]) => {
        if (value && typeof value === 'object' && value.errors) {
          value.errors.forEach((error: any, index: number) => {
            issues.push({
              severity: error.severity || 'warning',
              message: error.message || `Validation issue in ${key}`,
              position: new THREE.Vector3(index * 10, 0, 0), // Spread issues spatially
              elementId: key,
              timestamp: 0
            });
          });
        }
      });
    }
    
    return issues;
  }

  /**
   * Main adapter function to convert all data for Visualization3D
   */
  static adaptScenarioData(
    scenarioFiles: Record<string, string>, 
    validationResults: Record<string, any>,
    scenarioDescription?: string
  ) {
    return {
      vehicles: this.convertToVehicleElements(scenarioFiles, scenarioDescription),
      timeline: this.convertToTimelineEvents(scenarioFiles),
      openDriveData: this.convertToParsedOpenDrive(scenarioFiles),
      openScenarioData: this.convertToParsedOpenScenario(scenarioFiles, scenarioDescription),
      validationIssues: this.convertToValidationIssues(validationResults)
    };
  }
}