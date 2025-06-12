
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Check, Upload, AlertCircle, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { validateOpenScenario, ValidationResult } from "@/services/openscenarioApi";

const ScenarioValidator = () => {
  const [file, setFile] = useState<File | null>(null);
  const [validating, setValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.xosc')) {
        setFile(selectedFile);
        toast({
          title: "File selected",
          description: `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)`
        });
        
        // Read file content
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setFileContent(event.target.result as string);
          }
        };
        reader.readAsText(selectedFile);
        
      } else {
        toast({
          title: "Invalid file",
          description: "Please select a .xosc file for validation",
          variant: "destructive"
        });
        setFile(null);
      }
    }
  };
  
  const handleValidate = async () => {
    if (!file) return;
    
    setValidating(true);
    
    try {
      const result = await validateOpenScenario(file);
      setValidationResult(result);
      
      if (result.valid) {
        toast({
          title: "Validation successful",
          description: "The scenario file is valid and can be used for simulation."
        });
      } else {
        toast({
          title: "Validation failed",
          description: `Found ${result.errors.length} error(s) in the scenario file.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: "Validation error",
        description: "Failed to validate the scenario file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Scenario Validator</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload OpenSCENARIO File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input 
              type="file" 
              ref={fileInputRef}
              accept=".xosc" 
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            <Button 
              onClick={handleValidate}
              disabled={validating || !file}
            >
              {validating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                "Validate"
              )}
            </Button>
          </div>
          
          {file && (
            <p className="text-sm text-muted-foreground">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </CardContent>
      </Card>
      
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validationResult.valid ? (
                <>
                  <Check className="text-green-500" size={20} />
                  <span>Validation Successful</span>
                </>
              ) : (
                <>
                  <AlertCircle className="text-red-500" size={20} />
                  <span>Validation Failed</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="results">
              <TabsList className="mb-4">
                <TabsTrigger value="results">Results</TabsTrigger>
                <TabsTrigger value="content">File Content</TabsTrigger>
              </TabsList>
              
              <TabsContent value="results" className="space-y-4">
                {!validationResult.valid && validationResult.errors.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-red-500 mb-2">Errors</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {validationResult.errors.map((error, index) => (
                        <li key={index} className="text-sm">
                          {error.line && `Line ${error.line}: `}{error.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {validationResult.warnings.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-amber-500 mb-2">Warnings</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {validationResult.warnings.map((warning, index) => (
                        <li key={index} className="text-sm">
                          {warning.line && `Line ${warning.line}: `}{warning.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {validationResult.valid && validationResult.warnings.length === 0 && (
                  <p>The scenario file is fully compliant with the OpenSCENARIO standard.</p>
                )}
              </TabsContent>
              
              <TabsContent value="content">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-md p-4 max-h-[400px] overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap">
                    {fileContent || "No file content to display."}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ScenarioValidator;
