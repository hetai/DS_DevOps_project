/**
 * Test page for 3D Visualization debugging
 */

import React, { useState } from 'react';
import { Visualization3D } from '@/components/visualization/Visualization3D';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const sampleScenarioFiles = {
  'test_scenario.xosc': `<?xml version="1.0" encoding="UTF-8"?>
<OpenSCENARIO>
  <FileHeader revMajor="1" revMinor="0" date="2024-01-01" description="Test scenario" author="System"/>
  <Entities>
    <Entity name="Ego">
      <CatalogLocations/>
      <Vehicle name="car" vehicleCategory="car">
        <BoundingBox>
          <Center x="1.5" y="0.0" z="0.9"/>
          <Dimensions width="2.1" length="4.5" height="1.8"/>
        </BoundingBox>
      </Vehicle>
    </Entity>
  </Entities>
  <Storyboard>
    <Init>
      <Actions>
        <Private entityRef="Ego">
          <PrivateAction>
            <TeleportAction>
              <Position>
                <WorldPosition x="0" y="0" z="0" h="0" p="0" r="0"/>
              </Position>
            </TeleportAction>
          </PrivateAction>
        </Private>
      </Actions>
    </Init>
    <Story name="MyStory">
      <Act name="MyAct">
        <ManeuverGroup maximumExecutionCount="1" name="MyManeuverGroup">
          <Actors selectTriggeringEntities="false">
            <EntityRef entityRef="Ego"/>
          </Actors>
        </ManeuverGroup>
        <StartTrigger>
          <ConditionGroup>
            <Condition name="StartCondition" delay="0" conditionEdge="rising">
              <ByValueCondition>
                <SimulationTimeCondition value="0" rule="greaterThan"/>
              </ByValueCondition>
            </Condition>
          </ConditionGroup>
        </StartTrigger>
      </Act>
    </Story>
    <StopTrigger>
      <ConditionGroup>
        <Condition name="StopCondition" delay="0" conditionEdge="rising">
          <ByValueCondition>
            <SimulationTimeCondition value="30" rule="greaterThan"/>
          </ByValueCondition>
        </Condition>
      </ConditionGroup>
    </StopTrigger>
  </Storyboard>
</OpenSCENARIO>`,
  'test_road.xodr': `<?xml version="1.0" encoding="UTF-8"?>
<OpenDRIVE>
  <header revMajor="1" revMinor="4" name="Test Road" version="1.00" date="2024-01-01" north="0.0" south="0.0" east="0.0" west="0.0"/>
  <road name="Road1" length="100.0" id="1" junction="-1">
    <link/>
    <planView>
      <geometry s="0.0" x="0.0" y="0.0" hdg="0.0" length="100.0">
        <line/>
      </geometry>
    </planView>
    <elevationProfile>
      <elevation s="0" a="0" b="0" c="0" d="0"/>
    </elevationProfile>
    <lateralProfile/>
    <lanes>
      <laneSection s="0">
        <center>
          <lane id="0" type="none" level="true">
            <link/>
            <roadMark sOffset="0" type="solid" weight="standard" color="standard" width="0.13"/>
          </lane>
        </center>
        <right>
          <lane id="-1" type="driving" level="true">
            <link/>
            <width sOffset="0" a="3.5" b="0" c="0" d="0"/>
            <roadMark sOffset="0" type="solid" weight="standard" color="standard" width="0.13"/>
          </lane>
        </right>
      </laneSection>
    </lanes>
  </road>
</OpenDRIVE>`
};

export default function Visualization3DTest() {
  const [showVisualization, setShowVisualization] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (message: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleError = (error: string) => {
    addDebugInfo(`❌ Error: ${error}`);
  };

  const startVisualization = () => {
    addDebugInfo('🚀 Starting 3D visualization test...');
    setShowVisualization(true);
  };

  const resetVisualization = () => {
    addDebugInfo('🔄 Resetting visualization...');
    setShowVisualization(false);
    setDebugInfo([]);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          🧪 3D Visualization Test
        </h1>
        <p className="text-muted-foreground mt-2">Debug and test the 3D visualization component</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Button onClick={startVisualization} disabled={showVisualization}>
                Start 3D Test
              </Button>
              <Button onClick={resetVisualization} variant="outline">
                Reset
              </Button>
            </div>
            
            <div className="text-sm">
              <p><strong>Test Files:</strong></p>
              <ul className="list-disc list-inside text-muted-foreground">
                <li>test_scenario.xosc ({Math.round(sampleScenarioFiles['test_scenario.xosc'].length / 1024)}KB)</li>
                <li>test_road.xodr ({Math.round(sampleScenarioFiles['test_road.xodr'].length / 1024)}KB)</li>
              </ul>
            </div>

            {/* Debug Log */}
            <div>
              <h4 className="font-semibold mb-2">Debug Log:</h4>
              <div className="bg-gray-100 p-3 rounded text-xs font-mono max-h-40 overflow-y-auto">
                {debugInfo.length === 0 ? (
                  <p className="text-muted-foreground">No debug info yet...</p>
                ) : (
                  debugInfo.map((info, index) => (
                    <div key={index} className="mb-1">{info}</div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3D Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>3D Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96 border rounded-lg overflow-hidden">
              {showVisualization ? (
                <Visualization3D
                  scenarioFiles={sampleScenarioFiles}
                  validationResults={{}}
                  className="w-full h-full"
                  onError={handleError}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-50">
                  <div className="text-center text-muted-foreground">
                    <p>Click "Start 3D Test" to begin</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Test Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <p>1. Click "Start 3D Test" to initialize the 3D visualization with sample data</p>
            <p>2. Check the debug log for any errors or warnings</p>
            <p>3. If the visualization loads successfully, you should see:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>A 3D scene with camera controls</li>
              <li>A road network (if parsing succeeds)</li>
              <li>Vehicle entities (if parsing succeeds)</li>
              <li>Control panels for playback and view options</li>
            </ul>
            <p>4. Open browser developer tools (F12) to see detailed console logs</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}