/**
 * Custom hook for handling scenario data parsing via Web Worker
 */

import { useState, useEffect, useCallback } from 'react';
import * as Comlink from 'comlink';
import * as THREE from 'three';
import { 
  VehicleElement, 
  TimelineEvent, 
  ParsedOpenDrive, 
  ParsedOpenScenario,
  ValidationIssue 
} from '../components/visualization/types/VisualizationTypes';

// Worker communication interface
interface WorkerData {
  vehicles: VehicleElement[];
  timeline: TimelineEvent[];
  openDriveData: ParsedOpenDrive | null;
  openScenarioData: ParsedOpenScenario | null;
  validationIssues: ValidationIssue[];
}

interface ParsedData {
  vehicles: VehicleElement[];
  timeline: TimelineEvent[];
  openDriveData: ParsedOpenDrive | null;
  openScenarioData: ParsedOpenScenario | null;
  validationIssues: ValidationIssue[];
}

export interface UseScenarioDataReturn {
  data: ParsedData | null;
  loading: boolean;
  error: string | null;
  parseData: (scenarioFiles: Record<string, string>, validationResults: Record<string, any>) => Promise<void>;
}

// Convert worker data to Three.js compatible format
function convertWorkerDataToThreeJs(workerData: WorkerData): ParsedData {
  return {
    vehicles: workerData.vehicles.map(vehicle => ({
      ...vehicle,
      position: new THREE.Vector3(vehicle.position.x, vehicle.position.y, vehicle.position.z),
      rotation: new THREE.Euler(vehicle.rotation.x, vehicle.rotation.y, vehicle.rotation.z),
      trajectory: vehicle.trajectory.map(pos => new THREE.Vector3(pos.x, pos.y, pos.z))
    })),
    timeline: workerData.timeline,
    openDriveData: workerData.openDriveData ? {
      ...workerData.openDriveData,
      boundingBox: {
        min: new THREE.Vector3(
          workerData.openDriveData.boundingBox.min.x,
          workerData.openDriveData.boundingBox.min.y,
          workerData.openDriveData.boundingBox.min.z
        ),
        max: new THREE.Vector3(
          workerData.openDriveData.boundingBox.max.x,
          workerData.openDriveData.boundingBox.max.y,
          workerData.openDriveData.boundingBox.max.z
        )
      }
    } : null,
    openScenarioData: workerData.openScenarioData ? {
      ...workerData.openScenarioData,
      boundingBox: {
        min: new THREE.Vector3(
          workerData.openScenarioData.boundingBox.min.x,
          workerData.openScenarioData.boundingBox.min.y,
          workerData.openScenarioData.boundingBox.min.z
        ),
        max: new THREE.Vector3(
          workerData.openScenarioData.boundingBox.max.x,
          workerData.openScenarioData.boundingBox.max.y,
          workerData.openScenarioData.boundingBox.max.z
        )
      }
    } : null,
    validationIssues: workerData.validationIssues.map(issue => ({
      ...issue,
      position: new THREE.Vector3(issue.position.x, issue.position.y, issue.position.z)
    }))
  };
}

export function useScenarioData(): UseScenarioDataReturn {
  const [data, setData] = useState<ParsedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [worker, setWorker] = useState<any>(null);

  // Initialize worker on mount
  useEffect(() => {
    let currentWorker: Worker | null = null;
    
    const initWorker = async () => {
      try {
        // Create worker from the TypeScript file
        // Vite will handle the bundling
        currentWorker = new Worker(
          new URL('../workers/dataParser.worker.ts', import.meta.url),
          { type: 'module' }
        );
        
        const workerApi = Comlink.wrap(currentWorker);
        setWorker(workerApi);
      } catch (err) {
        console.error('Failed to initialize worker:', err);
        setError('Failed to initialize data parser worker');
      }
    };

    initWorker();

    return () => {
      if (currentWorker) {
        currentWorker.terminate();
      }
    };
  }, []);

  const parseData = useCallback(async (
    scenarioFiles: Record<string, string>, 
    validationResults: Record<string, any>
  ) => {
    if (!worker) {
      setError('Worker not initialized');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const workerData = await worker.parseScenarioData(scenarioFiles, validationResults);
      const parsedData = convertWorkerDataToThreeJs(workerData);
      setData(parsedData);
    } catch (err) {
      console.error('Error parsing scenario data:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse scenario data');
    } finally {
      setLoading(false);
    }
  }, [worker]);

  return {
    data,
    loading,
    error,
    parseData
  };
}