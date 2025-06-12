
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { FileDown } from "lucide-react";

const ScenarioGenerator = () => {
  const [prompt, setPrompt] = useState<string>("");
  const [generating, setGenerating] = useState<boolean>(false);
  const [generatedContent, setGeneratedContent] = useState<string>("");
  
  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a description to generate a scenario.",
        variant: "destructive"
      });
      return;
    }
    
    setGenerating(true);
    
    // This is a mockup of the generation process
    // In a real implementation, this would call an API
    setTimeout(() => {
      const mockScenario = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSCENARIO>
  <FileHeader revMajor="1" revMinor="0" date="2023-05-19" description="${prompt}"/>
  <ParameterDeclarations/>
  <CatalogLocations/>
  <RoadNetwork>
    <LogicFile filepath="sample.xodr"/>
  </RoadNetwork>
  <Entities>
    <ScenarioObject name="ego">
      <Vehicle name="car" vehicleCategory="car">
        <ParameterDeclarations/>
        <Performance maxSpeed="70" maxDeceleration="10" maxAcceleration="10"/>
        <BoundingBox>
          <Center x="0" y="0" z="0"/>
          <Dimensions width="2" length="5" height="1.8"/>
        </BoundingBox>
        <Axles/>
        <Properties/>
      </Vehicle>
    </ScenarioObject>
  </Entities>
  <Storyboard>
    <Init>
      <Actions>
        <Private entityRef="ego">
          <PrivateAction>
            <TeleportAction>
              <Position>
                <LanePosition roadId="0" laneId="-1" offset="0" s="5"/>
              </Position>
            </TeleportAction>
          </PrivateAction>
        </Private>
      </Actions>
    </Init>
    <Story name="MyStory">
      <Act name="MyAct">
        <ManeuverGroup name="MyManeuverGroup" maximumExecutionCount="1">
          <Actors selectTriggeringEntities="false">
            <EntityRef entityRef="ego"/>
          </Actors>
          <Maneuver name="MyManeuver">
            <Event name="MyEvent" priority="overwrite">
              <Action name="MyAction">
                <PrivateAction>
                  <LongitudinalAction>
                    <SpeedAction>
                      <SpeedActionDynamics dynamicsShape="step" value="0" dynamicsDimension="time"/>
                      <SpeedActionTarget>
                        <AbsoluteTargetSpeed value="15"/>
                      </SpeedActionTarget>
                    </SpeedAction>
                  </LongitudinalAction>
                </PrivateAction>
              </Action>
              <StartTrigger>
                <ConditionGroup>
                  <Condition name="MyStartCondition" delay="0" conditionEdge="rising">
                    <ByValueCondition>
                      <SimulationTimeCondition value="0" rule="greaterThan"/>
                    </ByValueCondition>
                  </Condition>
                </ConditionGroup>
              </StartTrigger>
            </Event>
          </Maneuver>
        </ManeuverGroup>
        <StartTrigger>
          <ConditionGroup>
            <Condition name="MyActStartCondition" delay="0" conditionEdge="rising">
              <ByValueCondition>
                <SimulationTimeCondition value="0" rule="greaterThan"/>
              </ByValueCondition>
            </Condition>
          </ConditionGroup>
        </StartTrigger>
      </Act>
    </Story>
    <StopTrigger/>
  </Storyboard>
</OpenSCENARIO>`;
      
      setGeneratedContent(mockScenario);
      setGenerating(false);
      toast({
        title: "Scenario generated",
        description: "Your scenario has been generated successfully."
      });
    }, 2000);
  };
  
  const handleDownload = () => {
    if (!generatedContent) return;
    
    const blob = new Blob([generatedContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-scenario.xosc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download started",
      description: "Your scenario file is being downloaded."
    });
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Scenario Generator</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Describe Your Scenario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Enter a natural language description of the traffic scenario you want to create.
                Be as specific as possible about the road layout, vehicles, and behaviors.
              </p>
              <Textarea 
                placeholder="Example: A two-lane highway with an ego vehicle driving at 60 km/h and a slow-moving truck ahead that the ego vehicle needs to overtake."
                className="min-h-[200px]"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            
            <Button 
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()} 
              className="w-full"
            >
              {generating ? "Generating..." : "Generate Scenario"}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Generated OpenSCENARIO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-md p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap">
                {generatedContent || "Generated OpenSCENARIO will appear here..."}
              </pre>
            </div>
            
            <Button 
              variant="outline"
              onClick={handleDownload}
              disabled={!generatedContent}
              className="w-full"
            >
              <FileDown className="mr-2" size={16} />
              Download Scenario (.xosc)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScenarioGenerator;
