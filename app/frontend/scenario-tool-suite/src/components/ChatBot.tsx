import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { 
  Send, 
  Bot, 
  User, 
  FileDown, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Lightbulb
} from 'lucide-react';

import { 
  ChatMessage, 
  ChatResponse, 
  ScenarioParameters,
  chatWithAI, 
  generateScenario 
} from '@/services/chatApi';

interface ChatBotProps {
  onScenarioGenerated?: (files: Record<string, string>) => void;
}

const ChatBot: React.FC<ChatBotProps> = ({ onScenarioGenerated }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant for creating ASAM OpenSCENARIO files. Describe the driving scenario you want to create, and I\'ll help you build it step by step.',
      timestamp: new Date().toISOString()
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [extractedParameters, setExtractedParameters] = useState<ScenarioParameters | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response: ChatResponse = await chatWithAI(
        inputMessage,
        messages,
        sessionId
      );

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (response.parameters_extracted) {
        setExtractedParameters(response.parameters_extracted);
      }
      
      setIsComplete(response.is_complete);
      setSuggestions(response.suggestions || []);

    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    inputRef.current?.focus();
  };

  const handleGenerateScenario = async () => {
    if (!extractedParameters || !isComplete) {
      toast({
        title: 'Scenario Incomplete',
        description: 'Please provide more details about your scenario first.',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await generateScenario(extractedParameters);
      
      if (response.success) {
        toast({
          title: 'Scenario Generated',
          description: 'Your OpenSCENARIO files have been generated successfully!'
        });
        
        onScenarioGenerated?.(response.scenario_files);
        
        // Add success message to chat
        const successMessage: ChatMessage = {
          role: 'assistant',
          content: `Great! I've successfully generated your scenario files:\n\n${Object.keys(response.scenario_files).map(filename => `• ${filename}`).join('\n')}\n\nYou can download them or create variations if needed.`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, successMessage]);
        
      } else {
        throw new Error(response.error_message || 'Generation failed');
      }
      
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate scenario',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
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
                    <div className="whitespace-pre-wrap text-sm">
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
            <div ref={messagesEndRef} />
          </ScrollArea>
          
          <Separator />
          
          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="p-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
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
                ref={inputRef}
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
                <span className="sr-only">Send message</span>
              </Button>
            </div>
            
            {/* Generate Button */}
            {isComplete && extractedParameters && (
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={handleGenerateScenario}
                  disabled={isGenerating}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Files...
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4 mr-2" />
                      Generate Scenario Files
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setInputMessage("Can you add more complexity to this scenario?");
                    inputRef.current?.focus();
                  }}
                >
                  Add More Details
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Parameter Preview */}
      {extractedParameters && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Extracted Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xs space-y-1">
              <div><strong>Scenario:</strong> {extractedParameters.scenario_name}</div>
              <div><strong>Vehicles:</strong> {extractedParameters.vehicles.length}</div>
              <div><strong>Events:</strong> {extractedParameters.events.length}</div>
              <div><strong>Road:</strong> {extractedParameters.road_network.road_description}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ChatBot;