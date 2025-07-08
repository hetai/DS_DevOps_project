/**
 * Web Worker for parsing OpenSCENARIO and OpenDRIVE files
 * This worker handles the heavy lifting of XML parsing and data transformation
 * to prevent blocking the main thread
 */

import * as Comlink from 'comlink';

// Types for worker communication
interface ParsedData {
  vehicles: VehicleElement[];
  timeline: TimelineEvent[];
  openDriveData: ParsedOpenDrive | null;
  openScenarioData: ParsedOpenScenario | null;
  validationIssues: ValidationIssue[];
}

// Minimal types for worker (avoiding Three.js dependency in worker)
interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

interface EulerLike {
  x: number;
  y: number;
  z: number;
}

interface VehicleElement {
  id: string;
  type: string;
  position: Vector3Like;
  rotation: EulerLike;
  speed: number;
  timestamp: number;
  trajectory: Vector3Like[];
}

interface TimelineEvent {
  timestamp: number;
  type: string;
  target: string;
  action: {
    type: string;
    name?: string;
  };
  duration?: number;
}

interface ParsedOpenDrive {
  header: {
    revMajor: string;
    revMinor: string;
    name: string;
  };
  roads: Array<{
    id: string;
    length: number;
    junction: string;
  }>;
  junctions: Array<{
    id: string;
    name: string;
  }>;
  coordinateSystem: string;
  boundingBox: {
    min: Vector3Like;
    max: Vector3Like;
  };
}

interface ParsedOpenScenario {
  header: {
    description: string;
    author: string;
    revMajor: string;
    revMinor: string;
  };
  entities: Array<{
    name: string;
    type: string;
    category: string;
  }>;
  storyboard: {
    init: Record<string, unknown>;
    story: unknown[];
  };
  timeline: TimelineEvent[];
  duration: number;
  boundingBox: {
    min: Vector3Like;
    max: Vector3Like;
  };
}

interface ValidationIssue {
  severity: string;
  message: string;
  position: Vector3Like;
  elementId: string;
  timestamp: number;
}

class DataParserWorker {
  /**
   * Convert simple scenario files to VehicleElement array
   */
  convertToVehicleElements(scenarioFiles: Record<string, string>): VehicleElement[] {
    const vehicles: VehicleElement[] = [];
    
    // Try to extract vehicles from OpenSCENARIO content
    for (const [filename, content] of Object.entries(scenarioFiles)) {
      if (filename.endsWith('.xosc')) {
        try {
          // Basic XML parsing to extract entity information
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, 'application/xml');
          
          const entities = doc.querySelectorAll('Entity');
          entities.forEach((entity, index) => {
            const name = entity.getAttribute('name') || `vehicle_${index}`;
            
            // Try to get initial position
            const positionElement = entity.querySelector('Position WorldPosition');
            const x = parseFloat(positionElement?.getAttribute('x') || '0');
            const y = parseFloat(positionElement?.getAttribute('y') || '0');
            const z = parseFloat(positionElement?.getAttribute('z') || '0');
            const h = parseFloat(positionElement?.getAttribute('h') || '0');
            
            vehicles.push({
              id: name,
              type: 'car', // Default type
              position: { x, y: z, z: -y }, // Convert to Three.js coordinates
              rotation: { x: 0, y: h, z: 0 },
              speed: 0,
              timestamp: 0,
              trajectory: []
            });
          });
        } catch (error) {
          console.warn('Failed to parse OpenSCENARIO entities:', error);
        }
      }
    }
    
    // If no vehicles found, create a default one for visualization
    if (vehicles.length === 0) {
      vehicles.push({
        id: 'default_vehicle',
        type: 'car',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        speed: 0,
        timestamp: 0,
        trajectory: []
      });
    }
    
    return vehicles;
  }

  /**
   * Convert simple scenario data to timeline events
   */
  convertToTimelineEvents(scenarioFiles: Record<string, string>): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    
    // Try to extract events from OpenSCENARIO content
    for (const [filename, content] of Object.entries(scenarioFiles)) {
      if (filename.endsWith('.xosc')) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, 'application/xml');
          
          const maneuvers = doc.querySelectorAll('Event');
          maneuvers.forEach((event, index) => {
            const name = event.getAttribute('name') || `event_${index}`;
            
            events.push({
              timestamp: index * 5, // Spread events over time
              type: 'maneuver',
              target: 'default_vehicle',
              action: {
                type: 'position_change',
                name: name
              },
              duration: 5
            });
          });
        } catch (error) {
          console.warn('Failed to parse OpenSCENARIO events:', error);
        }
      }
    }
    
    // Add default timeline if empty
    if (events.length === 0) {
      events.push({
        timestamp: 0,
        type: 'start',
        target: 'default_vehicle',
        action: { type: 'initialize' }
      });
    }
    
    return events;
  }

  /**
   * Convert simple scenario files to ParsedOpenDrive
   */
  convertToParsedOpenDrive(scenarioFiles: Record<string, string>): ParsedOpenDrive | null {
    for (const [filename, content] of Object.entries(scenarioFiles)) {
      if (filename.endsWith('.xodr')) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, 'application/xml');
          
          const header = doc.querySelector('header');
          const roads = Array.from(doc.querySelectorAll('road'));
          const junctions = Array.from(doc.querySelectorAll('junction'));
          
          return {
            header: {
              revMajor: header?.getAttribute('revMajor') || '1',
              revMinor: header?.getAttribute('revMinor') || '0',
              name: header?.getAttribute('name') || 'Default Road'
            },
            roads: roads.map((road, index) => ({
              id: road.getAttribute('id') || `road_${index}`,
              length: parseFloat(road.getAttribute('length') || '100'),
              junction: road.getAttribute('junction') || '-1'
            })),
            junctions: junctions.map((junction, index) => ({
              id: junction.getAttribute('id') || `junction_${index}`,
              name: junction.getAttribute('name') || `Junction ${index}`
            })),
            coordinateSystem: 'right-hand-z-up',
            boundingBox: {
              min: { x: -50, y: -50, z: -1 },
              max: { x: 50, y: 50, z: 1 }
            }
          };
        } catch (error) {
          console.warn('Failed to parse OpenDRIVE:', error);
        }
      }
    }
    
    return null;
  }

  /**
   * Convert simple scenario files to ParsedOpenScenario
   */
  convertToParsedOpenScenario(scenarioFiles: Record<string, string>): ParsedOpenScenario | null {
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
              min: { x: -100, y: -100, z: -1 },
              max: { x: 100, y: 100, z: 1 }
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
  convertToValidationIssues(validationResults: Record<string, any>): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    if (validationResults && typeof validationResults === 'object') {
      Object.entries(validationResults).forEach(([key, value]) => {
        if (value && typeof value === 'object' && value.errors) {
          value.errors.forEach((error: any, index: number) => {
            issues.push({
              severity: error.severity || 'warning',
              message: error.message || `Validation issue in ${key}`,
              position: { x: index * 10, y: 0, z: 0 }, // Spread issues spatially
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
   * Main parsing function - exposed to main thread
   */
  async parseScenarioData(
    scenarioFiles: Record<string, string>, 
    validationResults: Record<string, any>
  ): Promise<ParsedData> {
    // Simulate processing time for large files
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const vehicles = this.convertToVehicleElements(scenarioFiles);
    const timeline = this.convertToTimelineEvents(scenarioFiles);
    const openDriveData = this.convertToParsedOpenDrive(scenarioFiles);
    const openScenarioData = this.convertToParsedOpenScenario(scenarioFiles);
    const validationIssues = this.convertToValidationIssues(validationResults);
    
    return {
      vehicles,
      timeline,
      openDriveData,
      openScenarioData,
      validationIssues
    };
  }
}

// Expose the worker class via Comlink
const worker = new DataParserWorker();
Comlink.expose(worker);