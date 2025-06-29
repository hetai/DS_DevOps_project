/**
 * Parameter Variation Form Component
 * 
 * Allows users to configure parameter variations for batch generation
 * including ranges, sets, and statistical distributions.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, Trash2, Info, AlertTriangle } from 'lucide-react';
import { BatchGenerationConfig, VariationConfig } from '../services/batchApi';

interface ParameterVariationFormProps {
  onSubmit: (config: BatchGenerationConfig) => void;
}

interface RangeConfig {
  min: number;
  max: number;
  step: number;
}

interface DistributionConfig {
  type: 'uniform' | 'normal' | 'custom';
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  values?: number[];
  weights?: number[];
  count: number;
}

export const ParameterVariationForm: React.FC<ParameterVariationFormProps> = ({ onSubmit }) => {
  const [baseParams, setBaseParams] = useState({
    scenario_type: 'highway_overtaking',
    ego_vehicle: {
      type: 'car',
      initial_speed: 50
    },
    road_type: 'highway',
    weather: 'clear',
    time_of_day: 'day'
  });

  const [variationMode, setVariationMode] = useState<'ranges' | 'sets' | 'distributions'>('ranges');
  const [speedRange, setSpeedRange] = useState<RangeConfig>({ min: 30, max: 80, step: 10 });
  const [environmentalSets, setEnvironmentalSets] = useState({
    weather: ['clear', 'rain', 'fog'],
    time_of_day: ['day', 'night']
  });
  const [distributionConfig, setDistributionConfig] = useState<DistributionConfig>({
    type: 'normal',
    mean: 60,
    std: 10,
    min: 30,
    max: 90,
    count: 20
  });

  const [showEnvironmental, setShowEnvironmental] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [estimatedCombinations, setEstimatedCombinations] = useState(0);

  // Calculate estimated combinations
  useEffect(() => {
    let combinations = 0;
    
    if (variationMode === 'ranges') {
      const speedVariations = Math.floor((speedRange.max - speedRange.min) / speedRange.step) + 1;
      combinations = speedVariations;
      
      if (showEnvironmental) {
        combinations *= environmentalSets.weather.length * environmentalSets.time_of_day.length;
      }
    } else if (variationMode === 'sets') {
      combinations = environmentalSets.weather.length * environmentalSets.time_of_day.length;
    } else if (variationMode === 'distributions') {
      combinations = distributionConfig.count;
    }
    
    setEstimatedCombinations(combinations);
  }, [variationMode, speedRange, environmentalSets, distributionConfig, showEnvironmental]);

  // Validate configuration
  const validateConfig = useCallback(() => {
    const errors: string[] = [];
    
    if (variationMode === 'ranges') {
      if (speedRange.min >= speedRange.max) {
        errors.push('Minimum speed must be less than maximum speed');
      }
      if (speedRange.step <= 0) {
        errors.push('Step size must be greater than 0');
      }
      if (speedRange.min < 0 || speedRange.max > 200) {
        errors.push('Speed values must be between 0 and 200 km/h');
      }
    }
    
    if (variationMode === 'distributions') {
      if (distributionConfig.type === 'normal') {
        if (!distributionConfig.mean || !distributionConfig.std) {
          errors.push('Mean and standard deviation are required for normal distribution');
        }
        if (distributionConfig.std && distributionConfig.std <= 0) {
          errors.push('Standard deviation must be greater than 0');
        }
      }
      if (distributionConfig.count <= 0 || distributionConfig.count > 1000) {
        errors.push('Count must be between 1 and 1000');
      }
    }
    
    if (estimatedCombinations > 100) {
      errors.push('Too many combinations. Consider reducing parameter ranges.');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  }, [variationMode, speedRange, distributionConfig, estimatedCombinations]);

  const handleSubmit = useCallback(() => {
    if (!validateConfig()) {
      return;
    }

    const variationConfig: VariationConfig = {};
    
    if (variationMode === 'ranges') {
      variationConfig.parameter_ranges = {
        'ego_vehicle.initial_speed': {
          min: speedRange.min,
          max: speedRange.max,
          step: speedRange.step
        }
      };
      
      if (showEnvironmental) {
        variationConfig.parameter_sets = {
          weather: environmentalSets.weather,
          time_of_day: environmentalSets.time_of_day
        };
      }
    } else if (variationMode === 'sets') {
      variationConfig.parameter_sets = {
        weather: environmentalSets.weather,
        time_of_day: environmentalSets.time_of_day
      };
    } else if (variationMode === 'distributions') {
      variationConfig.parameter_distributions = {
        'ego_vehicle.initial_speed': {
          type: distributionConfig.type,
          parameters: {
            mean: distributionConfig.mean,
            std: distributionConfig.std,
            min: distributionConfig.min,
            max: distributionConfig.max,
            values: distributionConfig.values,
            weights: distributionConfig.weights
          },
          count: distributionConfig.count
        }
      };
    }

    const config: BatchGenerationConfig = {
      base_params: baseParams,
      variation_config: variationConfig,
      max_scenarios: estimatedCombinations,
      parallel: estimatedCombinations > 5,
      max_workers: 3
    };

    onSubmit(config);
  }, [baseParams, variationMode, speedRange, environmentalSets, distributionConfig, 
      showEnvironmental, estimatedCombinations, validateConfig, onSubmit]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Parameter Variations</CardTitle>
          <CardDescription>
            Configure parameter variations to generate multiple scenario combinations
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Base Parameters */}
          <div>
            <h3 className="text-lg font-medium mb-4">Base Parameters</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scenario-type">Scenario Type</Label>
                <Select 
                  value={baseParams.scenario_type}
                  onValueChange={(value) => setBaseParams(prev => ({ ...prev, scenario_type: value }))}
                >
                  <SelectTrigger id="scenario-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="highway_overtaking">Highway Overtaking</SelectItem>
                    <SelectItem value="intersection_crossing">Intersection Crossing</SelectItem>
                    <SelectItem value="lane_change">Lane Change</SelectItem>
                    <SelectItem value="parking">Parking Scenario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="ego-speed">Ego Vehicle Speed (km/h)</Label>
                <Input
                  id="ego-speed"
                  type="number"
                  value={baseParams.ego_vehicle.initial_speed}
                  onChange={(e) => setBaseParams(prev => ({
                    ...prev,
                    ego_vehicle: { ...prev.ego_vehicle, initial_speed: Number(e.target.value) }
                  }))}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Variation Configuration */}
          <div>
            <h3 className="text-lg font-medium mb-4">Variation Configuration</h3>
            
            <Tabs value={variationMode} onValueChange={(value) => setVariationMode(value as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ranges">Ranges</TabsTrigger>
                <TabsTrigger value="sets">Sets</TabsTrigger>
                <TabsTrigger value="distributions">
                  <span>Distributions</span>
                  <Label htmlFor="distribution-mode" className="sr-only">Distribution mode</Label>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ranges" className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">Speed Range</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="min-speed">Minimum Speed (km/h)</Label>
                      <Input
                        id="min-speed"
                        type="number"
                        value={speedRange.min}
                        onChange={(e) => setSpeedRange(prev => ({ ...prev, min: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="max-speed">Maximum Speed (km/h)</Label>
                      <Input
                        id="max-speed"
                        type="number"
                        value={speedRange.max}
                        onChange={(e) => setSpeedRange(prev => ({ ...prev, max: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="step-size">Step Size (km/h)</Label>
                      <Input
                        id="step-size"
                        type="number"
                        value={speedRange.step}
                        onChange={(e) => setSpeedRange(prev => ({ ...prev, step: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-600">
                    {Math.floor((speedRange.max - speedRange.min) / speedRange.step) + 1} speed variations
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="environmental-switch"
                    checked={showEnvironmental}
                    onCheckedChange={setShowEnvironmental}
                  />
                  <Label htmlFor="environmental-switch">Add Environmental Variations</Label>
                </div>

                {showEnvironmental && (
                  <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="weather-conditions">Weather Conditions</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {environmentalSets.weather.map((weather) => (
                          <Badge key={weather} variant="secondary">{weather}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="time-of-day">Time of Day</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {environmentalSets.time_of_day.map((time) => (
                          <Badge key={time} variant="secondary">{time}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sets" className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">Parameter Sets</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Generate all combinations of the selected parameter values
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="weather-sets">Weather Conditions</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {environmentalSets.weather.map((weather) => (
                          <Badge key={weather} variant="secondary">{weather}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="time-sets">Time of Day</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {environmentalSets.time_of_day.map((time) => (
                          <Badge key={time} variant="secondary">{time}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="distributions" className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">Statistical Distribution</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="distribution-type">Distribution Type</Label>
                      <Select 
                        value={distributionConfig.type}
                        onValueChange={(value) => setDistributionConfig(prev => ({ 
                          ...prev, 
                          type: value as any 
                        }))}
                      >
                        <SelectTrigger id="distribution-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="uniform">Uniform</SelectItem>
                          <SelectItem value="normal">Normal (Gaussian)</SelectItem>
                          <SelectItem value="custom">Custom Weighted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="sample-count">Sample Count</Label>
                      <Input
                        id="sample-count"
                        type="number"
                        value={distributionConfig.count}
                        onChange={(e) => setDistributionConfig(prev => ({ 
                          ...prev, 
                          count: Number(e.target.value) 
                        }))}
                      />
                    </div>
                  </div>

                  {distributionConfig.type === 'normal' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="mean-value">Mean Value</Label>
                        <Input
                          id="mean-value"
                          type="number"
                          value={distributionConfig.mean}
                          onChange={(e) => setDistributionConfig(prev => ({ 
                            ...prev, 
                            mean: Number(e.target.value) 
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="std-deviation">Standard Deviation</Label>
                        <Input
                          id="std-deviation"
                          type="number"
                          value={distributionConfig.std}
                          onChange={(e) => setDistributionConfig(prev => ({ 
                            ...prev, 
                            std: Number(e.target.value) 
                          }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Summary */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Estimated Combinations:</span>
              <Badge variant="secondary">{estimatedCombinations}</Badge>
            </div>
            
            <Button 
              onClick={handleSubmit}
              disabled={validationErrors.length > 0 || estimatedCombinations === 0}
            >
              Generate Variations
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParameterVariationForm;