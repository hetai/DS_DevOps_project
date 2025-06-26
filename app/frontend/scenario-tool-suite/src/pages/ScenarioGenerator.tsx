
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Download } from "lucide-react";
import SimpleChatBot from "@/components/SimpleChatBot";

export default function ScenarioGenerator() {
  const [generatedFiles, setGeneratedFiles] = useState<Record<string, string>>({});

  const handleScenarioGenerated = (files: Record<string, string>) => {
    setGeneratedFiles(files);
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

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
      {/* AI Chat Interface */}
      <div className="flex flex-col">
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              AI Scenario Generator
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Describe your driving scenario in natural language, and I'll help you create compliant OpenSCENARIO files.
            </p>
          </CardHeader>
        </Card>
        
        <div className="flex-1">
          <SimpleChatBot onScenarioGenerated={handleScenarioGenerated} />
        </div>
      </div>

      {/* Generated Files Display */}
      <div className="flex flex-col">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Generated Files
              {Object.keys(generatedFiles).length > 0 && (
                <Badge variant="secondary">
                  {Object.keys(generatedFiles).length} files
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(generatedFiles).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No files generated yet.</p>
                <p className="text-sm">Start a conversation with the AI to generate scenario files.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(generatedFiles).map(([filename, content]) => (
                  <Card key={filename} className="border-dashed">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          {filename}
                        </CardTitle>
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
