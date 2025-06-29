/**
 * Batch Results Viewer Component
 * 
 * Displays batch generation results with scenario list, filtering,
 * sorting, preview, and download capabilities.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Download, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  Filter, 
  SortAsc, 
  FileText,
  Archive
} from 'lucide-react';
import { BatchGenerationResult, ScenarioResult } from '../services/batchApi';

interface BatchResultsViewerProps {
  results: BatchGenerationResult;
}

interface ScenarioEntry {
  id: string;
  name: string;
  result: ScenarioResult;
  selected: boolean;
}

type FilterStatus = 'all' | 'successful' | 'failed';
type SortBy = 'name' | 'status' | 'ego_speed' | 'weather';

export const BatchResultsViewer: React.FC<BatchResultsViewerProps> = ({ results }) => {
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewScenario, setPreviewScenario] = useState<ScenarioEntry | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Convert results to scenario entries
  const scenarioEntries = useMemo(() => {
    const entries: ScenarioEntry[] = [];
    
    results.scenarios.forEach((scenarioObj) => {
      Object.entries(scenarioObj).forEach(([name, result]) => {
        entries.push({
          id: name,
          name,
          result,
          selected: selectedScenarios.has(name)
        });
      });
    });
    
    return entries;
  }, [results.scenarios, selectedScenarios]);

  // Filter and sort scenarios
  const filteredAndSortedScenarios = useMemo(() => {
    let filtered = scenarioEntries;
    
    // Apply status filter
    if (filterStatus === 'successful') {
      filtered = filtered.filter(s => s.result.generation_success);
    } else if (filterStatus === 'failed') {
      filtered = filtered.filter(s => !s.result.generation_success);
    }
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Object.values(s.result.parameters).some(param => 
          String(param).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return Number(b.result.generation_success) - Number(a.result.generation_success);
        case 'ego_speed':
          const speedA = a.result.parameters.ego_speed || a.result.parameters['ego_vehicle.initial_speed'] || 0;
          const speedB = b.result.parameters.ego_speed || b.result.parameters['ego_vehicle.initial_speed'] || 0;
          return speedA - speedB;
        case 'weather':
          const weatherA = a.result.parameters.weather || '';
          const weatherB = b.result.parameters.weather || '';
          return weatherA.localeCompare(weatherB);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [scenarioEntries, filterStatus, searchTerm, sortBy]);

  const successfulCount = scenarioEntries.filter(s => s.result.generation_success).length;
  const failedCount = scenarioEntries.length - successfulCount;
  const selectedCount = selectedScenarios.size;

  const handleScenarioSelect = useCallback((scenarioId: string, selected: boolean) => {
    setSelectedScenarios(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(scenarioId);
      } else {
        newSet.delete(scenarioId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedScenarios(new Set(filteredAndSortedScenarios.map(s => s.id)));
    } else {
      setSelectedScenarios(new Set());
    }
  }, [filteredAndSortedScenarios]);

  const handlePreviewScenario = useCallback((scenario: ScenarioEntry) => {
    setPreviewScenario(scenario);
  }, []);

  const handleDownloadScenario = useCallback((scenario: ScenarioEntry) => {
    // Create download for single scenario
    const blob = new Blob([scenario.result.xosc_content], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scenario.name}.xosc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleDownloadSelected = useCallback(() => {
    // Implementation for downloading selected scenarios
    console.log('Downloading selected scenarios:', Array.from(selectedScenarios));
  }, [selectedScenarios]);

  const handleExportResults = useCallback((format: 'csv' | 'json' | 'zip') => {
    // Implementation for exporting results in different formats
    console.log('Exporting results as:', format);
    setShowExportDialog(false);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Batch Results</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{scenarioEntries.length} scenarios</Badge>
              <Badge variant="secondary" className="text-green-700">
                {successfulCount} successful
              </Badge>
              {failedCount > 0 && (
                <Badge variant="destructive">
                  {failedCount} failed
                </Badge>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Generated {results.total_scenarios} scenarios in {Math.round(results.generation_time / 1000)}s
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="flex items-center gap-2">
                <Label htmlFor="search">Search:</Label>
                <Input
                  id="search"
                  placeholder="Search scenarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48"
                />
              </div>
              
              {/* Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <Label htmlFor="filter-status">Filter by status:</Label>
                <Select value={filterStatus} onValueChange={(value: FilterStatus) => setFilterStatus(value)}>
                  <SelectTrigger id="filter-status" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="successful">Successful</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Sort */}
              <div className="flex items-center gap-2">
                <SortAsc className="h-4 w-4" />
                <Label htmlFor="sort-by">Sort by:</Label>
                <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
                  <SelectTrigger id="sort-by" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="ego_speed">Speed</SelectItem>
                    <SelectItem value="weather">Weather</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              {selectedCount > 0 && (
                <>
                  <span className="text-sm text-gray-600">{selectedCount} selected</span>
                  <Button
                    onClick={handleDownloadSelected}
                    variant="outline"
                    size="sm"
                    disabled={selectedCount === 0}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download Selected
                  </Button>
                </>
              )}
              
              <Button
                onClick={() => setShowExportDialog(true)}
                variant="outline"
                size="sm"
              >
                <Archive className="h-4 w-4 mr-1" />
                Export Results
              </Button>
            </div>
          </div>

          <Separator />

          {/* Scenario List */}
          <div className="space-y-4">
            {/* Select All */}
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <Checkbox
                checked={selectedCount === filteredAndSortedScenarios.length && filteredAndSortedScenarios.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label className="text-sm font-medium">
                Select All ({filteredAndSortedScenarios.length} scenarios)
              </Label>
            </div>
            
            {/* Scenario Entries */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredAndSortedScenarios.map((scenario) => (
                <Card key={scenario.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedScenarios.has(scenario.id)}
                        onCheckedChange={(checked) => handleScenarioSelect(scenario.id, checked as boolean)}
                        aria-label={`Select ${scenario.name}`}
                      />
                      
                      <div className="flex items-center gap-2">
                        {scenario.result.generation_success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium">{scenario.name}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Parameters */}
                      <div className="flex gap-1">
                        {Object.entries(scenario.result.parameters).map(([key, value]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key.replace('ego_vehicle.', '').replace('_', ' ')}: {String(value)}
                          </Badge>
                        ))}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-1">
                        <Button
                          onClick={() => handlePreviewScenario(scenario)}
                          variant="ghost"
                          size="sm"
                          aria-label={`Preview ${scenario.name}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview {scenario.name}
                        </Button>
                        
                        {scenario.result.generation_success && (
                          <Button
                            onClick={() => handleDownloadScenario(scenario)}
                            variant="ghost"
                            size="sm"
                            aria-label={`Download ${scenario.name}`}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download {scenario.name}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {!scenario.result.generation_success && scenario.result.error && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>Generation failed: {scenario.result.error}</AlertDescription>
                    </Alert>
                  )}
                </Card>
              ))}
              
              {filteredAndSortedScenarios.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-lg font-medium mb-2">
                    {searchTerm || filterStatus !== 'all' ? 'No matching scenarios' : 'No scenarios generated'}
                  </div>
                  <div className="text-sm">
                    {searchTerm || filterStatus !== 'all' 
                      ? 'Try adjusting your search or filter criteria'
                      : 'Generate scenarios to see results here'
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Preview Modal */}
      {previewScenario && (
        <Card className="fixed inset-4 z-50 bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Scenario Preview</span>
              <Button
                onClick={() => setPreviewScenario(null)}
                variant="ghost"
                size="sm"
              >
                ×
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="xosc" className="w-full">
              <TabsList>
                <TabsTrigger value="xosc">OpenSCENARIO</TabsTrigger>
                <TabsTrigger value="xodr">OpenDRIVE</TabsTrigger>
                <TabsTrigger value="params">Parameters</TabsTrigger>
              </TabsList>
              
              <TabsContent value="xosc" className="mt-4">
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                  {previewScenario.result.xosc_content}
                </pre>
              </TabsContent>
              
              <TabsContent value="xodr" className="mt-4">
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                  {previewScenario.result.xodr_content}
                </pre>
              </TabsContent>
              
              <TabsContent value="params" className="mt-4">
                <div className="space-y-2">
                  {Object.entries(previewScenario.result.parameters).map(([key, value]) => (
                    <div key={key} className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="font-medium">{key}:</span>
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <Card className="fixed inset-x-4 top-1/2 transform -translate-y-1/2 z-50 bg-white shadow-lg max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Export Results</CardTitle>
            <CardDescription>Choose export format</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button
                onClick={() => handleExportResults('csv')}
                variant="outline"
                className="w-full justify-start"
              >
                <FileText className="h-4 w-4 mr-2" />
                CSV (Parameters only)
              </Button>
              
              <Button
                onClick={() => handleExportResults('json')}
                variant="outline"
                className="w-full justify-start"
              >
                <FileText className="h-4 w-4 mr-2" />
                JSON (Complete data)
              </Button>
              
              <Button
                onClick={() => handleExportResults('zip')}
                variant="outline"
                className="w-full justify-start"
              >
                <Archive className="h-4 w-4 mr-2" />
                ZIP Archive (All files)
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setShowExportDialog(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BatchResultsViewer;