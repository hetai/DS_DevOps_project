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
   * Convert simple scenario files to VehicleElement array
   */
  static convertToVehicleElements(scenarioFiles: Record<string, string>): VehicleElement[] {
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
              position: new THREE.Vector3(x, z, -y), // Convert to Three.js coordinates
              rotation: new THREE.Euler(0, h, 0),
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
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Euler(0, 0, 0),
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
  static convertToTimelineEvents(scenarioFiles: Record<string, string>): TimelineEvent[] {
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
  static convertToParsedOpenDrive(scenarioFiles: Record<string, string>): ParsedOpenDrive | null {
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
              min: new THREE.Vector3(-50, -50, -1),
              max: new THREE.Vector3(50, 50, 1)
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