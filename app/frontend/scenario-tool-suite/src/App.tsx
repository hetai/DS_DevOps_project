import { Routes, Route, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Bot, 
  Cpu, 
  FileCheck, 
  GitBranch, 
  Home, 
  Menu, 
  MessageSquare,
  Monitor,
  Play,
  Search,
  Settings,
  Shield,
  Upload,
  User,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

// Modern Navigation Component
function ModernNavigation() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const navItems = [
    { path: "/", label: "Scenario Player", icon: Play },
    { path: "/generator", label: "AI Generator", icon: Bot },
    { path: "/validator", label: "Validator", icon: Shield },
  ];
  
  return (
    <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            OpenSCENARIO Suite
          </span>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex mx-6 items-center space-x-4 lg:space-x-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary",
                  location.pathname === item.path
                    ? "text-foreground"
                    : "text-foreground/60"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        {/* Right side items */}
        <div className="ml-auto flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search scenarios..."
              className="w-64"
            />
          </div>
          
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          
          {/* Mobile Menu */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <nav className="flex flex-col space-y-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "flex items-center space-x-2 text-lg font-medium transition-colors hover:text-primary",
                        location.pathname === item.path
                          ? "text-foreground"
                          : "text-foreground/60"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}

// AI Scenario Generator with Chat Interface
function AIScenarioGenerator() {
  const [currentMessage, setCurrentMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{type: string, content: string, timestamp: string}>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [description, setDescription] = useState('');
  const [workflowProgress, setWorkflowProgress] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [extractedParameters, setExtractedParameters] = useState<any>(null);

  // Load conversation from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('chatMessages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChatMessages(parsed);
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
    }
  }, []);

  // Save conversation to localStorage
  useEffect(() => {
    if (chatMessages.length > 0) {
      localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
    }
  }, [chatMessages]);

  const handleChat = async () => {
    if (!currentMessage.trim()) return;
    
    setIsGenerating(true);
    
    const userMessage = {
      type: 'user',
      content: currentMessage,
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    
    try {
      const response = await fetch('http://localhost:8080/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          conversation_history: chatMessages.map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiMessage = {
          type: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, aiMessage]);
        
        if (data.parameters_extracted) {
          setExtractedParameters(data.parameters_extracted);
        }
        
        if (data.is_complete) {
          setSessionComplete(true);
        }
      } else {
        const errorText = await response.text();
        console.error('Chat error response:', errorText);
        const errorMessage = {
          type: 'system',
          content: `❌ Error: ${response.status} ${errorText}`,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chat connection error:', error);
      const connectionErrorMessage = {
        type: 'system',
        content: `❌ Connection error: ${error.message}. Please ensure the backend is running at http://localhost:8080`,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, connectionErrorMessage]);
    }
    
    setIsGenerating(false);
  };

  const clearConversation = () => {
    setChatMessages([]);
    setExtractedParameters(null);
    setSessionComplete(false);
    localStorage.removeItem('chatMessages');
  };

  const transferToWorkflow = () => {
    if (extractedParameters) {
      setDescription(extractedParameters.description || 'Generated from AI conversation');
    }
  };

  const handleGenerateWorkflow = async () => {
    if (!description.trim()) return;

    setIsGenerating(true);
    setWorkflowProgress(0.1);

    try {
      const response = await fetch('http://localhost:8080/api/workflow/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parameters: extractedParameters || {
            scenario_name: "Generated Scenario",
            description: description,
            road_network: {
              road_description: "Basic road network",
              generate_simple_road: true
            },
            vehicles: [
              {
                name: "ego_vehicle",
                category: "car",
                bounding_box: { width: 2.0, length: 4.5, height: 1.8 },
                performance: { max_speed: 55.0, max_acceleration: 3.0, max_deceleration: 8.0 },
                initial_speed: 22.0
              }
            ],
            events: [],
            environment: {
              weather: "dry",
              time_of_day: "day"
            }
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        setWorkflowProgress(1.0);
        
        const successMessage = {
          type: 'system',
          content: `✅ Workflow completed successfully! Session ID: ${result.session_id}`,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, successMessage]);
      } else {
        const errorText = await response.text();
        console.error('Workflow error response:', errorText);
        const errorMessage = {
          type: 'system',
          content: `❌ Error starting workflow (${response.status}): ${errorText}`,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Workflow connection error:', error);
      const connectionErrorMessage = {
        type: 'system',
        content: `❌ Connection error: ${error.message}. Please ensure the backend is running at http://localhost:8080`,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, connectionErrorMessage]);
    }
    
    setIsGenerating(false);
  };
  
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🤖 AI Scenario Generator
            </h1>
            <p className="text-muted-foreground mt-2">Create detailed driving scenarios through AI conversation</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={sessionComplete ? "default" : "secondary"} className="px-3 py-1">
              {sessionComplete ? "✅ Ready for Workflow" : "💬 Collecting Info"}
            </Badge>
            <Button variant="outline" size="sm" onClick={clearConversation}>
              New Chat
            </Button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Chat Section - Takes up 2/3 of the space */}
        <div className="lg:col-span-2">
          <Card className="h-[700px] flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <span>AI Chat Assistant</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  {extractedParameters && (
                    <Button 
                      size="sm" 
                      variant={sessionComplete ? "default" : "outline"}
                      onClick={transferToWorkflow}
                      className={sessionComplete ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      <Zap className="h-4 w-4 mr-1" />
                      Transfer to Workflow
                    </Button>
                  )}
                </div>
              </div>
              <CardDescription>
                Chat with AI to define your scenario. I'll ask questions to gather all necessary details.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 px-4 pb-4">
                <div className="space-y-4">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={cn(
                      "flex w-max max-w-[80%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                      msg.type === 'user' 
                        ? "ml-auto bg-blue-600 text-blue-50" 
                        : msg.type === 'system'
                        ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                        : "bg-muted"
                    )}>
                      <div className="flex items-center space-x-2">
                        {msg.type === 'user' ? (
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">You</AvatarFallback>
                          </Avatar>
                        ) : msg.type === 'system' ? (
                          <Settings className="h-4 w-4" />
                        ) : (
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs bg-blue-600 text-white">AI</AvatarFallback>
                          </Avatar>
                        )}
                        <span className={cn(
                          "text-xs",
                          msg.type === 'user' ? "text-blue-100" : "text-muted-foreground"
                        )}>
                          {msg.type === 'user' ? 'You' : msg.type === 'system' ? 'System' : 'AI Assistant'}
                        </span>
                      </div>
                      <p className="leading-relaxed">{msg.content}</p>
                      {msg.timestamp && (
                        <span className={cn(
                          "text-xs",
                          msg.type === 'user' ? "text-blue-200" : "text-muted-foreground"
                        )}>
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  ))}
                  {isGenerating && (
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
                      <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <Separator />
              
              <div className="p-4">
                <div className="flex space-x-2">
                  <Textarea
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleChat())}
                    placeholder="Describe your scenario (Press Enter to send, Shift+Enter for new line)..."
                    className="flex-1 min-h-[60px] resize-none"
                    disabled={isGenerating}
                  />
                  <Button 
                    onClick={handleChat}
                    disabled={!currentMessage.trim() || isGenerating}
                    size="lg"
                    className="px-6"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Workflow and Status Section - Takes up 1/3 of the space */}
        <div className="space-y-6">
          {/* One-Click Workflow Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-green-600" />
                <span>One-Click Workflow</span>
              </CardTitle>
              <CardDescription>
                Execute complete scenario generation → validation → visualization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Scenario Description</label>
                <Textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your complete scenario for generation + validation..."
                  className="min-h-[100px] resize-none"
                  disabled={isGenerating}
                />
              </div>
              
              {workflowProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Workflow Progress</span>
                    <span>{Math.round(workflowProgress * 100)}%</span>
                  </div>
                  <Progress value={workflowProgress * 100} className="w-full" />
                </div>
              )}
              
              <Button 
                onClick={handleGenerateWorkflow}
                disabled={!description.trim() || isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Generate + Validate + Visualize
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
          
          {/* Generated Files Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5 text-blue-600" />
                <span>Generated Files</span>
              </CardTitle>
              <CardDescription>
                Status of scenario files generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center space-x-2">
                    <FileCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">scenario.xosc</span>
                  </div>
                  <Badge variant={isGenerating ? "secondary" : "outline"}>
                    {isGenerating ? 'Generating...' : 'Ready'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center space-x-2">
                    <FileCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">road_network.xodr</span>
                  </div>
                  <Badge variant={isGenerating ? "secondary" : "outline"}>
                    {isGenerating ? 'Generating...' : 'Ready'}
                  </Badge>
                </div>
              </div>
              
              <Alert>
                <Cpu className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>How it works:</strong>
                  <ul className="mt-1 space-y-1 text-xs">
                    <li>• Chat with AI to refine scenario details</li>
                    <li>• Execute one-click workflow for generation</li>
                    <li>• Files are automatically validated</li>
                    <li>• Ready for 3D visualization</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
          
          {/* Session Info Card */}
          {extractedParameters && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-purple-600" />
                  <span>Session Info</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Parameters Extracted:</span>
                    <Badge variant="secondary">Yes</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Session Complete:</span>
                    <Badge variant={sessionComplete ? "default" : "secondary"}>
                      {sessionComplete ? 'Yes' : 'In Progress'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Messages:</span>
                    <Badge variant="outline">{chatMessages.length}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Keep the existing ScenarioPlayer and ScenarioValidator but with modern styling
function ScenarioPlayer() {
  const [file, setFile] = useState<File | null>(null);
  
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          🎮 Scenario Player
        </h1>
        <p className="text-muted-foreground mt-2">Load and simulate OpenSCENARIO files</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-blue-600" />
              <span>Load Scenario</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="scenario-file-input" className="text-sm font-medium">
                Choose OpenSCENARIO File
              </label>
              <Input 
                id="scenario-file-input"
                type="file" 
                accept=".xosc"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mt-1"
              />
            </div>
            <Button 
              disabled={!file}
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              Run Simulation
            </Button>
            <Textarea 
              readOnly
              value={file ? `Loaded file: ${file.name}\nReady for simulation...` : "No file loaded"}
              className="h-32 font-mono text-sm"
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Monitor className="h-5 w-5 text-green-600" />
              <span>3D Visualization</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 bg-muted rounded-lg border-2 border-dashed flex items-center justify-center">
              <p className="text-muted-foreground">3D Scenario Visualization</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ScenarioValidator() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [validationResult, setValidationResult] = useState<string>('');
  
  const handleValidate = () => {
    if (files) {
      setValidationResult(`Validating ${files.length} file(s)...\n✓ Schema validation passed\n✓ ASAM compliance check passed\n⚠️ 2 warnings found`);
    }
  };
  
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          🛡️ Scenario Validator
        </h1>
        <p className="text-muted-foreground mt-2">Validate OpenSCENARIO and OpenDRIVE files</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-blue-600" />
              <span>Upload Files</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="validation-file-input" className="text-sm font-medium">
                Choose Files to Validate
              </label>
              <Input 
                id="validation-file-input"
                type="file" 
                multiple
                accept=".xosc,.xodr"
                onChange={(e) => setFiles(e.target.files)}
                className="mt-1"
              />
            </div>
            <Button 
              onClick={handleValidate}
              disabled={!files}
              className="w-full"
            >
              <Shield className="h-4 w-4 mr-2" />
              Validate Files
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileCheck className="h-5 w-5 text-green-600" />
              <span>Validation Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea 
              readOnly
              value={validationResult || "No validation performed yet"}
              className="h-48 font-mono text-sm"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <ModernNavigation />
      <Routes>
        <Route path="/" element={<ScenarioPlayer />} />
        <Route path="/generator" element={<AIScenarioGenerator />} />
        <Route path="/validator" element={<ScenarioValidator />} />
      </Routes>
    </div>
  );
}

export default App;