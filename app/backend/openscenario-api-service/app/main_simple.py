from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Dict, Any
import json

app = FastAPI(
    title="OpenSCENARIO API (Simplified)",
    description="Simplified API for testing frontend integration",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get('/')
async def read_root():
    return {
        'message': 'OpenSCENARIO API (Simplified) is running',
        'version': '1.0.0',
        'endpoints': {
            'chat': '/api/chat',
            'generate': '/api/generate',
            'validate': '/api/validate',
            'health': '/health'
        }
    }

@app.get('/health')
async def health_check():
    return {'status': 'healthy'}

@app.post('/api/chat')
async def chat_with_ai(request: Dict[str, Any]):
    """Mock chat endpoint for testing frontend"""
    try:
        user_message = request.get('message', '')
        
        # Mock AI response based on message content
        if 'highway' in user_message.lower():
            response_message = "Great! I can help you create a highway scenario. Can you tell me more about the vehicles involved? For example, how many cars, their speeds, and what specific actions should occur?"
            
            # Mock extracted parameters
            mock_parameters = {
                "scenario_name": "Highway Scenario",
                "description": user_message,
                "road_network": {
                    "road_description": "Highway with multiple lanes",
                    "generate_simple_road": True
                },
                "vehicles": [
                    {
                        "name": "ego",
                        "category": "car",
                        "bounding_box": {"width": 2.0, "length": 4.5, "height": 1.8},
                        "performance": {
                            "max_speed": 50.0,
                            "max_acceleration": 5.0,
                            "max_deceleration": 8.0
                        },
                        "initial_speed": 25.0
                    }
                ],
                "events": [],
                "environment": {
                    "weather": "dry",
                    "time_of_day": "day",
                    "precipitation": 0.0,
                    "visibility": 1000.0,
                    "wind_speed": 0.0
                },
                "openscenario_version": "1.2",
                "ncap_compliance": True,
                "parameter_variations": {}
            }
            
            is_complete = len(request.get('conversation_history', [])) > 2
            
        else:
            response_message = "I understand you want to create a driving scenario. Could you describe the type of road (highway, city street, etc.) and the vehicles involved?"
            mock_parameters = None
            is_complete = False
        
        return {
            "message": response_message,
            "parameters_extracted": mock_parameters,
            "is_complete": is_complete,
            "suggestions": [
                "Add weather conditions",
                "Specify vehicle speeds",
                "Include overtaking maneuver"
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/api/generate')
async def generate_scenario(request: Dict[str, Any]):
    """Mock generation endpoint"""
    try:
        parameters = request.get('parameters', {})
        scenario_name = parameters.get('scenario_name', 'Test_Scenario')
        
        # Mock OpenSCENARIO file content
        xosc_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<OpenSCENARIO>
  <FileHeader revMajor="1" revMinor="2" date="2025-01-25" description="{parameters.get('description', 'Generated scenario')}"/>
  <ParameterDeclarations/>
  <CatalogLocations/>
  <RoadNetwork>
    <LogicFile filepath="{scenario_name}.xodr"/>
  </RoadNetwork>
  <Entities>
    <ScenarioObject name="ego">
      <Vehicle name="car" vehicleCategory="car">
        <Performance maxSpeed="50" maxDeceleration="8" maxAcceleration="5"/>
        <BoundingBox>
          <Center x="0" y="0" z="0"/>
          <Dimensions width="2.0" length="4.5" height="1.8"/>
        </BoundingBox>
        <Axles>
          <FrontAxle maxSteering="0.5" wheelDiameter="0.8" trackWidth="1.68" positionX="2.98" positionZ="0.4"/>
          <RearAxle maxSteering="0.0" wheelDiameter="0.8" trackWidth="1.68" positionX="0" positionZ="0.4"/>
        </Axles>
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
                <LanePosition roadId="0" laneId="-1" offset="0" s="10"/>
              </Position>
            </TeleportAction>
          </PrivateAction>
          <PrivateAction>
            <LongitudinalAction>
              <SpeedAction>
                <SpeedActionDynamics dynamicsShape="step" value="0" dynamicsDimension="time"/>
                <SpeedActionTarget>
                  <AbsoluteTargetSpeed value="25"/>
                </SpeedActionTarget>
              </SpeedAction>
            </LongitudinalAction>
          </PrivateAction>
        </Private>
      </Actions>
    </Init>
    <Story name="MainStory">
      <Act name="MainAct">
        <ManeuverGroup name="EgoManeuver" maximumExecutionCount="1">
          <Actors selectTriggeringEntities="false">
            <EntityRef entityRef="ego"/>
          </Actors>
        </ManeuverGroup>
        <StartTrigger>
          <ConditionGroup>
            <Condition name="ActStart" delay="0" conditionEdge="rising">
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
</OpenSCENARIO>'''

        # Mock OpenDRIVE file content
        xodr_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<OpenDRIVE>
  <header revMajor="1" revMinor="4" name="{scenario_name}" version="1.00" date="2025-01-25T12:00:00"/>
  <road name="Highway" length="1000.0" id="0" junction="-1">
    <link/>
    <planView>
      <geometry s="0.0" x="0.0" y="0.0" hdg="0.0" length="1000.0">
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
            <roadMark sOffset="0" type="broken" weight="standard" color="standard" width="0.13"/>
          </lane>
          <lane id="-2" type="driving" level="true">
            <link/>
            <width sOffset="0" a="3.5" b="0" c="0" d="0"/>
            <roadMark sOffset="0" type="solid" weight="standard" color="standard" width="0.13"/>
          </lane>
        </right>
      </laneSection>
    </lanes>
  </road>
</OpenDRIVE>'''

        return {
            "success": True,
            "scenario_files": {
                f"{scenario_name}.xosc": xosc_content,
                f"{scenario_name}.xodr": xodr_content
            },
            "validation_results": None,
            "variations": []
        }
        
    except Exception as e:
        return {
            "success": False,
            "scenario_files": {},
            "error_message": str(e)
        }

@app.get('/api/status')
async def get_api_status():
    """Get API status"""
    return {
        "api_status": "running",
        "mode": "simplified",
        "rag_initialized": False,
        "services": {
            "mock_ai_service": "available",
            "mock_scenario_generator": "available"
        }
    }