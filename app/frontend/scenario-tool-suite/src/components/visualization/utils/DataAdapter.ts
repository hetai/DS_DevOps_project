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
   * Convert simple scenario data to vehicle elements with realistic trajectories
   */
  static convertToVehicleElements(scenarioFiles: Record<string, string>): VehicleElement[] {
    const vehicles: VehicleElement[] = [];
    
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
            
            // Generate realistic trajectory for animation
            const trajectory = this.generateVehicleTrajectory(startPosition, index, 30); // 30 second duration
            
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
        const trajectory = this.generateVehicleTrajectory(startPos, i, 30);
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
   * Generate realistic vehicle trajectory for animation
   */
  static generateVehicleTrajectory(
    startPosition: THREE.Vector3, 
    vehicleIndex: number, 
    duration: number
  ): Array<{ position: THREE.Vector3; rotation: THREE.Euler; speed: number; timestamp: number }> {
    const trajectory = [];
    const timeStep = 0.1; // 10 FPS for smooth animation
    const totalSteps = Math.floor(duration / timeStep);
    
    // Different trajectory patterns for different vehicles
    const patterns = [
      'straight',    // Vehicle 0: straight line
      'circular',    // Vehicle 1: circular path
      'figure8'      // Vehicle 2: figure-8 pattern
    ];
    
    const pattern = patterns[vehicleIndex % patterns.length];
    const baseSpeed = 10 + (vehicleIndex * 5); // Different speeds
    
    for (let step = 0; step <= totalSteps; step++) {
      const t = step * timeStep;
      const normalizedTime = t / duration; // 0 to 1
      
      let position: THREE.Vector3;
      let rotation: THREE.Euler;
      let speed: number;
      
      switch (pattern) {
        case 'straight':
          position = new THREE.Vector3(
            startPosition.x + (normalizedTime * 100), // Move 100 units forward
            startPosition.y,
            Math.max(startPosition.z, 1.0) // 保持在道路上方
          );
          rotation = new THREE.Euler(0, 0, 0);
          speed = baseSpeed;
          break;
          
        case 'circular':
          const radius = 30;
          const angle = normalizedTime * Math.PI * 2; // Full circle
          position = new THREE.Vector3(
            startPosition.x + Math.cos(angle) * radius,
            startPosition.y + Math.sin(angle) * radius,
            Math.max(startPosition.z, 1.0) // 保持在道路上方
          );
          rotation = new THREE.Euler(0, 0, angle + Math.PI / 2); // Face direction of movement
          speed = baseSpeed;
          break;
          
        case 'figure8':
          const scale = 25;
          const angle8 = normalizedTime * Math.PI * 4; // Two loops
          position = new THREE.Vector3(
            startPosition.x + Math.sin(angle8) * scale,
            startPosition.y + Math.sin(angle8 * 2) * scale * 0.5,
            Math.max(startPosition.z, 1.0) // 保持在道路上方
          );
          // Calculate rotation based on movement direction
          const dx = Math.cos(angle8) * scale;
          const dy = Math.cos(angle8 * 2) * scale;
          rotation = new THREE.Euler(0, 0, Math.atan2(dy, dx));
          speed = baseSpeed * 0.8;
          break;
          
        default:
          position = startPosition.clone();
          rotation = new THREE.Euler(0, 0, 0);
          speed = 0;
      }
      
      trajectory.push({
        position: position,
        rotation: rotation,
        speed: speed,
        timestamp: t
      });
    }
    
    return trajectory;
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
  static convertToParsedOpenScenario(scenarioFiles: Record<string, string>): ParsedOpenScenario | null {
    const vehicles = this.convertToVehicleElements(scenarioFiles);
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
    validationResults: Record<string, any>
  ) {
    return {
      vehicles: this.convertToVehicleElements(scenarioFiles),
      timeline: this.convertToTimelineEvents(scenarioFiles),
      openDriveData: this.convertToParsedOpenDrive(scenarioFiles),
      openScenarioData: this.convertToParsedOpenScenario(scenarioFiles),
      validationIssues: this.convertToValidationIssues(validationResults)
    };
  }
}