
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Activity } from "lucide-react";
import SimpleChatBot from "@/components/SimpleChatBot";
import WorkflowProgress from "@/components/WorkflowProgress";
import { WorkflowProvider, useWorkflow } from "@/components/WorkflowManager";

function ScenarioGeneratorContent() {
  const [generatedFiles, setGeneratedFiles] = useState<Record<string, string>>({});
  const [validationResults, setValidationResults] = useState<Record<string, any>>({});
  const [_visualizationData, _setVisualizationData] = useState<any>(null);
  const { state: workflowState } = useWorkflow();

  const handleScenarioGenerated = (files: Record<string, string>) => {
    setGeneratedFiles(files);
  };

  const handleValidationComplete = (results: Record<string, any>) => {
    setValidationResults(results);
  };

  const handleVisualizationReady = (metadata: any) => {
    setVisualizationData(metadata);
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Use workflow files if available, otherwise fall back to legacy generated files
  const displayFiles = Object.keys(workflowState.scenarioFiles).length > 0 
    ? workflowState.scenarioFiles 
    : generatedFiles;

  const displayValidation = Object.keys(workflowState.validationResults).length > 0
    ? workflowState.validationResults
    : validationResults;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
      {/* AI Chat Interface */}
      <div className="flex flex-col space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              AI Scenario Generator
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Describe your driving scenario in natural language. I'll generate, validate, and prepare your files automatically!
            </p>
          </CardHeader>
        </Card>
        
        <div className="flex-1">
          <SimpleChatBot onScenarioGenerated={handleScenarioGenerated} />
        </div>
      </div>

      {/* Workflow Progress and Results */}
      <div className="flex flex-col space-y-4">
        {/* Workflow Progress */}
        <WorkflowProgress
          onFilesGenerated={handleScenarioGenerated}
          onValidationComplete={handleValidationComplete}
          onVisualizationReady={handleVisualizationReady}
        />

        {/* Generated Files Display */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Generated Files
              {Object.keys(displayFiles).length > 0 && (
                <Badge variant="secondary">
                  {Object.keys(displayFiles).length} files
                </Badge>
              )}
              {workflowState.sessionId && (
                <Badge variant="outline" className="ml-auto">
                  <Activity className="w-3 h-3 mr-1" />
                  Workflow Active
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(displayFiles).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No files generated yet.</p>
                <p className="text-sm">
                  {workflowState.sessionId 
                    ? 'Workflow is running - files will appear automatically'
                    : 'Start a conversation with the AI to generate scenario files'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(displayFiles).map(([filename, content]) => {
                  // Get validation status for this file
                  const fileValidation = displayValidation[filename];
                  const hasErrors = fileValidation?.total_errors > 0;
                  const hasWarnings = fileValidation?.total_warnings > 0;
                  
                  return (
                    <Card key={filename} className={`border-dashed ${
                      hasErrors ? 'border-red-300' : 
                      hasWarnings ? 'border-yellow-300' : 
                      fileValidation ? 'border-green-300' : ''
                    }`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">
                              {filename}
                            </CardTitle>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(content.length / 1024)}KB
                            </Badge>
                            {fileValidation && (
                              <Badge variant={hasErrors ? 'destructive' : hasWarnings ? 'secondary' : 'default'} className="text-xs">
                                {hasErrors ? `${fileValidation.total_errors} errors` :
                                 hasWarnings ? `${fileValidation.total_warnings} warnings` :
                                 'Valid'}
                              </Badge>
                            )}
                          </div>
                          <button
                            onClick={() => downloadFile(filename, content)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Textarea
                          value={content}
                          readOnly
                          className="min-h-32 text-xs font-mono"
                          placeholder="Generated content will appear here..."
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ScenarioGenerator() {
  return (
    <WorkflowProvider>
      <ScenarioGeneratorContent />
    </WorkflowProvider>
  );
}
