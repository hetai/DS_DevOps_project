/**
 * Template Manager Component
 * 
 * Manages scenario templates with variable substitution for batch generation
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, Trash2, FileText, Code, CheckCircle2, AlertTriangle } from 'lucide-react';
import { BatchGenerationConfig, generateFromTemplate, validateTemplate, getAvailableTemplates } from '../services/batchApi';

interface TemplateManagerProps {
  onGenerate: (config: BatchGenerationConfig) => void;
}

interface Template {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  variables: string[];
}

interface TemplateVariable {
  name: string;
  values: string[];
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'highway_overtaking',
    name: 'Highway Overtaking',
    description: 'Parameterized highway overtaking scenario',
    parameters: {
      scenario_type: 'highway_overtaking',
      ego_vehicle: {
        type: 'car',
        initial_speed: '${ego_speed}',
        lane_id: -1
      },
      target_vehicle: {
        type: '${target_type}',
        initial_speed: '${target_speed}',
        lane_id: -2
      },
      weather: '${weather_condition}',
      road_type: 'highway'
    },
    variables: ['ego_speed', 'target_type', 'target_speed', 'weather_condition']
  },
  {
    id: 'intersection_crossing',
    name: 'Intersection Crossing',
    description: 'Urban intersection crossing with traffic lights',
    parameters: {
      scenario_type: 'intersection_crossing',
      ego_vehicle: {
        type: 'car',
        initial_speed: '${approach_speed}',
        position: { x: -100, y: 0 }
      },
      traffic_light: {
        initial_state: '${light_state}',
        timing: '${light_timing}'
      },
      cross_traffic: '${has_cross_traffic}',
      time_of_day: '${time_condition}'
    },
    variables: ['approach_speed', 'light_state', 'light_timing', 'has_cross_traffic', 'time_condition']
  }
];

export const TemplateManager: React.FC<TemplateManagerProps> = ({ onGenerate }) => {
  const [activeTab, setActiveTab] = useState('select');
  const [availableTemplates, setAvailableTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([]);
  const [customTemplate, setCustomTemplate] = useState({
    name: '',
    content: ''
  });
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
    variables: string[];
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [maxCombinations, setMaxCombinations] = useState(12);

  // Load available templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const result = await getAvailableTemplates();
        if (result.templates.length > 0) {
          setAvailableTemplates([...DEFAULT_TEMPLATES, ...result.templates]);
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    };
    
    loadTemplates();
  }, []);

  // Update variables when template is selected
  useEffect(() => {
    if (selectedTemplateId) {
      const template = availableTemplates.find(t => t.id === selectedTemplateId);
      if (template) {
        const initialVariables = template.variables.map(varName => ({
          name: varName,
          values: getDefaultValuesForVariable(varName)
        }));
        setTemplateVariables(initialVariables);
      }
    }
  }, [selectedTemplateId, availableTemplates]);

  const getDefaultValuesForVariable = (varName: string): string[] => {
    // Provide sensible defaults based on variable name patterns
    if (varName.includes('speed')) {
      return ['40', '50', '60', '70'];
    } else if (varName.includes('type')) {
      return ['car', 'truck', 'van'];
    } else if (varName.includes('weather')) {
      return ['clear', 'rain', 'fog'];
    } else if (varName.includes('time') || varName.includes('condition')) {
      return ['day', 'night', 'dawn', 'dusk'];
    } else if (varName.includes('state')) {
      return ['red', 'green', 'yellow'];
    } else if (varName.includes('timing')) {
      return ['5', '10', '15'];
    } else if (varName.includes('traffic')) {
      return ['true', 'false'];
    } else {
      return ['value1', 'value2', 'value3'];
    }
  };

  const handleVariableChange = useCallback((varIndex: number, newValues: string[]) => {
    setTemplateVariables(prev => prev.map((tv, index) => 
      index === varIndex ? { ...tv, values: newValues } : tv
    ));
  }, []);

  const addVariableValue = useCallback((varIndex: number, value: string) => {
    if (value.trim()) {
      setTemplateVariables(prev => prev.map((tv, index) => 
        index === varIndex ? { 
          ...tv, 
          values: [...tv.values, value.trim()] 
        } : tv
      ));
    }
  }, []);

  const removeVariableValue = useCallback((varIndex: number, valueIndex: number) => {
    setTemplateVariables(prev => prev.map((tv, index) => 
      index === varIndex ? { 
        ...tv, 
        values: tv.values.filter((_, vi) => vi !== valueIndex)
      } : tv
    ));
  }, []);

  const validateCustomTemplate = useCallback(async () => {
    if (!customTemplate.content.trim()) {
      setValidationResult({
        valid: false,
        errors: ['Template content is required'],
        variables: []
      });
      return;
    }

    try {
      const template = JSON.parse(customTemplate.content);
      const result = await validateTemplate(template);
      setValidationResult(result);
      
      if (result.valid) {
        // Set up variables for the custom template
        const initialVariables = result.variables.map(varName => ({
          name: varName,
          values: getDefaultValuesForVariable(varName)
        }));
        setTemplateVariables(initialVariables);
      }
    } catch (error) {
      setValidationResult({
        valid: false,
        errors: ['Invalid JSON syntax'],
        variables: []
      });
    }
  }, [customTemplate.content]);

  const calculateCombinations = useCallback(() => {
    if (templateVariables.length === 0) return 0;
    
    return templateVariables.reduce((total, tv) => total * Math.max(tv.values.length, 1), 1);
  }, [templateVariables]);

  const handleGenerateFromTemplate = useCallback(async () => {
    const template = selectedTemplateId 
      ? availableTemplates.find(t => t.id === selectedTemplateId)
      : (validationResult?.valid ? JSON.parse(customTemplate.content) : null);
    
    if (!template) {
      return;
    }

    setIsGenerating(true);
    
    try {
      const variableValues = templateVariables.reduce((acc, tv) => {
        acc[tv.name] = tv.values;
        return acc;
      }, {} as Record<string, string[]>);

      const result = await generateFromTemplate(
        typeof template === 'string' ? JSON.parse(template) : template,
        variableValues,
        maxCombinations
      );

      if (result.success) {
        const batchConfig: BatchGenerationConfig = {
          base_params: {}, // Template provides all parameters
          variation_config: {
            max_combinations: result.total_scenarios
          },
          max_scenarios: result.total_scenarios,
          parallel: result.total_scenarios > 5
        };

        onGenerate(batchConfig);
      }
    } catch (error) {
      console.error('Template generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTemplateId, availableTemplates, customTemplate.content, validationResult, 
      templateVariables, maxCombinations, onGenerate]);

  const estimatedCombinations = calculateCombinations();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Scenario Templates
          </CardTitle>
          <CardDescription>
            Use predefined templates or create custom templates for batch scenario generation
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="select">Select Template</TabsTrigger>
              <TabsTrigger value="custom">Custom Template</TabsTrigger>
            </TabsList>

            <TabsContent value="select" className="space-y-6">
              {/* Template Selection */}
              <div>
                <Label htmlFor="select-template">Select Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger id="select-template" className="mt-2">
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div>
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-gray-500">{template.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Template Variables Configuration */}
              {selectedTemplateId && templateVariables.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Template Variables</h3>
                  <div className="space-y-4">
                    {templateVariables.map((tv, varIndex) => (
                      <div key={tv.name} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="font-medium">{tv.name}</Label>
                          <Badge variant="secondary">{tv.values.length} values</Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                          {tv.values.map((value, valueIndex) => (
                            <div key={valueIndex} className="flex items-center gap-1">
                              <Badge variant="outline">{value}</Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeVariableValue(varIndex, valueIndex)}
                                className="h-6 w-6 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add new value..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addVariableValue(varIndex, e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                              addVariableValue(varIndex, input.value);
                              input.value = '';
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="custom" className="space-y-6">
              <div className="text-sm text-gray-600 mb-4">
                Create custom templates using JSON format with <code>${'variable'}</code> syntax for parameters.
              </div>
              
              {/* Custom Template Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    value={customTemplate.name}
                    onChange={(e) => setCustomTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter template name..."
                  />
                </div>
                
                <div>
                  <Label htmlFor="template-content">Template Content</Label>
                  <div className="text-sm text-gray-600 mb-2">
                    Use <code>${'variable'}</code> syntax for parameterization. Example: <code>${'ego_speed'}</code>
                  </div>
                  <Textarea
                    id="template-content"
                    value={customTemplate.content}
                    onChange={(e) => setCustomTemplate(prev => ({ ...prev, content: e.target.value }))}
                    placeholder='{"scenario_type": "custom", "ego_vehicle": {"speed": "${speed}"}}'
                    className="font-mono text-sm min-h-[200px]"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={validateCustomTemplate} variant="outline">
                    <Code className="h-4 w-4 mr-2" />
                    Validate Template
                  </Button>
                </div>
                
                {/* Validation Results */}
                {validationResult && (
                  <Alert variant={validationResult.valid ? "default" : "destructive"}>
                    {validationResult.valid ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      {validationResult.valid ? (
                        <div>
                          <div className="font-medium">Template is valid!</div>
                          <div className="text-sm mt-1">
                            Variables found: {validationResult.variables.join(', ')}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium">Invalid template syntax</div>
                          <ul className="text-sm mt-1 list-disc list-inside">
                            {validationResult.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Custom Template Variables */}
                {validationResult?.valid && templateVariables.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Configure Variables</h4>
                    <div className="space-y-4">
                      {templateVariables.map((tv, varIndex) => (
                        <div key={tv.name} className="p-3 border rounded">
                          <Label className="font-medium">{tv.name}</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {tv.values.map((value, valueIndex) => (
                              <div key={valueIndex} className="flex items-center gap-1">
                                <Badge variant="outline">{value}</Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeVariableValue(varIndex, valueIndex)}
                                  className="h-5 w-5 p-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Generation Summary and Controls */}
          {templateVariables.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="max-combinations">Maximum Combinations</Label>
                  <Input
                    id="max-combinations"
                    type="number"
                    value={maxCombinations}
                    onChange={(e) => setMaxCombinations(Number(e.target.value))}
                    className="w-32 mt-1"
                  />
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-gray-600">Estimated Combinations</div>
                  <div className="text-2xl font-bold">
                    {Math.min(estimatedCombinations, maxCombinations)}
                  </div>
                  {estimatedCombinations > maxCombinations && (
                    <div className="text-xs text-orange-600">
                      (Limited from {estimatedCombinations})
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleGenerateFromTemplate}
                  disabled={isGenerating || templateVariables.length === 0 || estimatedCombinations === 0}
                  className="flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Generate from Template
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TemplateManager;