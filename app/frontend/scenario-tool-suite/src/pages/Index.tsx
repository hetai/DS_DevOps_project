import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Play, Pause, Square, RotateCcw, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Scene3D from "@/components/Scene3D";

const Index = () => {
  // Files state
  const [scenarioFile, setScenarioFile] = useState<File | null>(null);
  const [driveFile, setDriveFile] = useState<File | null>(null);
  
  // Simulation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [simulationTime, setSimulationTime] = useState(0);
  const [simulationStatus, setSimulationStatus] = useState("Ready");
  
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const handleScenarioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.xosc')) {
        setScenarioFile(selectedFile);
        toast({
          title: "OpenSCENARIO file selected",
          description: `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)`
        });
        console.log(`OpenSCENARIO file selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)`);
      } else {
        toast({
          title: "Invalid file",
          description: "Please select a .xosc file for OpenSCENARIO",
          variant: "destructive"
        });
        setScenarioFile(null);
      }
    }
  };
  
  const handleDriveFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.xodr')) {
        setDriveFile(selectedFile);
        toast({
          title: "OpenDRIVE file selected",
          description: `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)`
        });
        console.log(`OpenDRIVE file selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)`);
      } else {
        toast({
          title: "Invalid file",
          description: "Please select a .xodr file for OpenDRIVE",
          variant: "destructive"
        });
        setDriveFile(null);
      }
    }
  };

  const handleUpload = () => {
    if (!scenarioFile) {
      toast({
        title: "No OpenSCENARIO file",
        description: "Please select an OpenSCENARIO (.xosc) file first",
        variant: "destructive"
      });
      return;
    }
    
    if (!driveFile) {
      toast({
        title: "No OpenDRIVE file",
        description: "Please select an OpenDRIVE (.xodr) file first",
        variant: "destructive"
      });
      return;
    }
    
    // Here we'll add the upload logic in future steps
    toast({
      title: "Files uploaded successfully",
      description: "OpenSCENARIO and OpenDRIVE files have been loaded"
    });
    
    // For now, we're just simulating the upload
    setSimulationStatus("Ready to play");
  };
  
  // Play, pause, stop, reset handlers
  const handlePlay = () => {
    setIsPlaying(true);
    setIsPaused(false);
    setSimulationStatus("Playing");
  };
  
  const handlePause = () => {
    setIsPaused(true);
    setIsPlaying(false);
    setSimulationStatus("Paused");
  };
  
  const handleStop = () => {
    setIsPlaying(false);
    setIsPaused(false);
    setSimulationTime(0);
    setSimulationStatus("Stopped");
  };
  
  const handleReset = () => {
    setIsPlaying(false);
    setIsPaused(false);
    setSimulationTime(0);
    setSimulationStatus("Reset");
  };
  
  // Effect for simulation time
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (isPlaying) {
      interval = setInterval(() => {
        setSimulationTime(prev => prev + 0.1);
      }, 100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);
  
  // Effect for initializing Three.js scene
  useEffect(() => {
    // We'll implement the Three.js scene in future steps
    console.log("Canvas element ready for Three.js initialization");
  }, []);
  
  const areFilesReady = scenarioFile && driveFile;
  
  return (
    <div className="bg-background">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-8">Scenario Player</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>File Upload</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="scenario" className="w-full">
                  <TabsList className="grid grid-cols-2 w-full mb-4">
                    <TabsTrigger value="scenario">OpenSCENARIO</TabsTrigger>
                    <TabsTrigger value="drive">OpenDRIVE</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="scenario" className="space-y-2">
                    <Input 
                      type="file" 
                      accept=".xosc" 
                      onChange={handleScenarioFileChange}
                      className="cursor-pointer"
                    />
                    <p className="text-sm text-muted-foreground">
                      {scenarioFile ? `Selected: ${scenarioFile.name}` : "No OpenSCENARIO file selected"}
                    </p>
                  </TabsContent>
                  
                  <TabsContent value="drive" className="space-y-2">
                    <Input 
                      type="file" 
                      accept=".xodr" 
                      onChange={handleDriveFileChange}
                      className="cursor-pointer"
                    />
                    <p className="text-sm text-muted-foreground">
                      {driveFile ? `Selected: ${driveFile.name}` : "No OpenDRIVE file selected"}
                    </p>
                  </TabsContent>
                </Tabs>
                
                <Button 
                  onClick={handleUpload} 
                  disabled={!areFilesReady}
                  className="w-full"
                >
                  <Upload className="mr-2" size={16} />
                  Upload Files
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Simulation Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span>{simulationStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span>{simulationTime.toFixed(1)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scenario:</span>
                  <span>{scenarioFile ? scenarioFile.name : "No file"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Road Network:</span>
                  <span>{driveFile ? driveFile.name : "No file"}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Playback Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between gap-2">
                  <Button
                    onClick={handlePlay}
                    disabled={isPlaying || !areFilesReady}
                    variant="outline"
                    className="flex-1"
                  >
                    <Play className="mr-1" size={18} />
                    Play
                  </Button>
                  <Button
                    onClick={handlePause}
                    disabled={!isPlaying || isPaused}
                    variant="outline"
                    className="flex-1"
                  >
                    <Pause className="mr-1" size={18} />
                    Pause
                  </Button>
                  <Button
                    onClick={handleStop}
                    disabled={!isPlaying && !isPaused}
                    variant="outline"
                    className="flex-1"
                  >
                    <Square className="mr-1" size={18} />
                    Stop
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="flex-1"
                  >
                    <RotateCcw className="mr-1" size={18} />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle>3D Scene</CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-5rem)]">
                <div 
                  ref={canvasRef} 
                  id="scene-container"
                  className="w-full h-full bg-slate-100 dark:bg-slate-800 rounded-md"
                >
                  <Scene3D 
                    isPlaying={isPlaying} 
                    simulationTime={simulationTime}
                    scenarioFile={scenarioFile}
                    driveFile={driveFile}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Console Log</CardTitle>
          </CardHeader>
          <CardContent className="h-32 overflow-y-auto bg-slate-100 dark:bg-slate-800 rounded-md p-2">
            <div className="font-mono text-sm">
              <p>System ready. Upload OpenSCENARIO (.xosc) and OpenDRIVE (.xodr) files to begin.</p>
              {isPlaying && <p>Simulation running at time: {simulationTime.toFixed(1)}s</p>}
              {isPaused && <p>Simulation paused at time: {simulationTime.toFixed(1)}s</p>}
              {scenarioFile && driveFile && <p>Files loaded: {scenarioFile.name}, {driveFile.name}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
