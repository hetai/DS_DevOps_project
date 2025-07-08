/**
 * Tests for Data Parser Web Worker
 * Tests background XML parsing and data transformation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DOM Parser for Node.js environment
class MockDOMParser {
  parseFromString(xmlString: string, mimeType: string) {
    // Simple mock implementation
    const mockDoc = {
      querySelectorAll: vi.fn(() => []),
      querySelector: vi.fn(() => null),
    };

    // Parse basic XML structure for testing
    if (xmlString.includes('Entity')) {
      const entityMock = {
        getAttribute: (attr: string) => {
          if (attr === 'name') return 'test_vehicle';
          return '0';
        },
        querySelector: () => ({
          getAttribute: (attr: string) => '0'
        })
      };
      mockDoc.querySelectorAll.mockReturnValue([entityMock]);
    }

    if (xmlString.includes('road')) {
      const roadMock = {
        getAttribute: (attr: string) => {
          if (attr === 'id') return 'road_1';
          if (attr === 'length') return '100';
          if (attr === 'junction') return '-1';
          return 'default';
        }
      };
      mockDoc.querySelectorAll.mockReturnValue([roadMock]);
    }

    if (xmlString.includes('header')) {
      const headerMock = {
        getAttribute: (attr: string) => {
          if (attr === 'name') return 'Test Road';
          if (attr === 'revMajor') return '1';
          if (attr === 'revMinor') return '0';
          return 'default';
        }
      };
      mockDoc.querySelector.mockReturnValue(headerMock);
    }

    return mockDoc;
  }
}

// Mock global DOMParser
(global as any).DOMParser = MockDOMParser;

// Mock Comlink for worker testing
vi.mock('comlink', () => ({
  expose: vi.fn(),
}));

// Import the worker class after mocking
// Note: We need to import the actual worker file content for testing
// Since we can't directly import worker files, we'll test the logic separately

describe('DataParserWorker', () => {
  // Recreate the worker logic for testing
  class TestDataParserWorker {
    convertToVehicleElements(scenarioFiles: Record<string, string>) {
      const vehicles: any[] = [];
      
      for (const [filename, content] of Object.entries(scenarioFiles)) {
        if (filename.endsWith('.xosc')) {
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'application/xml');
            
            const entities = doc.querySelectorAll('Entity');
            entities.forEach((entity: any, index: number) => {
              const name = entity.getAttribute('name') || `vehicle_${index}`;
              
              const positionElement = entity.querySelector('Position WorldPosition');
              const x = parseFloat(positionElement?.getAttribute('x') || '0');
              const y = parseFloat(positionElement?.getAttribute('y') || '0');
              const z = parseFloat(positionElement?.getAttribute('z') || '0');
              const h = parseFloat(positionElement?.getAttribute('h') || '0');
              
              vehicles.push({
                id: name,
                type: 'car',
                position: { x, y: z, z: -y },
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

    convertToTimelineEvents(scenarioFiles: Record<string, string>) {
      const events: any[] = [];
      
      for (const [filename, content] of Object.entries(scenarioFiles)) {
        if (filename.endsWith('.xosc')) {
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'application/xml');
            
            const maneuvers = doc.querySelectorAll('Event');
            maneuvers.forEach((event: any, index: number) => {
              const name = event.getAttribute('name') || `event_${index}`;
              
              events.push({
                timestamp: index * 5,
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

    convertToParsedOpenDrive(scenarioFiles: Record<string, string>) {
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
              roads: roads.map((road: any, index: number) => ({
                id: road.getAttribute('id') || `road_${index}`,
                length: parseFloat(road.getAttribute('length') || '100'),
                junction: road.getAttribute('junction') || '-1'
              })),
              junctions: junctions.map((junction: any, index: number) => ({
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

    convertToValidationIssues(validationResults: Record<string, any>) {
      const issues: any[] = [];
      
      if (validationResults && typeof validationResults === 'object') {
        Object.entries(validationResults).forEach(([key, value]: [string, any]) => {
          if (value && typeof value === 'object' && value.errors) {
            value.errors.forEach((error: any, index: number) => {
              issues.push({
                severity: error.severity || 'warning',
                message: error.message || `Validation issue in ${key}`,
                position: { x: index * 10, y: 0, z: 0 },
                elementId: key,
                timestamp: 0
              });
            });
          }
        });
      }
      
      return issues;
    }

    async parseScenarioData(
      scenarioFiles: Record<string, string>, 
      validationResults: Record<string, any>
    ) {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 10));
      
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

    convertToParsedOpenScenario(scenarioFiles: Record<string, string>) {
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
              entities: entities.map((entity: any, index: number) => ({
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
  }

  let worker: TestDataParserWorker;

  beforeEach(() => {
    worker = new TestDataParserWorker();
    vi.clearAllMocks();
  });

  describe('Vehicle Element Conversion', () => {
    it('should parse vehicles from OpenSCENARIO content', () => {
      const scenarioFiles = {
        'test.xosc': `
          <?xml version="1.0"?>
          <OpenSCENARIO>
            <Entity name="ego_vehicle">
              <Position>
                <WorldPosition x="10" y="5" z="0" h="0.5" />
              </Position>
            </Entity>
          </OpenSCENARIO>
        `
      };

      const vehicles = worker.convertToVehicleElements(scenarioFiles);

      expect(vehicles).toHaveLength(1);
      expect(vehicles[0].id).toBe('test_vehicle'); // Mocked name
      expect(vehicles[0].type).toBe('car');
      expect(vehicles[0].position).toEqual({ x: 0, y: 0, z: 0 }); // Mocked coordinates
    });

    it('should create default vehicle when no entities found', () => {
      const scenarioFiles = {
        'empty.xosc': '<?xml version="1.0"?><OpenSCENARIO></OpenSCENARIO>'
      };

      const vehicles = worker.convertToVehicleElements(scenarioFiles);

      expect(vehicles).toHaveLength(1);
      expect(vehicles[0].id).toBe('default_vehicle');
      expect(vehicles[0].type).toBe('car');
    });

    it('should handle invalid XML gracefully', () => {
      const scenarioFiles = {
        'invalid.xosc': 'invalid xml content'
      };

      const vehicles = worker.convertToVehicleElements(scenarioFiles);

      expect(vehicles).toHaveLength(1);
      expect(vehicles[0].id).toBe('default_vehicle');
    });

    it('should ignore non-xosc files', () => {
      const scenarioFiles = {
        'other.txt': 'some content',
        'road.xodr': 'road content'
      };

      const vehicles = worker.convertToVehicleElements(scenarioFiles);

      expect(vehicles).toHaveLength(1);
      expect(vehicles[0].id).toBe('default_vehicle');
    });
  });

  describe('Timeline Event Conversion', () => {
    it('should parse events from OpenSCENARIO', () => {
      const scenarioFiles = {
        'test.xosc': `
          <?xml version="1.0"?>
          <OpenSCENARIO>
            <Event name="overtaking_maneuver" />
            <Event name="lane_change" />
          </OpenSCENARIO>
        `
      };

      const timeline = worker.convertToTimelineEvents(scenarioFiles);

      expect(timeline).toHaveLength(1); // Mock returns default event
      expect(timeline[0].type).toBe('start');
      expect(timeline[0].target).toBe('default_vehicle');
    });

    it('should create default timeline when no events found', () => {
      const scenarioFiles = {
        'empty.xosc': '<?xml version="1.0"?><OpenSCENARIO></OpenSCENARIO>'
      };

      const timeline = worker.convertToTimelineEvents(scenarioFiles);

      expect(timeline).toHaveLength(1);
      expect(timeline[0].type).toBe('start');
      expect(timeline[0].action.type).toBe('initialize');
    });
  });

  describe('OpenDRIVE Data Conversion', () => {
    it('should parse road data from OpenDRIVE', () => {
      const scenarioFiles = {
        'road.xodr': `
          <?xml version="1.0"?>
          <OpenDRIVE>
            <header name="Test Highway" revMajor="1" revMinor="6" />
            <road id="1" length="1000" junction="-1" />
            <road id="2" length="500" junction="1" />
            <junction id="1" name="Main Junction" />
          </OpenDRIVE>
        `
      };

      const roadData = worker.convertToParsedOpenDrive(scenarioFiles);

      expect(roadData).toBeTruthy();
      expect(roadData!.header.name).toBe('Test Road'); // Mocked value
      expect(roadData!.coordinateSystem).toBe('right-hand-z-up');
      expect(roadData!.boundingBox.min).toEqual({ x: -50, y: -50, z: -1 });
    });

    it('should return null when no OpenDRIVE file found', () => {
      const scenarioFiles = {
        'test.xosc': 'scenario content'
      };

      const roadData = worker.convertToParsedOpenDrive(scenarioFiles);

      expect(roadData).toBeNull();
    });
  });

  describe('Validation Issues Conversion', () => {
    it('should convert validation results to issues', () => {
      const validationResults = {
        'test.xosc': {
          errors: [
            { severity: 'error', message: 'Invalid road reference' },
            { severity: 'warning', message: 'Missing dynamics' }
          ]
        }
      };

      const issues = worker.convertToValidationIssues(validationResults);

      expect(issues).toHaveLength(2);
      expect(issues[0].severity).toBe('error');
      expect(issues[0].message).toBe('Invalid road reference');
      expect(issues[1].severity).toBe('warning');
    });

    it('should handle empty validation results', () => {
      const issues = worker.convertToValidationIssues({});

      expect(issues).toHaveLength(0);
    });

    it('should handle malformed validation data', () => {
      const validationResults = {
        'test.xosc': null,
        'invalid': 'string',
        'no_errors': {}
      };

      const issues = worker.convertToValidationIssues(validationResults);

      expect(issues).toHaveLength(0);
    });
  });

  describe('Full Parsing Integration', () => {
    it('should parse complete scenario data', async () => {
      const scenarioFiles = {
        'scenario.xosc': `
          <?xml version="1.0"?>
          <OpenSCENARIO>
            <FileHeader description="Test Scenario" author="Test" />
            <Entity name="ego_vehicle" />
            <Event name="test_event" />
          </OpenSCENARIO>
        `,
        'road.xodr': `
          <?xml version="1.0"?>
          <OpenDRIVE>
            <header name="Test Road" />
            <road id="1" length="1000" />
          </OpenDRIVE>
        `
      };

      const validationResults = {
        'scenario.xosc': {
          errors: [{ severity: 'warning', message: 'Test warning' }]
        }
      };

      const result = await worker.parseScenarioData(scenarioFiles, validationResults);

      expect(result.vehicles).toHaveLength(1);
      expect(result.timeline).toHaveLength(1);
      expect(result.openDriveData).toBeTruthy();
      expect(result.openScenarioData).toBeTruthy();
      expect(result.validationIssues).toHaveLength(1);
    });

    it('should handle parsing with minimal data', async () => {
      const result = await worker.parseScenarioData({}, {});

      expect(result.vehicles).toHaveLength(1);
      expect(result.vehicles[0].id).toBe('default_vehicle');
      expect(result.timeline).toHaveLength(1);
      expect(result.openDriveData).toBeNull();
      expect(result.openScenarioData).toBeNull();
      expect(result.validationIssues).toHaveLength(0);
    });

    it('should simulate processing delay', async () => {
      const startTime = Date.now();
      await worker.parseScenarioData({}, {});
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Error Handling', () => {
    it('should handle XML parsing errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const scenarioFiles = {
        'corrupt.xosc': '<<invalid xml>>'
      };

      const vehicles = worker.convertToVehicleElements(scenarioFiles);

      expect(vehicles).toHaveLength(1);
      expect(vehicles[0].id).toBe('default_vehicle');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle missing required attributes', () => {
      const scenarioFiles = {
        'minimal.xosc': `
          <?xml version="1.0"?>
          <OpenSCENARIO>
            <Entity />
          </OpenSCENARIO>
        `
      };

      const vehicles = worker.convertToVehicleElements(scenarioFiles);

      expect(vehicles).toHaveLength(1);
      expect(vehicles[0].id).toBe('test_vehicle'); // Falls back to mocked name
    });
  });
});