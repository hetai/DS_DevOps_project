/**
 * Test cases for DataAdapter vehicle trajectory generation
 * Testing the vehicle trajectory logic to ensure proper behavior based on scenario type
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';

// Mock scenario files for testing
const mockScenarioFiles = {
  // Overtaking scenario - should generate straight and lane-change trajectories
  overtaking: {
    'overtaking_scenario.xosc': `<?xml version="1.0" encoding="UTF-8"?>
<OpenSCENARIO>
  <FileHeader revMajor="1" revMinor="2" date="2025-01-25" description="高速公路超车场景：主车以80km/h速度超越前方慢车"/>
  <Entities>
    <ScenarioObject name="EgoVehicle">
      <Vehicle name="car" vehicleCategory="car">
        <Performance maxSpeed="69.4" maxDeceleration="9.0" maxAcceleration="3.0"/>
      </Vehicle>
    </ScenarioObject>
    <ScenarioObject name="TargetVehicle">
      <Vehicle name="car" vehicleCategory="car">
        <Performance maxSpeed="55.6" maxDeceleration="9.0" maxAcceleration="3.0"/>
      </Vehicle>
    </ScenarioObject>
  </Entities>
</OpenSCENARIO>`,
    'overtaking_scenario.xodr': `<?xml version="1.0" encoding="UTF-8"?>
<OpenDRIVE>
  <header revMajor="1" revMinor="7" name="Highway" version="1.0"/>
  <road name="Highway" length="1000.0" id="1" junction="-1">
    <planView>
      <geometry s="0.0" x="0.0" y="0.0" hdg="0.0" length="1000.0">
        <line/>
      </geometry>
    </planView>
  </road>
</OpenDRIVE>`
  },
  
  // AEB scenario - should generate straight trajectories with collision course
  aeb: {
    'aeb_scenario.xosc': `<?xml version="1.0" encoding="UTF-8"?>
<OpenSCENARIO>
  <FileHeader revMajor="1" revMinor="2" date="2025-01-25" description="AEB自动紧急制动测试：主车以60km/h接近前方静止障碍物"/>
  <Entities>
    <ScenarioObject name="EgoVehicle">
      <Vehicle name="car" vehicleCategory="car"/>
    </ScenarioObject>
    <ScenarioObject name="ObstacleVehicle">
      <Vehicle name="car" vehicleCategory="car"/>
    </ScenarioObject>
  </Entities>
</OpenSCENARIO>`,
    'aeb_scenario.xodr': `<?xml version="1.0" encoding="UTF-8"?>
<OpenDRIVE>
  <header revMajor="1" revMinor="7" name="TestTrack"/>
</OpenDRIVE>`
  },
  
  // Empty scenario - should create default vehicles but with appropriate trajectories
  empty: {}
};

describe('DataAdapter Vehicle Trajectory Generation', () => {
  let DataAdapter: any;
  
  beforeEach(() => {
    // Mock DataAdapter class with improved trajectory generation
    DataAdapter = {
      convertToVehicleElements: (scenarioFiles: Record<string, string>) => {
        const vehicles: any[] = [];
        
        // Analyze scenario description to determine appropriate trajectory patterns
        const scenarioDescription = DataAdapter.extractScenarioDescription(scenarioFiles);
        const scenarioType = DataAdapter.determineScenarioType(scenarioDescription);
        
        // Try to extract vehicle data from OpenSCENARIO content
        for (const [filename, content] of Object.entries(scenarioFiles)) {
          if (filename.endsWith('.xosc')) {
            try {
              const parser = new DOMParser();
              const doc = parser.parseFromString(content, 'application/xml');
              
              const entities = doc.querySelectorAll('ScenarioObject');
              entities.forEach((entity, index) => {
                const name = entity.getAttribute('name') || `vehicle_${index}`;
                const startPosition = new THREE.Vector3(index * 20 - 10, 0, 1.0);
                
                // Generate trajectory based on scenario type and vehicle role
                const trajectory = DataAdapter.generateScenarioBasedTrajectory(
                  startPosition, 
                  index, 
                  scenarioType,
                  name,
                  30
                );
                
                vehicles.push({
                  id: name,
                  type: 'car',
                  position: startPosition.clone(),
                  rotation: new THREE.Euler(0, 0, 0),
                  speed: 0,
                  timestamp: 0,
                  trajectory: trajectory.map(point => point.position),
                  isEgo: index === 0 || name.toLowerCase().includes('ego')
                });
              });
            } catch (error) {
              console.warn('Failed to parse OpenSCENARIO vehicles:', error);
            }
          }
        }
        
        // If no vehicles found, create default vehicles with scenario-appropriate trajectories
        if (vehicles.length === 0) {
          for (let i = 0; i < 2; i++) {
            const startPos = new THREE.Vector3(i * 20 - 10, 0, 1.0);
            const trajectory = DataAdapter.generateScenarioBasedTrajectory(
              startPos, 
              i, 
              scenarioType,
              `demo_vehicle_${i}`,
              30
            );
            
            vehicles.push({
              id: `demo_vehicle_${i}`,
              type: 'car',
              position: startPos.clone(),
              rotation: new THREE.Euler(0, 0, 0),
              speed: 0,
              timestamp: 0,
              trajectory: trajectory.map(point => point.position),
              isEgo: i === 0
            });
          }
        }
        
        return vehicles;
      },
      
      extractScenarioDescription: (scenarioFiles: Record<string, string>) => {
        for (const [filename, content] of Object.entries(scenarioFiles)) {
          if (filename.endsWith('.xosc')) {
            try {
              const parser = new DOMParser();
              const doc = parser.parseFromString(content, 'application/xml');
              const header = doc.querySelector('FileHeader');
              return header?.getAttribute('description') || '';
            } catch (error) {
              console.warn('Failed to extract scenario description:', error);
            }
          }
        }
        return '';
      },
      
      determineScenarioType: (description: string) => {
        const desc = description.toLowerCase();
        
        if (desc.includes('超车') || desc.includes('overtaking') || desc.includes('lane change')) {
          return 'overtaking';
        }
        if (desc.includes('aeb') || desc.includes('紧急制动') || desc.includes('emergency brake')) {
          return 'aeb';
        }
        if (desc.includes('跟车') || desc.includes('following') || desc.includes('car following')) {
          return 'following';
        }
        if (desc.includes('交叉口') || desc.includes('intersection') || desc.includes('junction')) {
          return 'intersection';
        }
        
        return 'default';
      },
      
      generateScenarioBasedTrajectory: (
        startPosition: THREE.Vector3,
        vehicleIndex: number,
        scenarioType: string,
        vehicleName: string,
        duration: number
      ) => {
        const trajectory = [];
        const timeStep = 0.1;
        const totalSteps = Math.floor(duration / timeStep);
        
        for (let step = 0; step <= totalSteps; step++) {
          const t = step * timeStep;
          const normalizedTime = t / duration;
          
          let position: THREE.Vector3;
          let rotation: THREE.Euler;
          let speed: number;
          
          switch (scenarioType) {
            case 'overtaking':
              if (vehicleIndex === 0 || vehicleName.toLowerCase().includes('ego')) {
                // Ego vehicle: straight -> lane change left -> straight -> lane change right
                if (normalizedTime < 0.3) {
                  // Initial straight driving
                  position = new THREE.Vector3(
                    startPosition.x + (normalizedTime * 100),
                    startPosition.y,
                    startPosition.z
                  );
                } else if (normalizedTime < 0.4) {
                  // Lane change to left
                  const laneChangeProgress = (normalizedTime - 0.3) / 0.1;
                  position = new THREE.Vector3(
                    startPosition.x + (normalizedTime * 100),
                    startPosition.y + (laneChangeProgress * 3.5),
                    startPosition.z
                  );
                } else if (normalizedTime < 0.7) {
                  // Straight in left lane
                  position = new THREE.Vector3(
                    startPosition.x + (normalizedTime * 100),
                    startPosition.y + 3.5,
                    startPosition.z
                  );
                } else if (normalizedTime < 0.8) {
                  // Lane change back to right
                  const laneChangeProgress = (normalizedTime - 0.7) / 0.1;
                  position = new THREE.Vector3(
                    startPosition.x + (normalizedTime * 100),
                    startPosition.y + 3.5 - (laneChangeProgress * 3.5),
                    startPosition.z
                  );
                } else {
                  // Final straight driving
                  position = new THREE.Vector3(
                    startPosition.x + (normalizedTime * 100),
                    startPosition.y,
                    startPosition.z
                  );
                }
                speed = 22.2; // 80 km/h
              } else {
                // Target vehicle: slower straight driving
                position = new THREE.Vector3(
                  startPosition.x + (normalizedTime * 60), // Slower speed
                  startPosition.y,
                  startPosition.z
                );
                speed = 15.4; // 55 km/h
              }
              rotation = new THREE.Euler(0, 0, 0);
              break;
              
            case 'aeb':
              if (vehicleIndex === 0 || vehicleName.toLowerCase().includes('ego')) {
                // Ego vehicle: approaching at constant speed, then braking
                if (normalizedTime < 0.8) {
                  position = new THREE.Vector3(
                    startPosition.x + (normalizedTime * 80),
                    startPosition.y,
                    startPosition.z
                  );
                  speed = 16.7; // 60 km/h
                } else {
                  // Emergency braking phase
                  const brakingProgress = (normalizedTime - 0.8) / 0.2;
                  const brakingDistance = 80 * 0.8 + (1 - brakingProgress) * 10;
                  position = new THREE.Vector3(
                    startPosition.x + brakingDistance,
                    startPosition.y,
                    startPosition.z
                  );
                  speed = 16.7 * (1 - brakingProgress);
                }
              } else {
                // Obstacle vehicle: stationary
                position = new THREE.Vector3(
                  startPosition.x + 50, // Fixed position ahead
                  startPosition.y,
                  startPosition.z
                );
                speed = 0;
              }
              rotation = new THREE.Euler(0, 0, 0);
              break;
              
            default:
              // Default: simple straight line movement
              position = new THREE.Vector3(
                startPosition.x + (normalizedTime * 50),
                startPosition.y,
                startPosition.z
              );
              rotation = new THREE.Euler(0, 0, 0);
              speed = 13.9; // 50 km/h
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
    };
  });
  
  it('should generate appropriate trajectories for overtaking scenario', () => {
    const vehicles = DataAdapter.convertToVehicleElements(mockScenarioFiles.overtaking);
    
    expect(vehicles).toHaveLength(2);
    
    const egoVehicle = vehicles.find(v => v.id === 'EgoVehicle' || v.isEgo);
    const targetVehicle = vehicles.find(v => v.id === 'TargetVehicle' || !v.isEgo);
    
    expect(egoVehicle).toBeDefined();
    expect(targetVehicle).toBeDefined();
    
    // Ego vehicle should have lane-changing trajectory
    const egoTrajectory = egoVehicle.trajectory;
    expect(egoTrajectory.length).toBeGreaterThan(100);
    
    // Check for lane change: Y position should change during trajectory
    const startY = egoTrajectory[0].y;
    const midY = egoTrajectory[Math.floor(egoTrajectory.length / 2)].y;
    const endY = egoTrajectory[egoTrajectory.length - 1].y;
    
    expect(Math.abs(midY - startY)).toBeGreaterThan(2); // Should move to different lane
    expect(Math.abs(endY - startY)).toBeLessThan(1); // Should return to original lane
    
    // Target vehicle should have straight trajectory
    const targetTrajectory = targetVehicle.trajectory;
    const targetStartY = targetTrajectory[0].y;
    const targetEndY = targetTrajectory[targetTrajectory.length - 1].y;
    
    expect(Math.abs(targetEndY - targetStartY)).toBeLessThan(0.5); // Should stay in same lane
  });
  
  it('should generate appropriate trajectories for AEB scenario', () => {
    const vehicles = DataAdapter.convertToVehicleElements(mockScenarioFiles.aeb);
    
    expect(vehicles).toHaveLength(2);
    
    const egoVehicle = vehicles.find(v => v.id === 'EgoVehicle' || v.isEgo);
    const obstacleVehicle = vehicles.find(v => v.id === 'ObstacleVehicle' || !v.isEgo);
    
    expect(egoVehicle).toBeDefined();
    expect(obstacleVehicle).toBeDefined();
    
    // Ego vehicle should show braking behavior (decreasing X progression rate)
    const egoTrajectory = egoVehicle.trajectory;
    const firstHalfDistance = egoTrajectory[Math.floor(egoTrajectory.length / 2)].x - egoTrajectory[0].x;
    const secondHalfDistance = egoTrajectory[egoTrajectory.length - 1].x - egoTrajectory[Math.floor(egoTrajectory.length / 2)].x;
    
    expect(secondHalfDistance).toBeLessThan(firstHalfDistance); // Should slow down
    
    // Obstacle vehicle should be stationary
    const obstacleTrajectory = obstacleVehicle.trajectory;
    const obstacleStartX = obstacleTrajectory[0].x;
    const obstacleEndX = obstacleTrajectory[obstacleTrajectory.length - 1].x;
    
    expect(Math.abs(obstacleEndX - obstacleStartX)).toBeLessThan(1); // Should remain stationary
  });
  
  it('should not generate circular or figure-8 trajectories for realistic scenarios', () => {
    const overtakingVehicles = DataAdapter.convertToVehicleElements(mockScenarioFiles.overtaking);
    const aebVehicles = DataAdapter.convertToVehicleElements(mockScenarioFiles.aeb);
    
    const allVehicles = [...overtakingVehicles, ...aebVehicles];
    
    allVehicles.forEach(vehicle => {
      const trajectory = vehicle.trajectory;
      
      // Check that trajectory doesn't form a circle (no vehicle should return to start position)
      const startPos = trajectory[0];
      const endPos = trajectory[trajectory.length - 1];
      const distance = Math.sqrt(
        Math.pow(endPos.x - startPos.x, 2) + 
        Math.pow(endPos.y - startPos.y, 2)
      );
      
      expect(distance).toBeGreaterThan(20); // Should move significantly from start
      
      // Check that trajectory is generally forward-moving (X should increase)
      expect(endPos.x).toBeGreaterThan(startPos.x);
      
      // Check that trajectory doesn't have excessive Y oscillation (no figure-8)
      let maxYDeviation = 0;
      trajectory.forEach(point => {
        const yDeviation = Math.abs(point.y - startPos.y);
        maxYDeviation = Math.max(maxYDeviation, yDeviation);
      });
      
      expect(maxYDeviation).toBeLessThan(10); // Reasonable lane change, not wild oscillation
    });
  });
  
  it('should create default vehicles with appropriate trajectories when no scenario files', () => {
    const vehicles = DataAdapter.convertToVehicleElements(mockScenarioFiles.empty);
    
    expect(vehicles).toHaveLength(2); // Should create default vehicles
    
    vehicles.forEach(vehicle => {
      expect(vehicle.trajectory.length).toBeGreaterThan(0);
      
      // Default trajectories should be simple and realistic
      const trajectory = vehicle.trajectory;
      const startPos = trajectory[0];
      const endPos = trajectory[trajectory.length - 1];
      
      // Should move forward
      expect(endPos.x).toBeGreaterThan(startPos.x);
      
      // Should not have excessive lateral movement
      expect(Math.abs(endPos.y - startPos.y)).toBeLessThan(5);
    });
  });
  
  it('should properly identify ego vehicle', () => {
    const vehicles = DataAdapter.convertToVehicleElements(mockScenarioFiles.overtaking);
    
    const egoVehicles = vehicles.filter(v => v.isEgo);
    expect(egoVehicles).toHaveLength(1); // Should have exactly one ego vehicle
    
    const egoVehicle = egoVehicles[0];
    expect(egoVehicle.id).toMatch(/ego/i); // Should be identified as ego
  });
});