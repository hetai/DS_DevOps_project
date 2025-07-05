import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Bot, User, Loader2, CheckCircle, Zap, AlertCircle } from 'lucide-react';
import { useWorkflow } from './WorkflowManager';

// Simple interfaces to avoid import issues
interface SimpleChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface SimpleChatResponse {
  message: string;
  parameters_extracted?: any;
  is_complete: boolean;
  suggestions: string[];
}

interface SimpleChatBotProps {
  onScenarioGenerated?: (files: Record<string, string>) => void;
}

const SimpleChatBot: React.FC<SimpleChatBotProps> = ({ onScenarioGenerated: _onScenarioGenerated }) => {
  const { startGenerateAndValidate, startCompleteWorkflow, state: workflowState } = useWorkflow();
  
  const [messages, setMessages] = useState<SimpleChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant for creating ASAM OpenSCENARIO files. Describe the driving scenario you want to create, and I\'ll help you build it step by step. I can now automatically validate your generated files!',
      timestamp: new Date().toISOString()
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedParameters, setExtractedParameters] = useState<any>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));

  const API_BASE_URL = 'http://192.168.0.193:8080';

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: SimpleChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          conversation_history: messages,
          session_id: sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SimpleChatResponse = await response.json();

      const assistantMessage: SimpleChatMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (data.parameters_extracted) {
        setExtractedParameters(data.parameters_extracted);
      }
      
      setIsComplete(data.is_complete);
      setSuggestions(data.suggestions || []);

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: SimpleChatMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
  };

  const handleGenerateScenario = async () => {
    // If no extracted parameters, create basic ones from conversation
    let scenarioParams = extractedParameters;
    
    if (!scenarioParams) {
      const _conversationText = messages.map(m => m.content).join(' ');
      
      // Extract basic info from conversation for mock generation
      scenarioParams = {
        scenario_name: "Highway_Overtaking_Scenario",
        description: "Highway overtaking scenario based on conversation",
        road_network: {
          road_description: "Two-lane highway",
          generate_simple_road: true
        },
        vehicles: [
          {
            name: "ego",
            category: "car",
            bounding_box: { width: 2.0, length: 5.0, height: 1.8 },
            performance: {
              max_speed: 50.0,
              max_acceleration: 5.0,
              max_deceleration: 8.0
            },
            initial_speed: 27.8 // 100 km/h in m/s
          },
          {
            name: "truck",
            category: "truck", 
            bounding_box: { width: 2.5, length: 10.0, height: 3.0 },
            performance: {
              max_speed: 40.0,
              max_acceleration: 3.0,
              max_deceleration: 6.0
            },
            initial_speed: 22.2 // 80 km/h in m/s
          }
        ],
        events: [],
        environment: {
          weather: "dry",
          time_of_day: "day",
          precipitation: 0.0,
          visibility: 1000.0,
          wind_speed: 0.0
        },
        openscenario_version: "1.2",
        ncap_compliance: true,
        parameter_variations: {}
      };
    }

    try {
      // Use integrated workflow for generation and validation
      await startGenerateAndValidate(scenarioParams);
      
      // Add workflow start message to chat
      const workflowMessage: SimpleChatMessage = {
        role: 'assistant',
        content: `Perfect! I'm now generating and validating your scenario using our integrated workflow. You can track the progress below and see real-time updates as I:\n\n1. 🔧 Generate the scenario files\n2. ✅ Validate the files automatically\n3. 📁 Prepare them for download\n\nNo more manual steps - everything happens seamlessly!`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, workflowMessage]);
      
    } catch (error) {
      console.error('Error starting workflow:', error);
      
      const errorMessage: SimpleChatMessage = {
        role: 'assistant',
        content: `I encountered an error starting the workflow: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleGenerateWithVisualization = async () => {
    // If no extracted parameters, create basic ones from conversation
    let scenarioParams = extractedParameters;
    
    if (!scenarioParams) {
      const _conversationText = messages.map(m => m.content).join(' ');
      
      // Extract basic info from conversation
      scenarioParams = {
        scenario_name: "Highway_Overtaking_Scenario",
        description: "Highway overtaking scenario based on conversation",
        road_network: {
          road_description: "Two-lane highway",
          generate_simple_road: true
        },
        vehicles: [
          {
            name: "ego",
            category: "car",
            bounding_box: { width: 2.0, length: 5.0, height: 1.8 },
            performance: {
              max_speed: 50.0,
              max_acceleration: 5.0,
              max_deceleration: 8.0
            },
            initial_speed: 27.8
          },
          {
            name: "truck",
            category: "truck", 
            bounding_box: { width: 2.5, length: 10.0, height: 3.0 },
            performance: {
              max_speed: 40.0,
              max_acceleration: 3.0,
              max_deceleration: 6.0
            },
            initial_speed: 22.2
          }
        ],
        events: [],
        environment: {
          weather: "dry",
          time_of_day: "day",
          precipitation: 0.0,
          visibility: 1000.0,
          wind_speed: 0.0
        },
        openscenario_version: "1.2",
        ncap_compliance: true,
        parameter_variations: {}
      };
    }

    try {
      // Use complete workflow including visualization preparation
      await startCompleteWorkflow(scenarioParams);
      
      // Add workflow start message to chat
      const workflowMessage: SimpleChatMessage = {
        role: 'assistant',
        content: `Excellent! I'm running the complete workflow including 3D visualization preparation. This includes:\n\n1. 🔧 Generate scenario files\n2. ✅ Validate all files\n3. 🎯 Prepare 3D visualization data\n4. 📁 Package everything for you\n\nThis may take a bit longer, but you'll get everything ready for 3D viewing!`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, workflowMessage]);
      
    } catch (error) {
      console.error('Error starting complete workflow:', error);
      
      const errorMessage: SimpleChatMessage = {
        role: 'assistant',
        content: `I encountered an error starting the complete workflow: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Chat Header */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-500" />
            AI Scenario Assistant
            {isComplete && (
              <Badge variant="secondary" className="ml-auto">
                <CheckCircle className="w-3 h-3 mr-1" />
                Ready to Generate
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Chat Messages */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="p-0 flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm break-words overflow-wrap-anywhere">
                      {message.content}
                    </div>
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="p-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">Suggestions:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-xs"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe your scenario (e.g., 'A car overtaking a truck on a highway')"
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim()}
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            {/* Generate Buttons */}
            {(isComplete && extractedParameters) || messages.length >= 8 ? (
              <div className="mt-3 space-y-2">
                {/* Quick Generate & Validate */}
                <Button
                  onClick={handleGenerateScenario}
                  disabled={workflowState.isLoading}
                  className="w-full"
                  variant="default"
                >
                  {workflowState.isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing Workflow...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Generate & Validate
                    </>
                  )}
                </Button>
                
                {/* Complete Workflow with Visualization */}
                <Button
                  onClick={handleGenerateWithVisualization}
                  disabled={workflowState.isLoading}
                  className="w-full"
                  variant="secondary"
                >
                  {workflowState.isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing Complete Workflow...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete Workflow + 3D Prep
                    </>
                  )}
                </Button>
                
                {!isComplete && (
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Generating with current conversation details
                  </p>
                )}
                
                {/* Workflow Status Alert */}
                {workflowState.sessionId && (
                  <Alert className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Workflow active: {workflowState.status}
                      {workflowState.errorMessage && (
                        <span className="text-red-600 block mt-1">
                          Error: {workflowState.errorMessage}
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
      
      {/* Parameter Preview */}
      {extractedParameters && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Extracted Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xs space-y-1">
              <div><strong>Scenario:</strong> {extractedParameters.scenario_name || 'N/A'}</div>
              <div><strong>Vehicles:</strong> {extractedParameters.vehicles?.length || 0}</div>
              <div><strong>Events:</strong> {extractedParameters.events?.length || 0}</div>
              <div><strong>Road:</strong> {extractedParameters.road_network?.road_description || 'N/A'}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SimpleChatBot;