/**
 * NCAP Test Generator Component
 * 
 * Generates NCAP-compliant test scenarios for different test types
 * (AEB, LSS, SAS, OD) with proper parameter validation.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { Info, Car, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BatchGenerationConfig, generateNCAPTestVariations } from '../services/batchApi';

interface NCAPTestGeneratorProps {
  onGenerate: (config: BatchGenerationConfig) => void;
}

type NCAPTestType = 'AEB' | 'LSS' | 'SAS' | 'OD';

interface NCAPTestConfig {
  testType: NCAPTestType;
  baseParams: Record<string, any>;
  expectedVariations: number;
  compliance: string[];
}

const NCAP_TEST_SPECS = {
  AEB: {
    name: 'Autonomous Emergency Braking',
    description: 'Tests the vehicle\'s ability to detect and brake for obstacles',
    speedRange: '10-80 km/h',
    targetType: 'Stationary target',
    scenarios: ['Stationary Vehicle', 'Slowly Moving Vehicle'],
    compliance: [
      'Euro NCAP requirements',
      'Stationary target scenarios',
      'Speed range: 10-80 km/h',
      'Time-to-collision thresholds'
    ]
  },
  LSS: {
    name: 'Lane Support Systems',
    description: 'Tests lane departure warning and lane keeping assistance',
    speedRange: '60-130 km/h',
    targetType: 'Lane markings',
    scenarios: ['Lane Departure', 'Lane Keeping', 'Highway Scenarios'],
    compliance: [
      'Euro NCAP requirements',
      'Highway speed scenarios',
      'Lane departure angles: 1-5°',
      'Road marking visibility'
    ]
  },
  SAS: {
    name: 'Speed Assistance Systems',
    description: 'Tests speed limit recognition and control systems',
    speedRange: '20-60 km/h',
    targetType: 'Speed signs',
    scenarios: ['Speed Limit Detection', 'Speed Control', 'Sign Recognition'],
    compliance: [
      'Euro NCAP requirements',
      'Urban and rural scenarios',
      'Speed sign visibility',
      'System response timing'
    ]
  },
  OD: {
    name: 'Occupant Detection',
    description: 'Tests pedestrian and cyclist detection systems',
    speedRange: '20-60 km/h',
    targetType: 'Pedestrians/Cyclists',
    scenarios: ['Pedestrian Crossing', 'Child Running', 'Cyclist Scenarios'],
    compliance: [
      'Euro NCAP requirements',
      'Vulnerable road user scenarios',
      'Day and night conditions',
      'Various weather conditions'
    ]
  }
};

export const NCAPTestGenerator: React.FC<NCAPTestGeneratorProps> = ({ onGenerate }) => {
  const [selectedTestType, setSelectedTestType] = useState<NCAPTestType>('AEB');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<{
    success: boolean;
    variations: number;
    error?: string;
  } | null>(null);

  const [baseScenarioParams, setBaseScenarioParams] = useState({
    scenario_type: 'NCAP_AEB',
    ego_vehicle: {
      type: 'car',
      initial_speed: 50,
      mass: 1500,
      wheelbase: 2.7
    },
    target_vehicle: {
      type: 'car',
      initial_speed: 0,
      mass: 1500
    },
    road_network: {
      type: 'straight_highway',
      lanes: 3,
      speed_limit: 120
    },
    weather: 'clear',
    time_of_day: 'day'
  });

  // Update base parameters when test type changes
  useEffect(() => {
    const updatedParams = { ...baseScenarioParams };
    
    switch (selectedTestType) {
      case 'AEB':
        updatedParams.scenario_type = 'NCAP_AEB';
        updatedParams.ego_vehicle.initial_speed = 50;
        updatedParams.target_vehicle.initial_speed = 0; // Stationary
        break;
      case 'LSS':
        updatedParams.scenario_type = 'NCAP_LSS';
        updatedParams.ego_vehicle.initial_speed = 80;
        delete updatedParams.target_vehicle; // No target vehicle for LSS
        break;
      case 'SAS':
        updatedParams.scenario_type = 'NCAP_SAS';
        updatedParams.ego_vehicle.initial_speed = 40;
        delete updatedParams.target_vehicle; // No target vehicle for SAS
        break;
      case 'OD':
        updatedParams.scenario_type = 'NCAP_OD';
        updatedParams.ego_vehicle.initial_speed = 40;
        // Add pedestrian instead of vehicle
        updatedParams.pedestrian = {
          scenario_type: 'crossing',
          speed: 1.4 // Walking speed m/s
        };
        delete updatedParams.target_vehicle;
        break;
    }
    
    setBaseScenarioParams(updatedParams);
  }, [selectedTestType]);

  const handleGenerateNCAPTests = useCallback(async () => {
    setIsGenerating(true);
    setGenerationResult(null);

    try {
      const result = await generateNCAPTestVariations(baseScenarioParams, selectedTestType);
      
      if (result.success) {
        setGenerationResult({
          success: true,
          variations: result.variations.length
        });

        // Create batch configuration for the parent
        const batchConfig: BatchGenerationConfig = {
          base_params: baseScenarioParams,
          variation_config: {
            // NCAP variations are handled specially by the backend
            max_combinations: result.variations.length
          },
          max_scenarios: result.variations.length,
          parallel: result.variations.length > 5
        };

        onGenerate(batchConfig);
      } else {
        setGenerationResult({
          success: false,
          variations: 0,
          error: result.error || 'Unknown error occurred'
        });
      }
    } catch (error) {
      setGenerationResult({
        success: false,
        variations: 0,
        error: error instanceof Error ? error.message : 'Failed to generate NCAP tests'
      });
    } finally {
      setIsGenerating(false);
    }
  }, [baseScenarioParams, selectedTestType, onGenerate]);

  const currentTestSpec = NCAP_TEST_SPECS[selectedTestType];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            NCAP Test Generation
          </CardTitle>
          <CardDescription>
            Generate Euro NCAP compliant test scenarios for different safety systems
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Test Type Selection */}
          <div>
            <Label htmlFor="test-type">Test Type</Label>
            <Select 
              value={selectedTestType}
              onValueChange={(value) => setSelectedTestType(value as NCAPTestType)}
            >
              <SelectTrigger id="test-type" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AEB">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    <span>AEB - Autonomous Emergency Braking</span>
                  </div>
                </SelectItem>
                <SelectItem value="LSS">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    <span>LSS - Lane Support Systems</span>
                  </div>
                </SelectItem>
                <SelectItem value="SAS">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    <span>SAS - Speed Assistance Systems</span>
                  </div>
                </SelectItem>
                <SelectItem value="OD">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    <span>OD - Occupant Detection</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Test Specification Display */}
          <div>
            <h3 className="text-lg font-medium mb-4">{currentTestSpec.name}</h3>
            <p className="text-gray-600 mb-4">{currentTestSpec.description}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="font-medium mb-2">Test Parameters</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Speed Range</Badge>
                    <span className="text-sm">{currentTestSpec.speedRange}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Target Type</Badge>
                    <span className="text-sm">{currentTestSpec.targetType}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Test Scenarios</h4>
                <div className="space-y-1">
                  {currentTestSpec.scenarios.map((scenario) => (
                    <div key={scenario} className="text-sm text-gray-600">• {scenario}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* NCAP Compliance Information */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div>
                  <h5 className="font-medium mb-2">Euro NCAP Requirements</h5>
                  <ul className="text-sm space-y-1">
                    {currentTestSpec.compliance.map((requirement, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        {requirement}
                      </li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </div>

          {/* Specific Parameters for Selected Test */}
          <div>
            <h4 className="font-medium mb-3">{selectedTestType} Parameters</h4>
            
            {selectedTestType === 'AEB' && (
              <div className="p-4 border rounded-lg space-y-3">
                <div className="text-sm">
                  <strong>Speed Range:</strong> 10-80 km/h (automatic variations)
                </div>
                <div className="text-sm">
                  <strong>Target:</strong> Stationary target vehicle
                </div>
                <div className="text-sm">
                  <strong>Test Conditions:</strong> Various approach speeds with stationary target
                </div>
              </div>
            )}

            {selectedTestType === 'LSS' && (
              <div className="p-4 border rounded-lg space-y-3">
                <div className="text-sm">
                  <strong>Speed Range:</strong> 60-130 km/h (highway speeds)
                </div>
                <div className="text-sm">
                  <strong>Lane Departure Angles:</strong> 1°, 2°, 3°, 4°, 5°
                </div>
                <div className="text-sm">
                  <strong>Road Conditions:</strong> Clear lane markings, various lighting
                </div>
              </div>
            )}

            {selectedTestType === 'SAS' && (
              <div className="p-4 border rounded-lg space-y-3">
                <div className="text-sm">
                  <strong>Speed Range:</strong> 20-60 km/h (urban/rural)
                </div>
                <div className="text-sm">
                  <strong>Speed Signs:</strong> Various speed limits and sign types
                </div>
                <div className="text-sm">
                  <strong>Scenarios:</strong> Speed limit changes, sign visibility tests
                </div>
              </div>
            )}

            {selectedTestType === 'OD' && (
              <div className="p-4 border rounded-lg space-y-3">
                <div className="text-sm">
                  <strong>Speed Range:</strong> 20-60 km/h (urban speeds)
                </div>
                <div className="text-sm">
                  <strong>Pedestrian Scenarios:</strong> Crossing, running child, cyclist
                </div>
                <div className="text-sm">
                  <strong>Conditions:</strong> Day/night, various weather conditions
                </div>
              </div>
            )}
          </div>

          {/* Generation Results */}
          {generationResult && (
            <div className="p-4 border rounded-lg">
              {generationResult.success ? (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{generationResult.variations} test variations generated</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Generation failed: {generationResult.error}</span>
                </div>
              )}
            </div>
          )}

          {/* Generate Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleGenerateNCAPTests}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  Generating...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Generate NCAP Tests
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NCAPTestGenerator;